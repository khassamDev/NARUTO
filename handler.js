// handler.js
import { smsg } from './lib/simple.js'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { writeFileSync, appendFileSync } from 'fs'
import chalk from 'chalk'

const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

// === Logs de errores ===
function logError(e) {
    const date = new Date().toISOString()
    const msg = `[${date}] ${e.stack || e}\n`
    appendFileSync('./error.log', msg)
    console.error(chalk.red(msg))
}

// === Backup automático de DB ===
function backupDB() {
    try {
        if (global.db && global.db.data) {
            const data = JSON.stringify(global.db.data, null, 2)
            writeFileSync('./backup_db.json', data)
            console.log(chalk.green('[BACKUP] Base de datos respaldada correctamente.'))
        }
    } catch(e){ logError(e) }
}

// === Handler principal ===
export async function handler(chatUpdate, opts = {}) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return

    try { await this.pushMessage(chatUpdate.messages) } catch(e){ logError(e) }

    let m = chatUpdate.messages[chatUpdate.messages.length-1]
    if (!m) return
    if (global.db.data == null) await global.loadDatabase()

    try { m = smsg(this, m) || m } catch(e){ logError(e); return }

    // === Inicialización de usuario ===
    let user = global.db.data.users[m.sender] || {}
    if (typeof user !== 'object') global.db.data.users[m.sender] = {}
    Object.assign(user, {
        exp: user.exp || 0,
        coin: user.coin || 10,
        premium: user.premium || false,
        registered: user.registered || false,
        name: user.name || m.name,
        role: user.role || 'User',
        banned: user.banned || false,
        ...user
    })
    global.db.data.users[m.sender] = user

    // === Inicialización de chat ===
    let chat = global.db.data.chats[m.chat] || {}
    Object.assign(chat, {
        antiPorn: chat.antiPorn || false,
        welcome: chat.welcome ?? true,
        antiLink: chat.antiLink ?? true,
        ...chat
    })
    global.db.data.chats[m.chat] = chat

    // === Inicialización settings ===
    let settings = global.db.data.settings[this.user.jid] || {}
    Object.assign(settings, {
        self: settings.self || false,
        restrict: settings.restrict || true,
        autoread: settings.autoread ?? true,
        ...settings
    })
    global.db.data.settings[this.user.jid] = settings

    // === Permisos ===
    const detectwhat = m.sender.includes('@lid') ? '@lid' : '@s.whatsapp.net'
    const isROwner = [...global.owner.map(([number]) => number)]
        .map(v=>v.replace(/[^0-9]/g,'')+detectwhat).includes(m.sender)
    const isOwner = isROwner || m.fromMe
    const isMods = isROwner || global.mods.map(v=>v.replace(/[^0-9]/g,'')+detectwhat).includes(m.sender)
    const isPrems = isROwner || global.prems.map(v=>v.replace(/[^0-9]/g,'')+detectwhat).includes(m.sender) || user.premium

    if (m.isBaileys) return
    if (opts['nyimak']) return
    if (!isROwner && opts['self']) return
    if (opts['swonly'] && m.chat !== 'status@broadcast') return
    if (typeof m.text !== 'string') m.text = ''

    // === Antiporno ===
    if (m.isGroup && chat.antiPorn) {
        const isMedia = ['imageMessage','videoMessage','stickerMessage'].includes(m.mtype)
        if (isMedia) {
            try {
                await this.sendMessage(m.chat,{text:`❌ Contenido inapropiado eliminado.`},{quoted:m})
                if (m.key?.id) await this.sendMessage(m.chat,{delete:{remoteJid:m.chat,fromMe:false,id:m.key.id,participant:m.sender}})
            } catch(e){ logError(e) }
            return
        }
    }

    // === Plugins y comandos ===
    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)),'./plugins')
    let usedPrefix = ''
    let command = ''
    let args = []

    for (let name in global.plugins) {
        let plugin = global.plugins[name]
        if (!plugin || plugin.disabled) continue

        // Ejecuta plugin.all si existe
        if (typeof plugin.all==='function') {
            try{ await plugin.all.call(this,m,{chatUpdate,__dirname:___dirname,__filename:join(___dirname,name)}) }
            catch(e){ logError(e) }
        }

        // Detecta prefijo y extrae comando
        const prefixes = Array.isArray(plugin.customPrefix) ? plugin.customPrefix : [plugin.customPrefix || global.prefix || '!']
        let matched = false
        for (let _prefix of prefixes) {
            if (typeof _prefix === 'string' && m.text.startsWith(_prefix)) {
                usedPrefix = _prefix
                matched = true
                break
            } else if (_prefix instanceof RegExp) {
                const match = m.text.match(_prefix)
                if (match) {
                    usedPrefix = match[0]
                    matched = true
                    break
                }
            }
        }
        if (!matched) continue

        const noPrefix = m.text.slice(usedPrefix.length).trim()
        [command, ...args] = noPrefix.split(/\s+/)
        command = (command||'').toLowerCase()

        // === Ejecutar plugin seguro ===
        try{
            if(typeof plugin.call==='function') await plugin.call.call(this,m,{match:matched,usedPrefix,noPrefix,args,command,conn:this})
            else if(typeof plugin.default==='function') await plugin.default.call(this,m,{match:matched,usedPrefix,noPrefix,args,command,conn:this})
            else console.log(chalk.yellow(`Plugin sin función call: ${name}`))
        } catch(e){ logError(e) }
    }

    // === Comandos Owner especiales ===
    if(isOwner){
        switch(command){
            case 'restart':
                console.log(chalk.green('[OWNER] Reiniciando bot...'))
                backupDB()
                process.exit(1)
            case 'backupdb':
                backupDB()
                await this.sendMessage(m.chat,{text:'✅ Backup de base de datos realizado correctamente.'},{quoted:m})
                break
            case 'shutdown':
                console.log(chalk.red('[OWNER] Apagando bot...'))
                backupDB()
                process.exit(0)
                break
        }
    }

    // === Queue y autoread ===
    if(opts['queque'] && m.text){
        const quequeIndex = this.msgqueque.indexOf(m.id||m.key.id)
        if(quequeIndex!==-1) this.msgqueque.splice(quequeIndex,1)
    }
    if(opts['autoread']){
        try{ await this.readMessages([m.key]) } catch(e){ logError(e) }
    }
}

// === Auto-backup cada 10 minutos ===
setInterval(()=>backupDB(),10*60*1000)
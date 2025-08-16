// handler-final.js
import { smsg } from './lib/simple.js'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { writeFileSync, appendFileSync, readdirSync } from 'fs'
import chalk from 'chalk'

const { proto } = (await import('@whiskeysockets/baileys')).default

// === Funciones de utilidad ===
function logError(e) {
    const date = new Date().toISOString()
    const msg = `[${date}] ${e.stack || e}\n`
    appendFileSync('./error.log', msg)
    console.error(chalk.red(msg))
}

function backupDB() {
    try {
        if (global.db && global.db.data) {
            writeFileSync('./backup_db.json', JSON.stringify(global.db.data, null, 2))
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
    if (!global.db.data) await global.loadDatabase()

    try { m = smsg(this, m) || m } catch(e){ logError(e); return }

    // === Inicialización usuario/chat/settings ===
    let user = global.db.data.users[m.sender] || {}
    if (typeof user !== 'object') global.db.data.users[m.sender] = {}
    Object.assign(user, { exp:0, coin:10, premium:false, registered:false, name:m.name, role:'User', banned:false, ...user })
    global.db.data.users[m.sender] = user

    let chat = global.db.data.chats[m.chat] || {}
    Object.assign(chat, { antiPorn:false, welcome:true, antiLink:true, ...chat })
    global.db.data.chats[m.chat] = chat

    let settings = global.db.data.settings[this.user.jid] || {}
    Object.assign(settings, { self:false, restrict:true, autoread:true, ...settings })
    global.db.data.settings[this.user.jid] = settings

    // === Permisos ===
    const detectwhat = m.sender.includes('@lid') ? '@lid' : '@s.whatsapp.net'
    const isROwner = [...global.owner.map(([n])=>n)].map(v=>v.replace(/\D/g,'')+detectwhat).includes(m.sender)
    const isOwner = isROwner || m.fromMe
    const isPrems = isROwner || global.prems.map(v=>v.replace(/\D/g,'')+detectwhat).includes(m.sender) || user.premium

    if (m.isBaileys) return
    if (opts.nyimak) return
    if (!isROwner && opts.self) return
    if (opts.swonly && m.chat !== 'status@broadcast') return
    if (typeof m.text !== 'string') m.text = ''

    // === Antiporno ===
    if (m.isGroup && chat.antiPorn) {
        const isMedia = ['imageMessage','videoMessage','stickerMessage'].includes(m.mtype)
        if (isMedia) {
            try {
                await this.sendMessage(m.chat, { text:'❌ Contenido inapropiado eliminado.' }, { quoted:m })
                if (m.key?.id) await this.sendMessage(m.chat, { delete:{ remoteJid:m.chat, fromMe:false, id:m.key.id, participant:m.sender } })
            } catch(e){ logError(e) }
            return
        }
    }

    // === Plugins seguros ===
    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
    let usedPrefix = ''
    let command = ''
    let args = []

    for (let name in global.plugins) {
        let plugin = global.plugins[name]
        if (!plugin || plugin.disabled) continue

        // === Ejecutar all seguro ===
        if (plugin.all && typeof plugin.all === 'function') {
            try { await plugin.all.call(this, m, { conn:this }) } catch(e){ logError(e) }
        }

        // === Ejecutar call seguro ===
        if (plugin.call && typeof plugin.call === 'function' && m.text) {
            usedPrefix = plugin.customPrefix || global.prefix || '!'
            const noPrefix = m.text.startsWith(usedPrefix) ? m.text.slice(usedPrefix.length).trim() : ''
            if (!noPrefix) continue
            [command, ...args] = noPrefix.split(/\s+/)
            command = (command||'').toLowerCase()

            try { await plugin.call.call(this, m, { command, args, conn:this }) }
            catch(e){ logError(e) }
        }
    }

    // === Comandos Owner especiales ===
    if (isOwner){
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
    if(opts.queque && m.text){
        const index = this.msgqueque.indexOf(m.id || m.key.id)
        if (index!==-1) this.msgqueque.splice(index,1)
    }
    if(opts.autoread){
        try{ await this.readMessages([m.key]) } catch(e){ logError(e) }
    }
}

// === Auto-backup cada 10 minutos ===
setInterval(()=>backupDB(), 10*60*1000)
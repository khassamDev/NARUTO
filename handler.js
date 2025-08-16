// handler.js
import { smsg } from './lib/simple.js'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { writeFileSync, appendFileSync } from 'fs'
import chalk from 'chalk'

const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

// Función de log de errores en archivo
function logError(e) {
    const date = new Date().toISOString()
    const msg = `[${date}] ${e.stack || e}\n`
    appendFileSync('./error.log', msg)
    console.error(chalk.red(msg))
}

// Función principal del handler
export async function handler(chatUpdate, opts = {}) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return

    try {
        await this.pushMessage(chatUpdate.messages)
    } catch (e) {
        logError(e)
    }

    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
    if (global.db.data == null) await global.loadDatabase()

    try {
        m = smsg(this, m) || m
        if (!m) return

        // === Inicialización usuario ===
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

        // === Inicialización chat ===
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
            autoread: settings.autoread || true,
            ...settings
        })
        global.db.data.settings[this.user.jid] = settings

    } catch (e) {
        logError(e)
    }

    // === Permisos ===
    const detectwhat = m.sender.includes('@lid') ? '@lid' : '@s.whatsapp.net'
    const isROwner = [...global.owner.map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender)
    const isOwner = isROwner || m.fromMe
    const isMods = isROwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender)
    const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender) || (global.db.data.users[m.sender]?.premium ?? false)

    if (m.isBaileys) return
    if (opts['nyimak']) return
    if (!isROwner && opts['self']) return
    if (opts['swonly'] && m.chat !== 'status@broadcast') return
    if (typeof m.text !== 'string') m.text = ''

    // === Antiporno ===
    if (m.isGroup && global.db.data.chats[m.chat]?.antiPorn) {
        const isMedia = ['imageMessage', 'videoMessage', 'stickerMessage'].includes(m.mtype)
        if (isMedia) {
            try {
                await this.sendMessage(m.chat, { text: `❌ Contenido inapropiado detectado. Se eliminó tu mensaje.` }, { quoted: m })
                if (m.key?.id) await this.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender } })
            } catch (e) {
                logError(e)
            }
            return
        }
    }

    // === Plugins y comandos ===
    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
    let usedPrefix = ''

    for (let name in global.plugins) {
        let plugin = global.plugins[name]
        if (!plugin || plugin.disabled) continue

        const __filename = join(___dirname, name)

        // Ejecuta plugin.all si existe
        if (typeof plugin.all === 'function') {
            try { await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename }) } 
            catch (e) { logError(e) }
        }

        // Detecta prefijo
        const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
        let _prefix = plugin.customPrefix || global.prefix || '!'
        let match = (_prefix instanceof RegExp ?
            [[_prefix.exec(m.text), _prefix]] :
            Array.isArray(_prefix) ?
                _prefix.map(p => {
                    let re = p instanceof RegExp ? p : new RegExp(str2Regex(p))
                    return [re.exec(m.text), re]
                }) :
            typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
            [[[], new RegExp]]
        ).find(p => p[1])

        if (!match) continue

        usedPrefix = (match[0] || '')[0]
        let noPrefix = m.text.replace(usedPrefix, '')
        let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
        command = (command || '').toLowerCase()

        // === Ejecutar plugin seguro ===
        try {
            if (typeof plugin.call === 'function') {
                await plugin.call.call(this, m, { match, usedPrefix, noPrefix, args, command, conn: this })
            } else if (typeof plugin.default === 'function') {
                await plugin.default.call(this, m, { match, usedPrefix, noPrefix, args, command, conn: this })
            } else {
                console.log(chalk.yellow(`Plugin sin función call: ${name}`))
            }
        } catch (e) {
            logError(e)
            // Reinicia bot si falla plugin crítico
            console.log(chalk.red(`Reiniciando bot por fallo en plugin: ${name}`))
            process.exit(1)
        }
        break
    }

    // === Queue y stats ===
    if (opts['queque'] && m.text) {
        const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
        if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1)
    }
    if (opts['autoread']) {
        try { await this.readMessages([m.key]) } catch(e){ logError(e) }
    }
}
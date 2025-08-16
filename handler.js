import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'

const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(function () {
    clearTimeout(this)
    resolve()
}, ms))

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return;
    if (global.db.data == null) await global.loadDatabase()

    try {
        m = smsg(this, m) || m
        if (!m) return
        m.exp = 0
        m.coin = false

        // === Inicialización de usuario ===
        let user = global.db.data.users[m.sender] || {}
        if (typeof user !== 'object') global.db.data.users[m.sender] = {}
        Object.assign(user, {
            exp: user.exp || 0,
            coin: user.coin || 10,
            joincount: user.joincount || 1,
            diamond: user.diamond || 3,
            lastadventure: user.lastadventure || 0,
            lastclaim: user.lastclaim || 0,
            health: user.health || 100,
            lastcofre: user.lastcofre || 0,
            lastdiamantes: user.lastdiamantes || 0,
            lastpago: user.lastpago || 0,
            lastcode: user.lastcode || 0,
            lastcodereg: user.lastcodereg || 0,
            lastduel: user.lastduel || 0,
            lastmining: user.lastmining || 0,
            muto: user.muto || false,
            premium: user.premium || false,
            premiumTime: user.premiumTime || 0,
            registered: user.registered || false,
            genre: user.genre || '',
            birth: user.birth || '',
            marry: user.marry || '',
            description: user.description || '',
            packstickers: user.packstickers || null,
            name: user.name || m.name,
            age: user.age || -1,
            regTime: user.regTime || -1,
            afk: user.afk || -1,
            afkReason: user.afkReason || '',
            role: user.role || 'Nuv',
            banned: user.banned || false,
            useDocument: user.useDocument || false,
            bank: user.bank || 0,
            level: user.level || 0
        })
        global.db.data.users[m.sender] = user

        // === Inicialización de chat ===
        let chat = global.db.data.chats[m.chat] || {}
        Object.assign(chat, {
            isBanned: chat.isBanned || false,
            sAutoresponder: chat.sAutoresponder || '',
            welcome: chat.welcome ?? true,
            autolevelup: chat.autolevelup || false,
            autoAceptar: chat.autoAceptar || false,
            autoRechazar: chat.autoRechazar || false,
            autosticker: chat.autosticker || false,
            autoresponder: chat.autoresponder || false,
            detect: chat.detect ?? true,
            antiBot: chat.antiBot || false,
            antiBot2: chat.antiBot2 || false,
            modoadmin: chat.modoadmin || false,
            antiLink: chat.antiLink ?? true,
            reaction: chat.reaction || false,
            nsfw: chat.nsfw || false,
            antifake: chat.antifake || false,
            delete: chat.delete || false,
            expired: chat.expired || 0,
            antiLag: chat.antiLag || false,
            per: chat.per || [],
            antiPorn: chat.antiPorn || false
        })
        global.db.data.chats[m.chat] = chat

        // === Inicialización de settings ===
        let settings = global.db.data.settings[this.user.jid] || {}
        Object.assign(settings, {
            self: settings.self || false,
            restrict: settings.restrict || true,
            jadibotmd: settings.jadibotmd ?? true,
            antiPrivate: settings.antiPrivate || false,
            autoread: settings.autoread || false,
            status: settings.status || 0
        })
        global.db.data.settings[this.user.jid] = settings

    } catch (e) {
        console.error(e)
    }

    // === Variables de permisos ===
    const detectwhat = m.sender.includes('@lid') ? '@lid' : '@s.whatsapp.net';
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
    if (m.isGroup && chat.antiPorn) {
        const isMedia = m.mtype === 'imageMessage' || m.mtype === 'videoMessage' || m.mtype === 'stickerMessage'
        if (isMedia) {
            await this.sendMessage(m.chat, { text: `❌ Contenido inapropiado detectado. Se eliminó tu mensaje.` }, { quoted: m })
            if (m.key?.id) await this.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender } })
            return
        }
    }

    // === Plugins y comandos ===
    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
    let usedPrefix = ''

    for (let name in global.plugins) {
        let plugin = global.plugins[name]
        if (!plugin) continue
        if (plugin.disabled) continue
        const __filename = join(___dirname, name)

        if (typeof plugin.all === 'function') {
            try { await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename }) } 
            catch (e) { console.error(e) }
        }

        const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
        let _prefix = plugin.customPrefix || conn.prefix || global.prefix
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

        try {
            await plugin.call(this, m, { match, usedPrefix, noPrefix, args, command, conn: this })
        } catch (e) {
            console.error(e)
        }
        break
    }

    // === Queue y stats ===
    if (opts['queque'] && m.text) {
        const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
        if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1)
    }
    if (opts['autoread']) await this.readMessages([m.key])
}
import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile, writeFileSync, appendFileSync } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import moment from 'moment-timezone'
import { createHash } from 'crypto'
const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

function logError(e) {
    const date = new Date().toISOString()
    const msg = `[${date}] ${e.stack || e}\n`
    appendFileSync('./error.log', msg)
    console.error(chalk.red(msg))
}

function backupDB() {
    try {
        if (global.db && global.db.data) {
            const data = JSON.stringify(global.db.data, null, 2)
            writeFileSync('./backup_db.json', data)
            console.log(chalk.green('[BACKUP] Base de datos respaldada correctamente.'))
        }
    } catch(e){ logError(e) }
}

export async function handler(chatUpdate, opts = {}) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return

    try { await this.pushMessage(chatUpdate.messages) } catch(e){ logError(e) }

    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
    if (global.db.data == null) await global.loadDatabase()

    try { m = smsg(this, m) || m } catch(e){ logError(e); return }
    if (!m) return

    m.exp = 0
    m.coin = false

    try {
        // === Inicialización de usuario y registro automático ===
        let user = global.db.data.users[m.sender]
        if (typeof user !== 'object') global.db.data.users[m.sender] = {}
        if (user) {
            if (!('registered' in user)) {
                user.registered = false
            }
            if (!user.registered) {
                const nombre = (await this.getName(m.sender)) || "Shinobi"
                const edad = 18
                const fecha = moment().tz('America/Tegucigalpa').toDate()
                const sn = createHash('md5').update(m.sender).digest('hex').slice(0, 20)
                const moneda = global.moneda || '💰'

                user.registered = true
                user.name = nombre.trim()
                user.age = edad
                user.regTime = +new Date()
                user.coin = 46
                user.exp = 310
                user.joincount = 25
                user.role = 'Genin'
                user.banned = false
                user.sn = sn
                global.db.data.users[m.sender] = user

                const certificado = `
🪪 ✦⟩ 𝖢𝖾𝗋𝗍𝗂𝖿𝗂𝖼𝖺𝖽𝗈 𝖭𝗂𝗇𝗃𝖺 ✦⟨🪪

🔮 Nombre: ${nombre}
🪬 Aldea: Konoha
🪡 Rango: Genin
🧬 Código ID: ${sn}
📅 Registro: ${fecha.toLocaleDateString()}

✨ Recompensas iniciales ✨
${moneda}: +46
⭐ EXP: +310
🎟️ Tickets de Misión: +25
`.trim()

                try {
                    await this.sendMessage(m.sender, { text: certificado }, { quoted: m })
                } catch (e) {
                    console.error("❌ No pude enviar el mensaje privado:", e)
                }

                if (m.isGroup) {
                    await m.reply(`👋 ¡Bienvenido, Shinobi @${m.sender.split('@')[0]}! Ya estás registrado ✅`, null, {
                        mentions: [m.sender]
                    })
                }
            }

            if (!isNumber(user.exp)) user.exp = 0
            if (!isNumber(user.coin)) user.coin = 10
            if (!isNumber(user.joincount)) user.joincount = 1
            if (!isNumber(user.diamond)) user.diamond = 3
            if (!isNumber(user.lastadventure)) user.lastadventure = 0
            if (!isNumber(user.lastclaim)) user.lastclaim = 0
            if (!isNumber(user.health)) user.health = 100
            if (!isNumber(user.crime)) user.crime = 0
            if (!isNumber(user.lastcofre)) user.lastcofre = 0
            if (!isNumber(user.lastdiamantes)) user.lastdiamantes = 0
            if (!isNumber(user.lastpago)) user.lastpago = 0
            if (!isNumber(user.lastcode)) user.lastcode = 0
            if (!isNumber(user.lastcodereg)) user.lastcodereg = 0
            if (!isNumber(user.lastduel)) user.lastduel = 0
            if (!isNumber(user.lastmining)) user.lastmining = 0
            if (!('muto' in user)) user.muto = false
            if (!('premium' in user)) user.premium = false
            if (!user.premium) user.premiumTime = 0
            if (!('genre' in user)) user.genre = ''
            if (!('birth' in user)) user.birth = ''
            if (!('marry' in user)) user.marry = ''
            if (!('description' in user)) user.description = ''
            if (!('packstickers' in user)) user.packstickers = null
            if (!user.registered) {
                if (!('name' in user)) user.name = m.name
                if (!isNumber(user.age)) user.age = -1
                if (!isNumber(user.regTime)) user.regTime = -1
            }
            if (!isNumber(user.afk)) user.afk = -1
            if (!('afkReason' in user)) user.afkReason = ''
            if (!('role' in user)) user.role = 'Nuv'
            if (!('banned' in user)) user.banned = false
            if (!('useDocument' in user)) user.useDocument = false
            if (!isNumber(user.level)) user.level = 0
            if (!isNumber(user.bank)) user.bank = 0
            if (!isNumber(user.warn)) user.warn = 0
        } else {
            global.db.data.users[m.sender] = {
                exp: 0, coin: 10, joincount: 1, diamond: 3, lastadventure: 0, health: 100, lastclaim: 0,
                lastcofre: 0, lastdiamantes: 0, lastcode: 0, lastduel: 0, lastpago: 0, lastmining: 0,
                lastcodereg: 0, muto: false, registered: false, genre: '', birth: '', marry: '',
                description: '', packstickers: null, name: m.name, age: -1, regTime: -1, afk: -1,
                afkReason: '', banned: false, useDocument: false, bank: 0, level: 0, role: 'Nuv',
                premium: false, premiumTime: 0,
            }
        }

        // --- Inicialización de chat ---
        let chat = global.db.data.chats[m.chat] || {}
        Object.assign(chat, {
            isBanned: chat.isBanned || false,
            sAutoresponder: chat.sAutoresponder || '',
            welcome: chat.welcome ?? true,
            autolevelup: chat.autolevelup || false,
            autoAceptar: chat.autoAceptar || false,
            autosticker: chat.autosticker || false,
            autoRechazar: chat.autoRechazar || false,
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
            expired: isNumber(chat.expired) ? chat.expired : 0,
            antiLag: chat.antiLag || false,
            per: chat.per || [],
            antiPorn: chat.antiPorn || false
        })
        global.db.data.chats[m.chat] = chat

        // --- Inicialización de settings ---
        let settings = global.db.data.settings[this.user.jid]
        if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = {}
        if (settings) {
            if (!('self' in settings)) settings.self = false
            if (!('restrict' in settings)) settings.restrict = true
            if (!('jadibotmd' in settings)) settings.jadibotmd = true
            if (!('antiPrivate' in settings)) settings.antiPrivate = false
            if (!('autoread' in settings)) settings.autoread = false
        } else {
            global.db.data.settings[this.user.jid] = {
                self: false, restrict: true, jadibotmd: true, antiPrivate: false, autoread: false, status: 0
            }
        }
    } catch (e) { logError(e) }

    // --- Permisos ---
    const detectwhat = m.sender.includes('@lid') ? '@lid' : '@s.whatsapp.net'
    const isROwner = [...global.owner.map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender)
    const isOwner = isROwner || m.fromMe
    const isMods = isROwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender)
    const _user = global.db.data.users[m.sender]
    const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender) || _user.premium === true

    if (m.isBaileys) return
    if (opts['nyimak']) return
    if (!isROwner && opts['self']) return
    if (opts['swonly'] && m.chat !== 'status@broadcast') return
    if (typeof m.text !== 'string') m.text = ''

    // Funcion para setprimary By Ado
    if (m.isGroup) {
        let chat = global.db.data.chats[m.chat];
        if (chat?.primaryBot && this?.user?.jid !== chat.primaryBot) return;
    }

    if (opts['queque'] && m.text && !(isMods || isPrems)) {
        let queque = this.msgqueque, time = 1000 * 5
        const previousID = queque[queque.length - 1]
        queque.push(m.id || m.key.id)
        setInterval(async function () {
            if (queque.indexOf(previousID) === -1) clearInterval(this)
            await delay(time)
        }, time)
    }

    m.exp += Math.ceil(Math.random() * 10)

    async function getLidFromJid(id, conn) {
        if (id.endsWith('@lid')) return id
        const res = await conn.onWhatsApp(id).catch(() => [])
        return res[0]?.lid || id
    }

    const senderLid = await getLidFromJid(m.sender, this)
    const botLid = await getLidFromJid(this.user.jid, this)
    const senderJid = m.sender
    const botJid = this.user.jid
    const groupMetadata = m.isGroup ? ((this.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(_ => null)) : {}
    const participants = m.isGroup ? (groupMetadata.participants || []) : []
    const user = participants.find(p => p.id === senderLid || p.id === senderJid) || {}
    const bot = participants.find(p => p.id === botLid || p.id === botJid) || {}
    const isRAdmin = user?.admin === "superadmin"
    const isAdmin = isRAdmin || user?.admin === "admin"
    const isBotAdmin = !!bot?.admin

    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
    let usedPrefix = ''

    for (let name in global.plugins) {
        let plugin = global.plugins[name]
        if (!plugin || plugin.disabled) continue
        const __filename = join(___dirname, name)

        if (typeof plugin.all === 'function') {
            try {
                await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename })
            } catch (e) { logError(e) }
        }

        if (!opts['restrict']) {
            if (plugin.tags && plugin.tags.includes('admin')) continue
        }

        const str2Regex = str => str.replace(/[|\{}()[\]^$+*?.]/g, '\\$&')
        let _prefix = plugin.customPrefix ? plugin.customPrefix : this.prefix ? this.prefix : global.prefix
        let match = (_prefix instanceof RegExp ?
            [[_prefix.exec(m.text), _prefix]] :
            Array.isArray(_prefix) ?
                _prefix.map(p => {
                    let re = p instanceof RegExp ? p : new RegExp(str2Regex(p))
                    return [re.exec(m.text), re]
                }) :
                typeof _prefix === 'string' ?
                    [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
                    [[[], new RegExp]]
        ).find(p => p[1])

        if (typeof plugin.before === 'function') {
            if (await plugin.before.call(this, m, {
                match, conn: this, participants, groupMetadata, user, bot, isROwner, isOwner, isRAdmin, isAdmin,
                isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename
            })) continue
        }

        if (typeof plugin !== 'function') continue

        if ((usedPrefix = (match[0] || '')[0])) {
            let noPrefix = m.text.replace(usedPrefix, '')
            let [command, ...args] = noPrefix.trim().split(/\s+/)
            args = args || []
            let _args = noPrefix.trim().split(/\s+/).slice(1)
            let text = _args.join(' ')
            command = (command || '').toLowerCase()
            let fail = plugin.fail || global.dfail
            let isAccept = plugin.command instanceof RegExp ?
                plugin.command.test(command) :
                Array.isArray(plugin.command) ?
                    plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
                    typeof plugin.command === 'string' ? plugin.command === command : false

            if (!isAccept) continue
            global.comando = command
            if ((m.id.startsWith('NJX-') || (m.id.startsWith('BAE5') && m.id.length === 16) || (m.id.startsWith('B24E') && m.id.length === 20))) return

            let chat = global.db.data.chats[m.chat]
            let userData = global.db.data.users[m.sender]
            let setting = global.db.data.settings[this.user.jid]

            if (!['grupo-unbanchat.js'].includes(name) && chat?.isBanned && !isROwner) return
            if (name != 'owner-unbanuser.js' && userData?.banned && !isROwner) {
                m.reply(`《✦》Estas baneado/a, no puedes usar comandos en este bot!\n\n${userData.bannedReason ? `✰ Motivo: ${userData.bannedReason}` : '✰ *Motivo:* Sin Especificar'}\n\n> ✧ Si este Bot es cuenta oficial y tiene evidencia que respalde que este mensaje es un error, puedes exponer tu caso con un moderador.`)
                return
            }
            if (name != 'grupo-unbanchat.js' && chat?.isBanned) return
            if (name != 'owner-unbanuser.js' && userData?.banned) return

            let adminMode = global.db.data.chats[m.chat].modoadmin
            let mini = `${plugin.botAdmin || plugin.admin || plugin.group || plugin || noPrefix || usedPrefix || m.text.slice(0, 1) == usedPrefix || plugin.command}`
            if (adminMode && !isOwner && !isROwner && m.isGroup && !isAdmin && mini) return
            if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail('owner', m, this, usedPrefix, command); continue }
            if (plugin.rowner && !isROwner) { fail('rowner', m, this, usedPrefix, command); continue }
            if (plugin.owner && !isOwner) { fail('owner', m, this, usedPrefix, command); continue }
            if (plugin.mods && !isMods) { fail('mods', m, this, usedPrefix, command); continue }
            if (plugin.premium && !isPrems) { fail('premium', m, this, usedPrefix, command); continue }
            if (plugin.group && !m.isGroup) { fail('group', m, this, usedPrefix, command); continue } else if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this, usedPrefix, command); continue } else if (plugin.admin && !isAdmin) { fail('admin', m, this, usedPrefix, command); continue }
            if (plugin.private && m.isGroup) { fail('private', m, this, usedPrefix, command); continue }
            if (plugin.register === true && _user.registered === false) { fail('unreg', m, this, usedPrefix, command); continue }

            m.isCommand = true
            let xp = 'exp' in plugin ? parseInt(plugin.exp) : 10
            m.exp += xp

            if (!isPrems && plugin.coin && global.db.data.users[m.sender].coin < plugin.coin * 1) {
                this.reply(m.chat, `❮✦❯ Se agotaron tus ${moneda}`, m); continue
            }
            if (plugin.level > _user.level) {
                this.reply(m.chat, `❮✦❯ Se requiere el nivel: *${plugin.level}*\n\n• Tu nivel actual es: *${_user.level}*\n\n• Usa este comando para subir de nivel:\n*${usedPrefix}levelup*`, m); continue
            }

            let extra = {
                match, usedPrefix, noPrefix, _args, args, command, text, conn: this, participants,
                groupMetadata, user: _user, bot, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin,
                isPrems, chatUpdate, __dirname: ___dirname, __filename
            }

            try {
                await plugin.call(this, m, extra)
                if (!isPrems) m.coin = m.coin || plugin.coin || false
            } catch (e) {
                m.error = e
                logError(e)
                if (e) {
                    let text = format(e)
                    for (let key of Object.values(global.APIKeys)) text = text.replace(new RegExp(key, 'g'), 'Administrador')
                    m.reply(text)
                }
            } finally {
                if (typeof plugin.after === 'function') {
                    try {
                        await plugin.after.call(this, m, extra)
                    } catch (e) { logError(e) }
                }
                if (m.coin) this.reply(m.chat, `❮✦❯ Utilizaste ${+m.coin} ${moneda}`, m)
            }
            break
        }
    }

    try {
        if (opts['queque'] && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
            if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1)
        }

        let userData, stats = global.db.data.stats
        if (m) {
            let user = global.db.data.users[m.sender]
            if (user?.muto === true) {
                let bang = m.key.id
                let cancellazzione = m.key.participant
                await this.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: cancellazzione } })
            }

            if (m.sender && (userData = global.db.data.users[m.sender])) {
                userData.exp += m.exp
                userData.coin -= m.coin * 1
            }

            let stat
            if (m.plugin) {
                let now = +new Date
                if (m.plugin in stats) {
                    stat = stats[m.plugin]
                    if (!isNumber(stat.total)) stat.total = 1
                    if (!isNumber(stat.success)) stat.success = m.error != null ? 0 : 1
                    if (!isNumber(stat.last)) stat.last = now
                    if (!isNumber(stat.lastSuccess)) stat.lastSuccess = m.error != null ? 0 : now
                } else {
                    stat = stats[m.plugin] = {
                        total: 1, success: m.error != null ? 0 : 1, last: now, lastSuccess: m.error != null ? 0 : now
                    }
                }
                stat.total += 1
                stat.last = now
                if (m.error == null) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }

        try {
            if (!opts['noprint']) await (await import('./lib/print.js')).default(m, this)
        } catch (e) { logError(e) }

        let settingsREAD = global.db.data.settings[this.user.jid] || {}
        if (opts['autoread']) await this.readMessages([m.key])

        if (global.db.data.chats[m.chat]?.reaction && m.text.match(/(ción|dad|aje|oso|izar|mente|pero|tion|age|ous|ate|and|but|ify|ai|yuki|a|s)/gi)) {
            let emot = pickRandom(["🍥", "💥", "🥷", "🍜", "🍃", "🔥", "💧", "⚡️", "⛰️", "🪨", "☯️", "🪡", "🍡", "👺", "🦊"])
            if (!m.fromMe) await this.sendMessage(m.chat, { react: { text: emot, key: m.key } })
        }
    } catch (e) { logError(e) }
}

function pickRandom(list) { return list[Math.floor(Math.random() * list.length)] }

global.dfail = (type, m, conn, usedPrefix, command) => {
    let edadaleatoria = ['10', '28', '20', '40', '18', '21', '15', '11', '9', '17', '25'].getRandom()
    let user2 = m.pushName || 'Anónimo'
    let verifyaleatorio = ['registrar', 'reg', 'verificar', 'verify', 'register'].getRandom()
    const msg = {
        rowner: '🔐 Solo el *Hokage de la Aldea* puede usar este jutsu.',
        owner: '👑 Solo el *Hokage y sus Sannin* pueden usar este jutsu.',
        mods: '🛡️ Solo los *Anbu* pueden usar este jutsu.',
        premium: '💎 Solo los *Shinobis de rango A* pueden usar este jutsu.',
        group: '「✧」 Este jutsu solo funciona en la *Aldea de la Hoja*.',
        private: '🔒 Este jutsu solo se puede usar en un *pergamino privado*.',
        admin: '⚔️ Solo los *Jōnin de Élite* pueden usar este jutsu.',
        botAdmin: 'El bot debe ser *Jōnin* para ejecutar esto.',
        unreg: '> 🔰 Debes estar en el *Libro Bingo* para usar este jutsu.\n\n Ejemplo: *#reg Ado.55*',
        restrict: '⛔ Este jutsu está deshabilitado por el Consejo de la Aldea.'
    }[type];
    if (msg) return conn.reply(m.chat, msg, m, { contextInfo: global.rcanal }).then(() => conn.sendMessage(m.chat, { react: { text: '✖️', key: m.key } }))
    let file = global.__filename(import.meta.url, true)
    watchFile(file, async () => {
        unwatchFile(file)
        console.log(chalk.magenta("Se actualizo 'handler.js'"))
        if (global.conns && global.conns.length > 0) {
            const users = [...new Set([...global.conns.filter(conn => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map(conn => conn)])]
            for (const userr of users) {
                userr.subreloadHandler(false)
            }
        }
    })
}

setInterval(()=>backupDB(),10*60*1000)
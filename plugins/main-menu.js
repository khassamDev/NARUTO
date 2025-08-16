import fs from 'fs'
import { join } from 'path'
import { xpRange } from '../lib/levelling.js'
import moment from 'moment-timezone'

const tags = {
  serbot: '🫔 JADIBOT: CLONES',
  eco: '💰 RYO: ECONOMÍA',
  downloader: '📜 JUTSUS DE DESCARGA',
  tools: '🪡 HERRAMIENTAS SHINOBI',
  owner: '👑 KAGE DE LA ALDEA',
  info: 'ℹ️ TABLÓN DE MISIONES',
  game: '🎯 JUEGOS DE NINJAS',
  gacha: '🍥 RAMEN DE LA SUERTE',
  reacciones: '🧡 REACCIONES NARU',
  group: '👥 ALDEA DE LA HOJA',
  search: '🔍 NIKKEN: BUSCADORES',
  sticker: '💥 NINJUTSUS DE STICKER',
  ia: '🧠 MENTE SHINOBI',
  channel: '📺 TAIKAI DE CANALES',
  fun: '😂 DIVERSIÓN Y ENTRENAMIENTO',
}

const defaultMenu = {
  before: `
¡Dattebayo, %name!
Soy %botname *( %tipo )*, el Ninja de la Hoja.

🪪 *CANAL NARUTO:* https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O

> 🍜 Fecha de Misión: *%date*
> 🍥 Tiempo de Servicio: *%uptime*
%readmore
`.trimStart(),

  header: '\n\`%category 🥞\`',
  body: '\`🧃\` *%cmd* %islimit %isPremium',
  footer: '',
  after: '\n🍃 Creado por el Clan Uchiha.',
}

const handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    const { exp, limit, level } = global.db.data.users[m.sender]
    const { min, xp, max } = xpRange(level, global.multiplier)
    const name = await conn.getName(m.sender)

    const d = new Date(Date.now() + 3600000)
    const date = d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })

    const help = Object.values(global.plugins)
      .filter(p => !p.disabled)
      .map(p => ({
        help: Array.isArray(p.help) ? p.help : [p.help],
        tags: Array.isArray(p.tags) ? p.tags : [p.tags],
        prefix: 'customPrefix' in p,
        limit: p.limit,
        premium: p.premium,
      }))

    let nombreBot = global.namebot || 'Bot'
    let bannerFinal = './storage/img/menu.jpg'

    const botActual = conn.user?.jid?.split('@')[0].replace(/\D/g, '')
    const configPath = join('./JadiBots', botActual, 'config.json')
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath))
        if (config.name) nombreBot = config.name
        if (config.banner) bannerFinal = config.banner
      } catch {}
    }

    const tipo = conn.user.jid === global.conn.user.jid ? '𝗣𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 🆅' : '𝗦𝘂𝗯𝗕𝗼𝘁 🅱'
    const menuConfig = conn.menu || defaultMenu

    const _text = [
      menuConfig.before,
      ...Object.keys(tags).map(tag => {
        const cmds = help
          .filter(menu => menu.tags?.includes(tag))
          .map(menu => menu.help.map(h => 
            menuConfig.body
              .replace(/%cmd/g, menu.prefix ? h : `${_p}${h}`)
              .replace(/%islimit/g, menu.limit ? '⭐' : '')
              .replace(/%isPremium/g, menu.premium ? '🪪' : '')
          ).join('\n')).join('\n')
        return [menuConfig.header.replace(/%category/g, tags[tag]), cmds, menuConfig.footer].join('\n')
      }),
      menuConfig.after
    ].join('\n')

    const replace = {
      '%': '%',
      p: _p,
      botname: nombreBot,
      taguser: '@' + m.sender.split('@')[0],
      exp: exp - min,
      maxexp: xp,
      totalexp: exp,
      xp4levelup: max - exp,
      level,
      limit,
      name,
      date,
      uptime: clockString(process.uptime() * 1000),
      tipo,
      readmore: readMore,
      greeting,
    }

    const text = _text.replace(
      new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join('|')})`, 'g'),
      (_, name) => String(replace[name])
    )

    const isURL = /^https?:\/\//i.test(bannerFinal)
    const imageContent = isURL ? { image: { url: bannerFinal } } : { image: fs.readFileSync(bannerFinal) }

    await conn.sendMessage(
      m.chat,
      { ...imageContent, caption: text.trim(), footer: '🦖 Menu de comandos..', headerType: 4, mentionedJid: conn.parseMention(text) },
      { quoted: m }
    )

  } catch (e) {
    console.error('❌ Error en el menú:', e)
    conn.reply(m.chat, '❎ Lo sentimos, el menú tiene un error.', m)
  }
}

handler.command = ['menu', 'help', 'hélp', 'menú', 'ayuda']
handler.register = false
export default handler

const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}

const hour = new Date().getHours()
const greetingMap = {
  0: 'una linda noche ninja 🌙', 1: 'una linda noche ninja 💤', 2: 'una linda noche ninja 🦉',
  3: 'una linda mañana ninja ✨', 4: 'una linda mañana ninja 💫', 5: 'una linda mañana ninja 🌅',
  6: 'una linda mañana ninja 🌄', 7: 'una linda mañana ninja 🌅', 8: 'una linda mañana ninja 💫',
  9: 'una linda mañana ninja ✨', 10: 'un lindo día ninja 🌞', 11: 'un lindo día ninja 🌨',
  12: 'un lindo día ninja ❄', 13: 'un lindo día ninja 🌤', 14: 'una linda tarde ninja 🌇',
  15: 'una linda tarde ninja 🥀', 16: 'una linda tarde ninja 🌹', 17: 'una linda tarde ninja 🌆',
  18: 'una linda noche ninja 🌙', 19: 'una linda noche ninja 🌃', 20: 'una linda noche ninja 🌌',
  21: 'una linda noche ninja 🌃', 22: 'una linda noche ninja 🌙', 23: 'una linda noche ninja 🌃',
}
const greeting = 'Espero que tengas ' + (greetingMap[hour] || 'un buen día, shinobi')
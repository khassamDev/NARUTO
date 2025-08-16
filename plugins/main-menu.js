import fs from 'fs/promises'
import { join } from 'path'
import { xpRange } from '../lib/levelling.js'
import moment from 'moment-timezone'

const tagsNaruto = {
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

const defaultMenuNaruto = {
  before: `
¡Dattebayo, %name!
Soy %botname *( %tipo )*, listo para la batalla.

🪪 *SOPORTE:* +595984495031

> 🍜 Fecha de misión: *%date*
> 🍥 Tiempo de servicio: *%uptime*
%readmore
`.trimStart(),

  header: '\n\`%category 🥞\`',
  body: '\`🧃\` *%cmd* %islimit %isPremium',
  footer: '',
  after: '\nCreado por el Clan Uchiha.',
}

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    const { exp, limit, level } = global.db.data.users[m.sender]
    const { min, xp, max } = xpRange(level, global.multiplier)
    const name = await conn.getName(m.sender)

    const hour = moment().tz('America/Tegucigalpa').hour()
    const greetingMap = {
      0: 'una linda noche 🌙', 1: 'una linda noche 💤', 2: 'una linda noche 🦉',
      3: 'una linda mañana ✨', 4: 'una linda mañana 💫', 5: 'una linda mañana 🌅',
      6: 'una linda mañana 🌄', 7: 'una linda mañana 🌅', 8: 'una linda mañana 💫',
      9: 'una linda mañana ✨', 10: 'un lindo día 🌞', 11: 'un lindo día 🌨',
      12: 'un lindo día ❄', 13: 'un lindo día 🌤', 14: 'una linda tarde 🌇',
      15: 'una linda tarde 🥀', 16: 'una linda tarde 🌹', 17: 'una linda tarde 🌆',
      18: 'una linda noche 🌙', 19: 'una linda noche 🌃', 20: 'una linda noche 🌌',
      21: 'una linda noche 🌃', 22: 'una linda noche 🌙', 23: 'una linda noche 🌃',
    }
    const greeting = 'Espero que tengas ' + (greetingMap[hour] || 'un buen día')

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
    try {
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
        if (config.name) nombreBot = config.name
        if (config.banner) bannerFinal = config.banner
    } catch {}

    const tipo = conn.user.jid === global.conn.user.jid ? '𝗣𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 🆅' : '𝗦𝘂𝗯𝗕𝗼𝘁 🅱'
    const menuConfig = defaultMenuNaruto 

    const _text = [
      menuConfig.before,
      ...Object.keys(tagsNaruto).map(tag => {
        const cmds = help
          .filter(menu => menu.tags?.includes(tag))
          .map(menu => menu.help.map(h => 
            menuConfig.body
              .replace(/%cmd/g, menu.prefix ? h : `${_p}${h}`)
              .replace(/%islimit/g, menu.limit ? '⭐' : '')
              .replace(/%isPremium/g, menu.premium ? '🪪' : '')
          ).join('\n')).join('\n')
        return [menuConfig.header.replace(/%category/g, tagsNaruto[tag]), cmds, menuConfig.footer].join('\n')
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

    let imageContent
    const isURL = /^https?:\/\//i.test(bannerFinal)
    if (isURL) {
      imageContent = { image: { url: bannerFinal } }
    } else {
      try {
        const fileExists = await fs.access(bannerFinal).then(() => true).catch(() => false)
        if (fileExists) {
          imageContent = { image: await fs.readFile(bannerFinal) }
        } else {
          imageContent = { text: 'No se encontró la imagen del banner, el bot usará solo texto.' }
        }
      } catch {
        imageContent = { text: 'No se pudo leer la imagen del banner, el bot usará solo texto.' }
      }
    }

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

handler.command = ['help', 'menu', 'menuninja', 'shinobimenu']
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
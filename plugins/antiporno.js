//--> Hecho por KekoOfficial
import fetch from 'node-fetch'
import FormData from 'form-data'

const defaultImage = 'https://files.catbox.moe/ubftco.jpg'
const DEEPAI_KEY = 'd8e57853-6d2c-4409-933a-11da7f7d4e5e'

// Función para detectar NSFW usando DeepAI
async function checkNSFW(buffer) {
  try {
    const form = new FormData()
    form.append('image', buffer, 'file.jpg')

    const res = await fetch('https://api.deepai.org/api/nsfw-detector', {
      method: 'POST',
      headers: { 'api-key': DEEPAI_KEY },
      body: form
    })

    const data = await res.json()
    if (!data.output || !data.output.nsfw_score) return { isNSFW: false }
    return { isNSFW: data.output.nsfw_score > 0.6 }
  } catch {
    return { isNSFW: false }
  }
}

// --- Comando para activar/desactivar antiporno
const toggleHandler = async (m, { command }) => {
  if (!m.isGroup) return m.reply('🔒 Solo funciona en grupos.')
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}

  const chat = global.db.data.chats[m.chat]
  const enable = command === 'onantiporno'
  chat.antiporno = enable
  if (!chat.antipornoWarns) chat.antipornoWarns = {}
  if (!chat.antipornoHistory) chat.antipornoHistory = []

  return m.reply(`✅ AntiPorn ${enable ? 'activado' : 'desactivado'} con éxito.`)
}

toggleHandler.command = ['onantiporno', 'offantiporno']
toggleHandler.group = true
toggleHandler.register = false
toggleHandler.tags = ['group']
toggleHandler.help = ['onantiporno', 'offantiporno']

// --- Comando para consultar historial
const historyHandler = async (m, { conn }) => {
  if (!m.isGroup) return m.reply('🔒 Solo funciona en grupos.')
  if (!global.db.data.chats[m.chat]) return m.reply('No hay historial.')

  const chat = global.db.data.chats[m.chat]
  if (!chat.antipornoHistory || chat.antipornoHistory.length === 0) return m.reply('📜 No hay usuarios con infracciones aún.')

  const lines = chat.antipornoHistory.map((u, i) => {
    const userTag = `@${u.jid.split('@')[0]}`
    return `${i+1}. ${userTag} → ${u.warns} advertencias, última infracción: ${new Date(u.last).toLocaleString()}`
  }).join('\n')

  await conn.sendMessage(m.chat, { text: `📜 Historial de infracciones:\n\n${lines}`, mentions: chat.antipornoHistory.map(u => u.jid) }, { quoted: m })
}

historyHandler.command = ['historialporn']
historyHandler.group = true
historyHandler.register = false
historyHandler.tags = ['group']
historyHandler.help = ['historialporn']

// --- Antes de cada mensaje se revisa contenido
const checkHandler = async (m, { conn }) => {
  if (!m.isGroup) return
  const chat = global.db.data.chats[m.chat]
  if (!chat?.antiporno) return
  if (!m.mimetype) return
  if (!['image', 'video', 'sticker'].includes(m.mtype)) return

  let buffer
  try { buffer = await m.download() } catch { return }

  const result = await checkNSFW(buffer)
  if (!result.isNSFW) return

  if (!chat.antipornoWarns) chat.antipornoWarns = {}
  if (!chat.antipornoWarns[m.sender]) chat.antipornoWarns[m.sender] = 0

  chat.antipornoWarns[m.sender]++
  const warns = chat.antipornoWarns[m.sender]

  // Guardar en historial
  if (!chat.antipornoHistory) chat.antipornoHistory = []
  const existing = chat.antipornoHistory.find(u => u.jid === m.sender)
  if (existing) {
    existing.warns = warns
    existing.last = Date.now()
  } else {
    chat.antipornoHistory.push({ jid: m.sender, warns, last: Date.now() })
  }

  const userTag = `@${m.sender.split('@')[0]}`

  if (warns < 3) {
    try {
      await conn.sendMessage(m.chat, { text: `🚫 ${userTag}, no se permite contenido sexual. Advertencia ${warns}/3.`, mentions: [m.sender] }, { quoted: m })
      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender } })
    } catch {}
  } else {
    try {
      await conn.sendMessage(m.chat, { text: `🚨 ${userTag} alcanzó 3 advertencias y será expulsado por enviar contenido sexual.`, mentions: [m.sender] }, { quoted: m })
      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender } })
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
      chat.antipornoWarns[m.sender] = 0
    } catch {
      await conn.sendMessage(m.chat, { text: `⚠️ No pude expulsar a ${userTag}. Puede que no tenga permisos.`, mentions: [m.sender] }, { quoted: m })
    }
  }

  return true
}

export default [toggleHandler, historyHandler, checkHandler]
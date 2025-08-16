//--> Hecho por KekoOfficial
import fetch from 'node-fetch'
import FormData from 'form-data'

// ------------------- CONFIG -------------------
const defaultImage = 'https://files.catbox.moe/ubftco.jpg'
const DEEPAI_KEY = 'd8e57853-6d2c-4409-933a-11da7f7d4e5e'
global.lastErrors = [] // Array global para errores

// ------------------- FUNCIONES -------------------
// Detectar NSFW usando DeepAI
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
  } catch (err) {
    global.lastErrors.push(err.toString())
    return { isNSFW: false }
  }
}

// ------------------- PLUGINS -------------------

// --- AntiPorn ---
export const antiPorn = {
  command: ['onantiporno', 'offantiporno', 'historialporn'],
  tags: ['group'],
  group: true,
  call: async (m, { args, command, conn }) => {
    try {
      if (command === 'historialporn') {
        const chat = global.db.data.chats[m.chat]
        if (!chat?.antipornoHistory || chat.antipornoHistory.length === 0) return m.reply('📜 No hay usuarios con infracciones aún.')
        const lines = chat.antipornoHistory.map((u, i) => ` ${i+1}. @${u.jid.split('@')[0]} → ${u.warns} advertencias, última: ${new Date(u.last).toLocaleString()}`).join('\n')
        return await conn.sendMessage(m.chat, { text: `📜 Historial de infracciones:\n\n${lines}`, mentions: chat.antipornoHistory.map(u => u.jid) }, { quoted: m })
      }

      if (!m.isGroup) return m.reply('🔒 Solo funciona en grupos.')
      if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}

      const chat = global.db.data.chats[m.chat]
      const enable = command === 'onantiporno'
      chat.antiporno = enable
      if (!chat.antipornoWarns) chat.antipornoWarns = {}
      if (!chat.antipornoHistory) chat.antipornoHistory = []

      return m.reply(`✅ AntiPorn ${enable ? 'activado' : 'desactivado'} con éxito.`)
    } catch (err) {
      global.lastErrors.push(err.toString())
    }
  }
}

// --- AntiPorn Handler para cada mensaje ---
export const antiPornHandler = {
  call: async (m, { conn }) => {
    try {
      if (!m.isGroup) return
      const chat = global.db.data.chats[m.chat]
      if (!chat?.antiporno) return
      if (!m.mimetype || !['image', 'video', 'sticker'].includes(m.mtype)) return

      let buffer
      try { buffer = await m.download() } catch { return }

      const result = await checkNSFW(buffer)
      if (!result.isNSFW) return

      if (!chat.antipornoWarns) chat.antipornoWarns = {}
      if (!chat.antipornoWarns[m.sender]) chat.antipornoWarns[m.sender] = 0
      chat.antipornoWarns[m.sender]++
      const warns = chat.antipornoWarns[m.sender]

      if (!chat.antipornoHistory) chat.antipornoHistory = []
      const existing = chat.antipornoHistory.find(u => u.jid === m.sender)
      if (existing) { existing.warns = warns; existing.last = Date.now() } 
      else { chat.antipornoHistory.push({ jid: m.sender, warns, last: Date.now() }) }

      const userTag = `@${m.sender.split('@')[0]}`
      if (warns < 3) {
        try {
          await conn.sendMessage(m.chat, { text: `🚫 ${userTag}, no se permite contenido sexual. Advertencia ${warns}/3.`, mentions: [m.sender] }, { quoted: m })
          await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender } })
        } catch {}
      } else {
        try {
          await conn.sendMessage(m.chat, { text: `🚨 ${userTag} alcanzó 3 advertencias y será expulsado.`, mentions: [m.sender] }, { quoted: m })
          await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender } })
          await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
          chat.antipornoWarns[m.sender] = 0
        } catch {
          await conn.sendMessage(m.chat, { text: `⚠️ No pude expulsar a ${userTag}.`, mentions: [m.sender] }, { quoted: m })
        }
      }
    } catch (err) { global.lastErrors.push(err.toString()) }
  }
}

// --- Owner Panel ---
export const ownerPanel = {
  command: ['ownerpanel', 'botadmin'],
  tags: ['owner'],
  owner: true,
  call: async (m, { conn, args }) => {
    try {
      if (!args || !args[0]) {
        return m.reply(
          `🛠 Panel Owner - Comandos:\n
1. reiniciar
2. plugins on/off <plugin>
3. advertencias
4. eval <codigo>
5. errores`
        )
      }

      const subcmd = args[0].toLowerCase()

      if (subcmd === 'reiniciar') { await m.reply('🔄 Reiniciando bot...'); process.exit(1) }

      if (subcmd === 'plugins') {
        if (!args[1] || !args[2]) return m.reply('Uso: plugins on/off <plugin>')
        const estado = args[1].toLowerCase()
        const pluginName = args[2]
        if (!global.plugins) return m.reply('No hay plugins cargados.')
        const target = global.plugins.find(p => p.command.includes(pluginName))
        if (!target) return m.reply('Plugin no encontrado.')
        target.disabled = estado === 'off'
        return m.reply(`✅ Plugin ${pluginName} ${estado === 'on' ? 'activado' : 'desactivado'}.`)
      }

      if (subcmd === 'advertencias') {
        const chats = Object.entries(global.db.data.chats)
        let report = ''
        for (const [jid, chat] of chats) {
          if (!chat.antipornoHistory) continue
          report += `📌 Grupo: ${jid}\n`
          for (const u of chat.antipornoHistory) report += `- @${u.jid.split('@')[0]} → ${u.warns} advertencias, última: ${new Date(u.last).toLocaleString()}\n`
          report += '\n'
        }
        return m.reply(report || 'No hay advertencias registradas.')
      }

      if (subcmd === 'eval') {
        try {
          const code = args.slice(1).join(' ')
          if (!code) return m.reply('Ingrese el código a ejecutar.')
          let result = await eval(code)
          if (typeof result !== 'string') result = require('util').inspect(result)
          return m.reply(`📥 Entrada:\n${code}\n\n📤 Resultado:\n${result}`)
        } catch (err) { return m.reply(`❌ Error:\n${err}`) }
      }

      if (subcmd === 'errores') {
        if (!global.lastErrors || global.lastErrors.length === 0) return m.reply('No hay errores recientes.')
        const list = global.lastErrors.map((e, i) => `${i+1}. ${e}`).join('\n\n')
        return m.reply(`🛑 Errores recientes:\n\n${list}`)
      }

      return m.reply('❌ Comando desconocido.')
    } catch (err) { global.lastErrors.push(err.toString()) }
  }
}

// --- EXPORTAR TODOS ---
export default [antiPorn, antiPornHandler, ownerPanel]
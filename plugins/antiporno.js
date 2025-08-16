import fetch from 'node-fetch'
import FormData from 'form-data'
import { toPTT } from './lib/converter.js' // Importa una función para convertir videos a audio si es necesario

// Se usa una variable global de la configuración para la clave de la API
// Asegúrate de definir DEEPAI_KEY en tu archivo config.js
const DEEPAI_KEY = global.DEEPAI_KEY || 'd8e57853-6d2c-4409-933a-11da7f7d4e5e'

// Función para detectar NSFW usando DeepAI
async function checkNSFW(buffer) {
    if (!DEEPAI_KEY) return { isNSFW: false, message: 'API key not defined' };
    try {
        const form = new FormData()
        form.append('image', buffer, { filename: 'image.jpg' })

        const res = await fetch('https://api.deepai.org/api/nsfw-detector', {
            method: 'POST',
            headers: { 'api-key': DEEPAA_KEY },
            body: form
        })

        const data = await res.json()
        if (!data.output || !data.output.nsfw_score) return { isNSFW: false, message: 'No output or score' }
        
        return { 
            isNSFW: data.output.nsfw_score > 0.6,
            score: data.output.nsfw_score
        }
    } catch (e) {
        console.error('Error with DeepAI API:', e);
        return { isNSFW: false, message: e.message }
    }
}

// Handler para los comandos de configuración
let handler = async (m, { conn, command, isBotAdmin, isAdmin }) => {
    if (!m.isGroup) return m.reply('🔒 Este comando solo funciona en grupos.')
    
    // Inicializar chat si no existe
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]

    // Comandos de activación/desactivación
    if (command === 'onantiporno' || command === 'onanti') {
        if (!isAdmin) return m.reply('❌ Este comando es solo para administradores del grupo.')
        chat.antiPorn = true
        if (!chat.antipornoWarns) chat.antipornoWarns = {}
        if (!chat.antipornoHistory) chat.antipornoHistory = []
        return m.reply('✅ El filtro de contenido para adultos ha sido activado.')
    }

    if (command === 'offantiporno' || command === 'offanti') {
        if (!isAdmin) return m.reply('❌ Este comando es solo para administradores del grupo.')
        chat.antiPorn = false
        return m.reply('❌ El filtro de contenido para adultos ha sido desactivado.')
    }

    // Comando historial
    if (command === 'historialporn') {
        if (!chat.antipornoHistory || chat.antipornoHistory.length === 0) 
            return m.reply('📜 No hay usuarios con infracciones aún.')

        const lines = chat.antipornoHistory.map((u,i) => {
            const userTag = `@${u.jid.split('@')[0]}`
            const date = new Date(u.last).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `${i+1}. ${userTag} → ${u.warns} advertencias\nÚltima infracción: ${date}`
        }).join('\n\n')

        await conn.sendMessage(m.chat, { 
            text: `📜 Historial de infracciones:\n\n${lines}`, 
            mentions: chat.antipornoHistory.map(u => u.jid) 
        }, { quoted: m })
        return
    }
}

handler.command = ['onantiporno', 'offantiporno', 'historialporn', 'onanti', 'offanti']
handler.group = true
handler.admin = true // Solo los admins pueden usar estos comandos
export default handler;

// Handler que se ejecuta en cada mensaje para la detección
export const all = async (m, { conn, isBotAdmin }) => {
    if (!m.isGroup) return
    const chat = global.db.data.chats[m.chat] || {}
    const isMedia = ['imageMessage', 'videoMessage', 'stickerMessage'].includes(m.mtype)
    
    // Si el antiporno no está activo o no es un medio, no hacemos nada
    if (!chat.antiPorn || !isMedia) return

    let buffer
    try {
        if (m.mtype === 'stickerMessage' && m.isAnimated) {
            // No se puede convertir stickers animados a imagen para DeepAI
            return
        }
        if (m.mtype === 'videoMessage' && m.duration > 30) {
            // Videos largos pueden consumir muchos recursos, se puede limitar
            return
        }
        
        buffer = await m.download()
        if (!buffer) return
    } catch (e) {
        console.error('Error al descargar el medio:', e)
        return
    }

    const result = await checkNSFW(buffer)
    if (!result.isNSFW) return

    // Inicializar advertencias si no existen
    if (!chat.antipornoWarns) chat.antipornoWarns = {}
    chat.antipornoWarns[m.sender] = (chat.antipornoWarns[m.sender] || 0) + 1
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

    // Borra el mensaje
    await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender } })

    if (warns < 3) {
        await conn.sendMessage(m.chat, { text: `🚫 ${userTag}, el contenido para adultos no está permitido aquí.\nAdvertencia ${warns}/3.`, mentions: [m.sender] }, { quoted: m })
    } else {
        if (isBotAdmin) {
            await conn.sendMessage(m.chat, { text: `🚨 ${userTag} ha superado 3 advertencias y será expulsado por enviar contenido para adultos.`, mentions: [m.sender] }, { quoted: m })
            await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
            chat.antipornoWarns[m.sender] = 0 // Reiniciar advertencias
        } else {
            await conn.sendMessage(m.chat, { text: `⚠️ No puedo expulsar a ${userTag} porque no soy administrador del grupo.`, mentions: [m.sender] }, { quoted: m })
        }
    }
}
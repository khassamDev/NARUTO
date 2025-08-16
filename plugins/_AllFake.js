// Archivo: plugins/beforeNewsletter.js
import fs from 'fs/promises'
import path from 'path'

export async function before(m, { conn }) {
  try {
    // Nombre y banner por defecto
    let nombreBot = global.namebot || 'Bot'
    let bannerFinal = 'https://raw.githubusercontent.com/AdonixServices/Files/main/1754310580366-xco6p1-1754310544013-6cc3a6.jpg'

    // Obtener ID del bot actual
    const botActual = conn.user?.jid?.split('@')[0]?.replace(/\D/g, '')
    if (botActual) {
      const configPath = path.join('./JadiBots', botActual, 'config.json')
      try {
        const data = await fs.readFile(configPath, 'utf-8')
        const config = JSON.parse(data)
        if (config.name) nombreBot = config.name
        if (config.banner) bannerFinal = config.banner
      } catch (err) {
        console.log('⚠️ No se pudo leer config del subbot:', err.message)
      }
    }

    // Selección aleatoria de canal válido
    const canales = [global.idcanal, global.idcanal2].filter(Boolean)
    if (canales.length === 0) return
    const newsletterJidRandom = canales[Math.floor(Math.random() * canales.length)]

    // Generar rcanal para replies
    global.rcanal = {
      contextInfo: {
        isForwarded: true,
        forwardingScore: 1,
        forwardedNewsletterMessageInfo: {
          newsletterJid: newsletterJidRandom,
          serverMessageId: 100,
          newsletterName: nombreBot,
        },
        externalAdReply: {
          title: nombreBot,
          body: global.author || '',
          thumbnailUrl: bannerFinal,
          sourceUrl: 'https://myapiadonix.vercel.app',
          mediaType: 1,
          renderLargerThumbnail: false
        }
      }
    }
  } catch (e) {
    console.log('❌ Error al generar rcanal:', e?.message || e)
  }
}
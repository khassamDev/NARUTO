let handler = async (m, { conn, command }) => {
  const rcanal = {
    contextInfo: {
      isForwarded: true,
      forwardingScore: 200,
      forwardedNewsletterMessageInfo: {
        newsletterJid: global.idcanal,
        serverMessageId: 100,
        newsletterName: global.namecanal,
      }
    }
  }

  let info = `()

  await conn.sendMessage(m.chat, { text: info }, rcanal)
}

handler.help = ['servers']
handler.tags = ['info']
handler.command = ['servers', 'minecraft', 'mc']
export default handler

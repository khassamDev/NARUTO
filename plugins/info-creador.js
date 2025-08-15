let handler = async (m, { conn }) => {
  const name = 'NoaDev Studi9'
  const number = '+595984495031' // sin @
  const email = 'Khassammc@gmail.com'
  const org = 'Creador de Naruto'
  const note = 'Mini desarrollador de bots de WhatsApp'

  const vcard = `
BEGIN:VCARD
VERSION:3.0
N:${name}
FN:${name}
ORG:${org}
EMAIL;type=EMAIL:${email}
TEL;type=CELL;type=VOICE;waid=${number}:${number}
NOTE:${note}
END:VCARD
`.trim()

  await conn.sendMessage(m.chat, {
    contacts: {
      displayName: name,
      contacts: [{ vcard }],
    },
  }, { quoted: m })
}

handler.help = ['creador']
handler.tags = ['info']
handler.command = ['creador', 'owner', 'creator']

export default handler

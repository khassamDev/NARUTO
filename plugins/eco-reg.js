import { createHash } from 'crypto'
import moment from 'moment-timezone'

let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender]
  if (!user) return // seguridad

  // Si ya está registrado, no hacemos nada
  if (user.registered) return

  // Inicializamos valores si no existen
  if (user.coin === undefined) user.coin = 0
  if (user.exp === undefined) user.exp = 0
  if (user.joincount === undefined) user.joincount = 0

  // Datos por defecto
  const nombre = (await conn.getName(m.sender)) || "Shinobi"
  const edad = 18 // por defecto
  const fecha = moment().tz('America/Tegucigalpa').toDate()
  const moneda = global.moneda || '💰'

  // Guardamos en base de datos
  user.name = nombre.trim()
  user.age = edad
  user.regTime = +new Date()
  user.registered = true
  user.coin += 46
  user.exp += 310
  user.joincount += 25

  // ID único
  const sn = createHash('md5').update(m.sender).digest('hex').slice(0, 20)

  // --- Mensaje privado ---
  const certificado = `
🪪 ✦⟩ 𝖢𝖾𝗋𝗍𝗂𝖿𝗂𝖼𝖺𝖽𝗈  ✦⟨🪪

🔮 Nombre: ${nombre}
🕒 Edad: ${edad}
🧬 Código ID: ${sn}
📅 Registro: ${fecha.toLocaleDateString()}

✨ Recompensas iniciales ✨
${moneda}: +46
⭐ EXP: +310
🎟️ Tickets: +25
`.trim()

  try {
    await conn.sendMessage(m.sender, { text: certificado }, { quoted: m })
  } catch (e) {
    console.error("❌ No pude enviar el mensaje privado:", e)
  }

  // --- Mensaje en grupo (simple) ---
  if (m.isGroup) {
    await m.reply(`👋 Bienvenido @${m.sender.split('@')[0]} ya estás registrado ✅`, null, {
      mentions: [m.sender]
    })
  }
}

// Este handler se ejecuta cada vez que alguien mande un mensaje
handler.all = true

export default handler
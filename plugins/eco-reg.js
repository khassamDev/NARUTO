import moment from 'moment-timezone'
import { createHash } from 'crypto'

let handler = async function (m, { conn }) {
  let user = global.db.data.users[m.sender]
  
  // si ya está registrado no hacemos nada
  if (user?.registered) return

  // si no existe el usuario en la db lo creamos
  if (!user) {
    global.db.data.users[m.sender] = {
      name: '',
      age: 0,
      regTime: 0,
      registered: false,
      coin: 0,
      exp: 0,
      joincount: 0
    }
    user = global.db.data.users[m.sender]
  }

  // obtenemos el nombre
  let name = ''
  try {
    name = await conn.getName(m.sender)
  } catch (e) {
    name = m.pushName || 'Sin nombre'
  }

  // datos base
  const fecha = moment().tz('America/Asuncion').toDate()
  const sn = createHash('md5').update(m.sender).digest('hex').slice(0, 20)

  // registro automático
  user.name = name.trim()
  user.age = 18 // edad por defecto
  user.regTime = +new Date()
  user.registered = true
  user.coin = (user.coin || 0) + 20 // recompensa inicial
  user.exp = (user.exp || 0) + 100
  user.joincount = (user.joincount || 0) + 5

  // mensaje en privado
  try {
    await conn.sendMessage(m.sender, {
      text: `✅ Registrado automáticamente\n\n🪪 Nombre: *${name}*\n🔑 ID: ${sn}\n📅 Fecha: ${fecha.toLocaleDateString()}`
    }, { quoted: m })
  } catch (e) {
    console.log('No pude enviar mensaje en privado al usuario', m.sender, e)
  }

  // mensaje de bienvenida en grupo (si no es privado)
  if (m.isGroup) {
    try {
      await conn.sendMessage(m.chat, {
        text: `👋 Bienvenido @${m.sender.split('@')[0]} ya estás registrado.\nRevisa tu privado para ver tu tarjeta.`,
        mentions: [m.sender]
      }, { quoted: m })
    } catch (e) {
      console.log('No pude mandar mensaje de bienvenida en grupo', e)
    }
  }
}

// esto hace que se ejecute en TODOS los mensajes
handler.all = true 

export default handler
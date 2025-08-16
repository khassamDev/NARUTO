import { createHash } from 'crypto';
import moment from 'moment-timezone';

let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender];
  if (!user) return; // Seguridad
  if (user.registered) return; // Si ya está registrado, no hacemos nada

  const nombre = (await conn.getName(m.sender)) || "Shinobi";
  const edad = 18;
  const fecha = moment().tz('America/Tegucigalpa').toDate();
  const moneda = global.moneda || '💰';
  const sn = createHash('md5').update(m.sender).digest('hex').slice(0, 20);
  const groupName = m.isGroup ? (await conn.getGroupMetaData(m.chat)).subject : "Mensaje Privado";

  // Guardamos en la base de datos
  user.name = nombre.trim();
  user.age = edad;
  user.regTime = +new Date();
  user.registered = true;
  user.coin += 46;
  user.exp += 310;
  user.joincount += 25;

  const certificado = `
🤖 ¡Has sido registrado por el bot! 🤖

✨ Detalles de tu cuenta ✨
🔮 Nombre: ${nombre}
🕒 Edad: ${edad}
🧬 Código ID: ${sn}
📅 Registro: ${fecha.toLocaleDateString()}
🌍 Grupo de registro: ${groupName}

---

🎁 Recompensas iniciales 🎁
${moneda}: +46
⭐ EXP: +310
🎟️ Tickets: +25
`;

  try {
    await conn.sendMessage(m.sender, { text: certificado }, { quoted: m });
  } catch (e) {
    console.error("❌ No pude enviar el mensaje privado:", e);
  }

  if (m.isGroup) {
    await m.reply(`👋 ¡Bienvenido @${m.sender.split('@')[0]} ya estás registrado! ✅`, null, {
      mentions: [m.sender]
    });
  }
};

handler.all = true; // Este manejador se ejecutará con cada mensaje

export default handler;
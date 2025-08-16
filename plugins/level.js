// plugins/level.js

let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender];
  if (!user || !user.registered) return;

  const expPorMensaje = 10;
  user.exp += expPorMensaje;

  // Lógica para subir de nivel y enviar la notificación
  // (El mismo código que te proporcioné anteriormente)

  // Definir los rangos y los puntos de EXP necesarios
  const rangos = {
    'F': 0,
    'E': 501,
    'D': 1501,
    'C': 3001,
    'B': 5501,
    'A': 9001,
    'S': 14001,
  };

  const prevLevel = Math.floor(user.exp / 1000);
  const newLevel = Math.floor((user.exp + expPorMensaje) / 1000);

  if (newLevel > prevLevel) {
    let currentRank = '';
    for (const rank in rangos) {
      if (user.exp >= rangos[rank]) {
        currentRank = rank;
      }
    }

    await m.reply(`🎉 ¡Felicidades, @${m.sender.split('@')[0]}! 🎉
Has subido al nivel ${newLevel} y tu nuevo rango es **${currentRank}**.
¡Sigue interactuando para alcanzar el siguiente nivel!`, null, {
      mentions: [m.sender]
    });
  }
}

handler.all = true;

export default handler;
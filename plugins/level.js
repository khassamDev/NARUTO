let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender];
  if (!user || !user.registered) return;

  const expPorMensaje = 10;
  user.exp += expPorMensaje;

  const rangos = {
    'F': 0,
    'E': 501,
    'D': 1501,
    'C': 3001,
    'B': 5501,
    'A': 9001,
    'S': 14001,
  };
  
  const prevLevel = user.level;
  const newLevel = Math.floor(user.exp / 1000); 

  if (newLevel > prevLevel) {
    user.level = newLevel;
    let currentRank = '';
    for (const rank in rangos) {
      if (user.exp >= rangos[rank]) {
        currentRank = rank;
      }
    }
    
    await conn.sendMessage(m.chat, {
      text: `🎉 ¡Felicidades, @${m.sender.split('@')[0]}! 🎉
Has subido al nivel ${newLevel} y tu nuevo rango es **${currentRank}**.
¡Sigue interactuando para alcanzar el siguiente nivel!`,
      mentions: [m.sender]
    });
  }
};

handler.all = true; // Este manejador se ejecutará con cada mensaje

export default handler;
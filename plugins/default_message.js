export const all = async (m, { conn, text, usedPrefix }) => {
    // Si el mensaje es una llamada, un evento de grupo o un comando, no hacer nada.
    if (m.mtype === 'call' || m.isGroup || m.fromMe || text.startsWith(usedPrefix)) return;
    
    // Si el mensaje tiene un comando, tampoco hacemos nada.
    if (m.command) return;

    // Obtener la fecha y hora actuales en un formato específico
    const now = new Date();
    const date = now.toLocaleDateString('es-ES');
    const time = now.toLocaleTimeString('es-ES');

    // Mensaje que quieres enviar con la fecha y hora
    const replyMessage = `Hola soy NARUTO una inteligencia Artificial Creado por NoaDev Studio.

Usa los únicos comandos que tengo actualmente, puedes ver mis comandos con ${usedPrefix}help.

📅 Fecha: ${date}
⏰ Hora: ${time}`;

    // Enviar el mensaje de respuesta
    await m.reply(replyMessage);
}

const handler = async () => {};
handler.tags = ['system'];
export default handler;
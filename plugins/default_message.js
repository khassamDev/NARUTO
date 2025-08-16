export const all = async (m, { conn, text, usedPrefix }) => {
    // Si el mensaje es una llamada, un evento de grupo o un comando, no hacer nada.
    if (m.mtype === 'call' || m.isGroup || m.fromMe || text.startsWith(usedPrefix)) return;
    
    // Si el mensaje tiene un comando, tampoco hacemos nada.
    if (m.command) return;

    // Mensaje que quieres enviar
    const replyMessage = `Hola soy NARUTO una inteligencia Artificial Creado por NoaDev Studio usa los únicos comandó que tengo actualmente puede ver mis comando con .help`;

    // Enviar el mensaje de respuesta
    await m.reply(replyMessage);
}

// Este handler no tiene un comando, se activa con cada mensaje
const handler = async () => {};
handler.tags = ['system'];
export default handler;
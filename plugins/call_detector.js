export const all = async (m, { conn }) => {
    // Escucha el evento de llamada
    if (m.mtype === 'call') {
        // Obtiene la ID de la llamada
        const callId = m.key.id;

        // Rechaza la llamada
        await conn.rejectCall(callId, m.sender);

        // Envía un mensaje al usuario explicando que es un bot
        await conn.sendMessage(m.chat, { text: '🤖 Hola, soy un bot, no una persona real.\nLas llamadas a este número no están disponibles.' });

        console.log(`[EVENTO] Llamada de ${m.sender} rechazada.`);
    }
}

// Este handler no tiene un comando, se activa en cada evento.
const handler = async () => {};
handler.tags = ['system'];
export default handler;
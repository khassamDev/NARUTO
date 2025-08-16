// Variable para almacenar el último momento de la llamada de cada usuario
const callCooldown = new Map();
const COOLDOWN_DURATION = 60 * 1000; // 60 segundos en milisegundos

export const all = async (m, { conn }) => {
    // Escucha el evento de llamada
    if (m.mtype === 'call') {
        const callerId = m.sender;
        const now = Date.now();
        const lastCallTime = callCooldown.get(callerId) || 0;

        // Si el usuario intentó llamar hace menos de 60 segundos, no hagas nada.
        if (now - lastCallTime < COOLDOWN_DURATION) {
            console.log(`[SPAM] Llamada de ${callerId} ignorada por cooldown.`);
            return;
        }

        // Si no está en cooldown, registra la nueva llamada y responde.
        callCooldown.set(callerId, now);
        
        // Obtener la fecha y hora para el registro
        const callDate = new Date().toLocaleString('es-ES', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit', 
            hour12: false
        });

        // Obtiene la ID de la llamada
        const callId = m.key.id;

        // Rechaza la llamada
        await conn.rejectCall(callId, m.sender);

        // Envía un mensaje al usuario explicando que es un bot
        await conn.sendMessage(m.chat, { text: '🤖 Hola, soy un bot, no una persona real.\nLas llamadas a este número no están disponibles.' });

        console.log(`[EVENTO] Llamada de ${m.sender} rechazada el ${callDate}.`);
    }
}

const handler = async () => {};
handler.tags = ['system'];
export default handler;
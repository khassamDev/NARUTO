// Archivo: plugins/_AllFakeCall.js

export default {
    // Esta función se ejecuta solo cuando se llama por comando
    call: async function(m, { command, args, conn }) {
        try {
            // Validar que exista el comando
            if (!command) return;

            // Comando específico: "fake"
            if (command.toLowerCase() === 'fake') {
                const respuesta = args && args.length ? args.join(' ') : '¡Comando fake activado!';
                
                // Enviar respuesta al chat
                await conn.sendMessage(m.chat, {
                    text: `Respuesta del plugin call: ${respuesta}`
                }, { quoted: m });
            }
        } catch (err) {
            console.error('Error en _AllFakeCall.js:', err);
        }
    }
}
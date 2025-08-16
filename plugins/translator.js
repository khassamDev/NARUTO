import translate from '@vitalets/google-translate-api';

let handler = async (m, { conn, text, args, command }) => {
    let lang, query;

    // --- Lógica para responder a un mensaje ---
    if (m.quoted && m.quoted.text) {
        lang = text.trim();
        query = m.quoted.text;

        // Validar que se haya proporcionado un código de idioma
        if (lang.length > 3 || lang.includes(' ')) {
             // Si el texto de respuesta no parece un código, usar el método de comando
             lang = args[0]
             query = args.slice(1).join(' ')
        }
    } 
    // --- Lógica para el comando tradicional ---
    else if (text) {
        lang = args[0];
        query = args.slice(1).join(' ');
    }
    
    // Si no hay texto para traducir o idioma, mostrar ayuda
    if (!lang || !query) {
        return m.reply(`*Uso:*
*1. Respondiendo a un mensaje:*
   - Escribe solo el código de idioma (ej: "es", "en") en tu respuesta.

*2. Usando el comando:*
   - !${command} <código de idioma> <texto>
   - Ejemplo: !${command} en Hola, cómo estás?`);
    }

    try {
        await conn.sendMessage(m.chat, { react: { text: '💬', key: m.key } });
        
        const result = await translate(query, { to: lang });

        const translatedText = `*Traducción*
        
*Idioma detectado:* ${result.from.language.iso}
*Texto original:* ${query}
*Traducción:* ${result.text}`;
        
        await m.reply(translatedText);

    } catch (e) {
        console.error('Error en el plugin de traductor:', e);
        return m.reply(`❌ Ocurrió un error al traducir. Asegúrate de que el código de idioma sea válido (ej: 'en', 'es', 'pt', etc.) y que haya texto para traducir.`);
    }
}

handler.command = ['tr', 'traducir'];
handler.tags = ['utility'];

export default handler;
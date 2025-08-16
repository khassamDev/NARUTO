import yts from "yt-search";
import ytdl from "ytdl-core";
import { unlinkSync, createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export const name = 'play';
export const command = ['play', 'p'];
export const tags = ['audio'];
export const register = true;

export async function handler(m, { conn, text, usedPrefix, command }) {
    if (!text) {
        return m.reply(`❌ Por favor, escribe el nombre de la canción que quieres reproducir.\n\nEjemplo: ${usedPrefix + command} Despacito`);
    }

    let filePath;

    try {
        await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

        const searchResults = await yts(text);
        if (!searchResults.videos.length) {
            return m.reply("⚠️ No se encontraron resultados para tu búsqueda.");
        }

        const video = searchResults.videos[0];
        const audioURL = video.url;
        
        const videoInfo = await ytdl.getInfo(audioURL);
        const { title, lengthSeconds } = videoInfo.videoDetails;

        if (parseInt(lengthSeconds) > 600) { // Limite de 10 minutos
            return m.reply("❌ El audio es demasiado largo. Por favor, busca una canción que dure menos de 10 minutos.");
        }
        
        await m.reply(`
*🎵 Título:* ${title}
*⏳ Duración:* ${video.timestamp}
*🔗 Enlace:* ${audioURL}

Descargando audio, espera un momento...
`);

        const audioStream = ytdl(audioURL, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });

        const tempDir = join(tmpdir(), 'Naruto-Bot');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        filePath = join(tempDir, `${Date.now()}_${title}.mp3`);
        
        await new Promise((resolve, reject) => {
            const writeStream = createWriteStream(filePath);
            audioStream.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        
        await conn.sendMessage(m.chat, {
            audio: { url: filePath },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`
        });

    } catch (e) {
        console.error("Error en .play:", e);
        m.reply("❌ Ocurrió un error al reproducir el audio. Por favor, intenta de nuevo más tarde.");
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            try {
                unlinkSync(filePath);
            } catch (cleanupError) {
                console.error("Error al eliminar el archivo temporal:", cleanupError);
            }
        }
    }
}
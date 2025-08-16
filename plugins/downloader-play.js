import fetch from "node-fetch";
import yts from "yt-search";
import ytdl from "ytdl-core";
import { join } from 'path';
import { tmpdir } from 'os';
import { createWriteStream } from 'fs';

const ytIdRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const toSansSerifPlain = (text = "") =>
  text.split("").map((char) => {
    const map = {
      a: "𝖺", b: "𝖻", c: "𝖼", d: "𝖽", e: "𝖾", f: "𝖿", g: "𝗀", h: "𝗁", i: "𝗂",
      j: "𝗃", k: "𝗄", l: "𝗅", m: "𝗆", n: "𝗇", o: "𝗈", p: "𝗉", q: "𝗊", r: "𝗋",
      s: "𝗌", t: "𝗍", u: "𝗎", v: "𝗏", w: "𝗐", x: "𝗑", y: "𝗒", z: "𝗓",
      A: "𝖠", B: "𝖡", C: "𝖢", D: "𝖣", E: "𝖤", F: "𝖥", G: "𝖦", H: "𝖧", I: "𝖨",
      J: "𝖩", K: "𝖪", L: "𝖫", M: "𝖬", N: "𝖭", O: "𝖮", P: "𝖯", Q: "𝖰", R: "𝖱",
      S: "𝖲", T: "𝖳", U: "𝖴", V: "𝖵", W: "𝖶", X: "𝖷", Y: "𝖸", Z: "𝖹",
      0: "𝟢", 1: "𝟣", 2: "𝟤", 3: "𝟥", 4: "𝟦", 5: "𝟧", 6: "𝟨", 7: "𝟩", 8: "𝟪", 9: "𝟫"
    };
    return map[char] || char;
  }).join("");

const formatViews = (views) => {
  if (!views) return "Desconocido";
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k`;
  return views.toString();
};

// **Inicio de la lógica de optimización y cola**
const requestQueue = [];
let isProcessing = false;
const audioCache = new Map();

const processQueue = async (conn) => {
    if (requestQueue.length === 0 || isProcessing) return;
    isProcessing = true;

    const { m, video } = requestQueue.shift();

    try {
        const { title, timestamp, views, url, thumbnail, author, ago } = video;
        const cacheKey = url;

        const caption = [
            "✧─── ･ ｡ﾟ★: *.✦ .* :★. ───✧",
            "⧼ ᰔᩚ ⧽  M U S I C  -  Y O U T U B E",
            "",
            `» ✧ « *${title}*`,
            `> ➩ Canal › *${author.name}*`,
            `> ➩ Duración › *${timestamp}*`,
            `> ➩ Vistas › *${formatViews(views)}*`,
            `> ➩ Publicado › *${ago || "desconocido"}*`,
            `> ➩ Link › *${url}*`,
            "",
            `> ✰ Descargando audio, espera... ✧\n(Quedan ${requestQueue.length} en la cola)`
        ].join("\n");

        await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption }, { quoted: m });

        if (audioCache.has(cacheKey)) {
            await conn.sendMessage(m.chat, {
                audio: audioCache.get(cacheKey),
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: m });
        } else {
            const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
            const tempFilePath = join(tmpdir(), `${title}.mp3`);
            const writeStream = createWriteStream(tempFilePath);
            audioStream.pipe(writeStream);

            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                audioStream.on('error', reject);
            });

            const audioBuffer = Buffer.from(require('fs').readFileSync(tempFilePath));
            audioCache.set(cacheKey, audioBuffer);
            
            await conn.sendMessage(m.chat, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: m });
        }
    } catch (err) {
        console.error("Error al procesar la cola:", err);
        await m.reply(toSansSerifPlain(`❌ Ocurrió un error al reproducir el audio:\n${err.message}`));
    } finally {
        isProcessing = false;
        processQueue(conn); // Procesa el siguiente elemento en la cola
    }
};

const handler = async (m, { conn, text }) => {
  if (!text) return m.reply(toSansSerifPlain("✦ Ingresa el nombre o link de un video."));

  try {
    await conn.sendMessage(m.chat, { react: { text: "🕐", key: m.key } });

    const ytId = ytIdRegex.exec(text);
    const search = ytId ? await yts({ videoId: ytId[1] }) : await yts(text);
    const video = ytId ? search.video : search.all[0];

    if (!video) throw new Error("No se encontró el video.");

    requestQueue.push({ m, video });
    processQueue(conn);

  } catch (err) {
    console.error("Error en .play:", err);
    await m.reply(toSansSerifPlain(`❌ Ocurrió un error al buscar el video:\n${err.message}`));
  }
};

handler.command = ["play", "pla"];
handler.register = true;
export default handler;
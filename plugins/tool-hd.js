import fetch from 'node-fetch'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

export const command = ['remini', 'hd', 'enhance']
export const tags = ['tools']

const uploadImage = async (buffer) => {
    const { ext } = await fileTypeFromBuffer(buffer)
    const form = new FormData()
    form.append('file', buffer, `image.${ext}`)

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: form
    })
    const json = await res.json()
    return json.data.url
}

export async function handler(conn, m) {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (!/image\/(jpe?g|png)/.test(mime)) {
        return conn.sendMessage(m.chat, {
            text: '❌ Por favor, envía una imagen o responde a una imagen para mejorarla.'
        }, { quoted: m })
    }

    try {
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        const buffer = await q.download()
        const imageUrl = await uploadImage(buffer)

        // API para mejorar la imagen
        const apiUrl = `https://api.itsrose.life/image/enhance?url=${encodeURIComponent(imageUrl)}`
        
        const res = await fetch(apiUrl)
        const improvedImage = await res.buffer()

        await conn.sendMessage(m.chat, {
            image: improvedImage,
            caption: '✅ *Imagen mejorada con éxito.*'
        }, { quoted: m })

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        await conn.sendMessage(m.chat, { react: { text: '✖️', key: m.key } })
        await conn.sendMessage(m.chat, {
            text: '❌ Ocurrió un error al mejorar la imagen. Inténtalo de nuevo más tarde.'
        }, { quoted: m })
    }
}
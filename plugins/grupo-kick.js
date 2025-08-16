// kick.js
export const name = 'kick'
export const command = ['kick', 'expulsar']
export const tags = ['group']
export const group = true
export const admin = true
export const botAdmin = true

export async function call(m, { conn, participants, isAdmin: isUserAdmin, isBotAdmin: isBotGroupAdmin }) {
    if (!m.isGroup) {
        return m.reply('Este jutsu solo se puede usar en la aldea.')
    }

    if (!isUserAdmin) {
        return m.reply('🔒 Este jutsu solo puede ser usado por un Jōnin de Élite.')
    }

    if (!isBotGroupAdmin) {
        return m.reply('El bot debe ser Jōnin para ejecutar este jutsu.')
    }

    const userToKick = m.mentionedJid[0] || m.quoted?.sender || null
    if (!userToKick) {
        return m.reply('Por favor, etiqueta al Shinobi que deseas expulsar.')
    }
    
    // Verifica si está intentando expulsar al dueño del grupo
    const groupMetadata = await conn.groupMetadata(m.chat)
    if (groupMetadata.owner === userToKick) {
        return m.reply('No puedes desterrar al dueño de la aldea.')
    }
    
    // Verifica si está intentando expulsarse a sí mismo
    if (userToKick === m.sender) {
        return m.reply('No puedes desterrarte a ti mismo, ¿estás bien? 🤕')
    }
    
    // Verifica si está intentando desterrar a otro administrador
    const targetUser = participants.find(p => p.id === userToKick)
    if (targetUser && targetUser.admin === 'admin') {
        return m.reply('No puedo desterrar a un compañero Jōnin de Élite.')
    }

    const userId = userToKick.split('@')[0]
    
    try {
        await conn.groupParticipantsUpdate(m.chat, [userToKick], 'remove')
        m.reply(`✅ El Shinobi @${userId} ha sido desterrado de la aldea.`, null, { mentions: [userToKick] })
    } catch (e) {
        console.error(e)
        m.reply('⚠️ Algo salió mal. Puede que no tenga los permisos necesarios o el usuario no existe.')
    }
}
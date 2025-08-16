// kick.js
export const name = 'kick';
export const command = ['kick', 'expulsar'];
export const tags = ['group'];
export const group = true;
export const admin = true;
export const botAdmin = true;

export async function handler(m, { conn, participants, isAdmin, isBotAdmin, mentionedJid, quoted }) {
    if (!m.isGroup) {
        return m.reply('Este jutsu solo se puede usar en la aldea.');
    }

    if (!isAdmin) {
        return m.reply('🔒 Este jutsu solo puede ser usado por un Jōnin de Élite.');
    }

    if (!isBotAdmin) {
        return m.reply('El bot debe ser Jōnin para ejecutar este jutsu.');
    }
    
    const userToKick = mentionedJid[0] || quoted?.sender || null;

    if (!userToKick) {
        return m.reply('Por favor, etiqueta al Shinobi que deseas expulsar.');
    }

    const targetUser = participants.find(p => p.id === userToKick);

    if (!targetUser) {
        return m.reply('El usuario que intentas expulsar no se encuentra en este grupo.');
    }

    // Comprueba si se está intentando expulsar al dueño del grupo
    const groupMetadata = await conn.groupMetadata(m.chat);
    if (groupMetadata.owner === userToKick) {
        return m.reply('No puedes desterrar al dueño de la aldea.');
    }

    // Comprueba si se está intentando expulsar a otro administrador
    if (targetUser.admin === 'admin') {
        return m.reply('No puedo desterrar a un compañero Jōnin de Élite.');
    }

    // Comprueba si se está intentando expulsar al propio bot o a sí mismo
    if (userToKick === conn.user.jid || userToKick === m.sender) {
        return m.reply('No puedes desterrarte a ti mismo o al bot, ¿estás bien? 🤕');
    }

    try {
        const response = await conn.groupParticipantsUpdate(m.chat, [userToKick], 'remove');

        if (response[0].status === '200') {
            const userId = userToKick.split('@')[0];
            m.reply(`✅ El Shinobi @${userId} ha sido desterrado de la aldea.`, null, { mentions: [userToKick] });
        } else {
            console.error(response);
            m.reply('⚠️ El bot no pudo expulsar a ese usuario. Posiblemente no tenga los permisos suficientes.');
        }

    } catch (e) {
        console.error(e);
        m.reply('❌ Ocurrió un error inesperado. Asegúrate de que el usuario exista y el bot sea administrador.');
    }
}
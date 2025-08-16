import { isNumber } from 'util'

var handler = async (m, { conn, args }) => {
    // 1. Validar que el comando se use en un grupo
    if (!m.isGroup) {
        return m.reply('❌ Este comando solo se puede usar en grupos.');
    }

    const groupMetadata = await conn.groupMetadata(m.chat);
    const botParticipant = groupMetadata.participants.find(p => p.id === conn.user.jid);
    const userParticipant = groupMetadata.participants.find(p => p.id === m.sender);

    // 2. Validar que el bot y el usuario tengan permisos de administrador
    const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
    const isUserAdmin = userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin';

    if (!isBotAdmin) {
        return m.reply('❌ No soy administrador, no puedo expulsar miembros.');
    }
    if (!isUserAdmin) {
        return m.reply('❌ Solo los administradores del grupo pueden usar este comando.');
    }

    // 3. Identificar al usuario a expulsar
    let userToKick;
    if (m.mentionedJid && m.mentionedJid[0]) {
        userToKick = m.mentionedJid[0];
    } else if (m.quoted) {
        userToKick = m.quoted.sender;
    } else if (args[0]) {
        const number = args[0].replace(/[^0-9]/g, '');
        if (!number || !isNumber(parseInt(number))) {
            return m.reply('⚠️ Número inválido. Por favor, ingresa un número de teléfono válido sin el +.');
        }
        userToKick = number + '@s.whatsapp.net';
    } else {
        return m.reply('🚫 Menciona, responde a un mensaje o escribe el número de alguien para expulsarlo.');
    }

    // 4. Validar que no se pueda expulsar al bot, al dueño del grupo o al creador del bot.
    const ownerGroup = groupMetadata.owner || m.chat.split`-`[0] + '@s.whatsapp.net';
    const botOwner = global.owner[0][0] + '@s.whatsapp.net'; // Asumiendo que el dueño está en global.owner

    if (userToKick === conn.user.jid) {
        return m.reply('😂 No me puedo expulsar a mí mismo.');
    }
    if (userToKick === ownerGroup) {
        return m.reply('Ese es el dueño del grupo, no lo puedo expulsar.');
    }
    if (userToKick === botOwner) {
        return m.reply('No puedo expulsar al creador del bot.');
    }

    // 5. Expulsar al usuario y manejar la respuesta
    try {
        await conn.groupParticipantsUpdate(m.chat, [userToKick], 'remove');
        await m.reply(`✅ Se ha expulsado al usuario.`);
    } catch (e) {
        console.error(e);
        await m.reply(`❌ No pude expulsar al usuario. Asegúrate de que no es un administrador.`);
    }
};

handler.help = ['kick'];
handler.tags = ['group'];
handler.command = ['kick','echar','hechar','sacar','ban'];
handler.admin = true; // Ahora el comando requiere permisos de admin
handler.botAdmin = true; // El bot necesita ser admin

export default handler;
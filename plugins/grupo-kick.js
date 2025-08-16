var handler = async (m, { conn, args }) => {
    if (!m.isGroup) return m.reply('🔒 Este comando solo se usa en grupos.');

    const groupMetadata = await conn.groupMetadata(m.chat);

    // Debug: mostrar participantes y sus roles en consola
    console.log('🔎 Participantes del grupo:');
    groupMetadata.participants.forEach(p => {
        console.log(`- ${p.id} admin: ${p.admin || 'miembro'}`);
    });

    // Buscar info del usuario que manda el comando
    const userParticipant = groupMetadata.participants.find(p => p.id === m.sender);

    console.log('🔎 Info usuario que manda:', userParticipant);

    // Número del creador del bot (Owner)
    const botOwner = '595984495031@s.whatsapp.net';

    // Check si es admin, superadmin o el owner del bot
    const isUserAdmin = userParticipant?.admin === 'admin' || 
                        userParticipant?.admin === 'superadmin' || 
                        m.sender === groupMetadata.owner || 
                        m.sender === botOwner; // <-- Owner puede ejecutar sin admin

    if (!isUserAdmin) {
        return m.reply('❌ Solo los admins o el creador del bot pueden usar este comando.');
    }

    // Obtener usuario a expulsar
    let user;
    if (m.mentionedJid && m.mentionedJid[0]) {
        user = m.mentionedJid[0];
    } else if (m.quoted) {
        user = m.quoted.sender;
    } else if (args[0]) {
        const number = args[0].replace(/[^0-9]/g, '');
        if (!number) return m.reply('⚠️ Número inválido.');
        user = number + '@s.whatsapp.net';
    } else {
        return m.reply('🚫 Mencioná, respondé o escribí un número para expulsar.');
    }

    const ownerGroup = groupMetadata.owner || m.chat.split`-`[0] + '@s.whatsapp.net';

    if (user === conn.user.jid) return m.reply(`😂 Calma no me puedo sacar yo mismo`);
    if (user === ownerGroup) return m.reply(`Ese es el dueño del grupo, no lo eliminaré`);
    if (user === botOwner) return m.reply(`Que piensas? ¿qué sacaré al dueño del bot?`);

    try {
        await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
        await m.reply(`Se nos fue el User :c JJAJAJAJ`);
    } catch (e) {
        await m.reply(`No pude expulsar al usuario. Puede que no sea admin o que no tenga permisos.`);
    }
};

handler.help = ['kick'];
handler.tags = ['group'];
handler.command = ['kick','echar','hechar','sacar','ban'];
handler.register = false;

export default handler;
const isAdmin = require('../lib/isAdmin');
const S = require('../lib/style');

async function tagNotAdminCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Please make the bot an admin first.') }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only admins can use the .tagnotadmin command.') }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        const nonAdmins = participants.filter(p => !p.admin).map(p => p.id);
        if (nonAdmins.length === 0) {
            await sock.sendMessage(chatId, { text: S.info('TAG', '⚠️ No non-admin members to tag.') }, { quoted: message });
            return;
        }

        const mentionLines = [];
        nonAdmins.forEach(jid => {
            mentionLines.push(`@${jid.split('@')[0]}`);
        });
        const text = S.panel({
            title: 'TAG NON-ADMINS',
            icon: '🔊',
            lines: [
                '🎤 *Hello Everyone:*',
                ...mentionLines,
            ],
        });

        await sock.sendMessage(chatId, { text, mentions: nonAdmins }, { quoted: message });
    } catch (error) {
        console.error('Error in tagnotadmin command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to tag non-admin members.') }, { quoted: message });
    }
}

module.exports = tagNotAdminCommand;



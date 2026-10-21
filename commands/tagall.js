const isAdmin = require('../lib/isAdmin');  // Move isAdmin to helpers
const S = require('../lib/style');

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Please make the bot an admin first.') }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only group admins can use the .tagall command.') }, { quoted: message });
            return;
        }

        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { text: S.error('ERROR', 'No participants found in the group.') });
            return;
        }

        // Create message with each member on a new line
        const mentionLines = [];
        participants.forEach(participant => {
            mentionLines.push(`@${participant.id.split('@')[0]}`); // Add new line entry
        });
        const messageText = S.panel({
            title: 'TAG ALL',
            icon: '🔊',
            lines: [
                '🎤 *Hello Everyone:*',
                ...mentionLines,
            ],
        });

        // Send message with mentions
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: participants.map(p => p.id)
        });

    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to tag all members.') });
    }
}

module.exports = tagAllCommand;  // Export directly

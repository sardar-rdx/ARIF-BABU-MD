const { handleAntiBadwordCommand } = require('../lib/antibadword');
const isAdminHelper = require('../lib/isAdmin');
const S = require('../lib/style');

async function antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only group admins can use this command.') }, { quoted: message });
            return;
        }

        // Extract match from message
        const text = message.message?.conversation || 
                    message.message?.extendedTextMessage?.text || '';
        const match = text.split(' ').slice(1).join(' ');

        await handleAntiBadwordCommand(sock, chatId, message, match);
    } catch (error) {
        console.error('Error in antibadword command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Error processing antibadword command!') }, { quoted: message });
    }
}

module.exports = antibadwordCommand; 
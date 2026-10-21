const settings = require("../settings");
const S = require('../lib/style');
async function aliveCommand(sock, chatId, message) {
    try {
        const message1 = S.panel({
            title: 'ALIVE',
            icon: '🤖',
            fields: [
                { icon: '🏷️', label: 'Version', value: settings.version },
                { icon: '📶', label: 'Status', value: 'Online' },
                { icon: '🎛️', label: 'Mode', value: 'Public' },
            ],
            lines: ['🌟 Features:'],
            bullets: [
                'Group Management',
                'Antilink Protection',
                'Fun Commands',
                'And more!',
            ],
            footer: S.credit(),
            signature: 'Type .menu for full command list',
        });

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363400900650126@newsletter',
                    newsletterName: 'RDX BOT MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: S.success('ALIVE', 'Bot is alive and running!') }, { quoted: message });
    }
}

module.exports = aliveCommand;
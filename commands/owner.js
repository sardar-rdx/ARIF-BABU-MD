const settings = require('../settings');
const S = require('../lib/style');

async function ownerCommand(sock, chatId) {
    const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${settings.botOwner}
TEL;waid=${settings.ownerNumber}:${settings.ownerNumber}
END:VCARD
`;

    await sock.sendMessage(chatId, {
        text: S.panel({
            title: 'BOT OWNER',
            icon: '👑',
            fields: [
                { icon: '👤', label: 'Name', value: settings.botOwner },
                { icon: '📱', label: 'Number', value: settings.ownerNumber },
            ],
            footer: S.credit(),
        }),
    });

    await sock.sendMessage(chatId, {
        contacts: { displayName: settings.botOwner, contacts: [{ vcard }] },
    });
}

module.exports = ownerCommand;

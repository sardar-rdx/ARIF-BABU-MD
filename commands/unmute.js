const S = require('../lib/style');

async function unmuteCommand(sock, chatId) {
    await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute the group
    await sock.sendMessage(chatId, { text: S.success('SUCCESS', 'The group has been unmuted.') });
}

module.exports = unmuteCommand;

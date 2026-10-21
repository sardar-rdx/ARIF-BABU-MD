const fs = require('fs');
const path = require('path');
const S = require('../lib/style');

const warningsFilePath = path.join(__dirname, '../data/warnings.json');

function loadWarnings() {
    if (!fs.existsSync(warningsFilePath)) {
        fs.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
    }
    const data = fs.readFileSync(warningsFilePath, 'utf8');
    return JSON.parse(data);
}

async function warningsCommand(sock, chatId, mentionedJidList) {
    const warnings = loadWarnings();

    if (mentionedJidList.length === 0) {
        await sock.sendMessage(chatId, { text: S.usagePanel('.warnings @user', '✘ Please mention a user to check warnings.') });
        return;
    }

    const userToCheck = mentionedJidList[0];
    const warningCount = warnings[userToCheck] || 0;

    await sock.sendMessage(chatId, { text: S.panel({
        title: 'WARNINGS',
        icon: '⚠️',
        fields: [
            { icon: '➜', label: 'Warnings', value: warningCount },
        ],
        footer: S.credit(),
    }) });
}

module.exports = warningsCommand;

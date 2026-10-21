const fs = require('fs');
const path = require('path');
const S = require('../lib/style');

const dataFilePath = path.join(__dirname, '..', 'data', 'messageCount.json');

function loadMessageCounts() {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath);
        return JSON.parse(data);
    }
    return {};
}

function saveMessageCounts(messageCounts) {
    fs.writeFileSync(dataFilePath, JSON.stringify(messageCounts, null, 2));
}

function incrementMessageCount(groupId, userId) {
    const messageCounts = loadMessageCounts();

    if (!messageCounts[groupId]) {
        messageCounts[groupId] = {};
    }

    if (!messageCounts[groupId][userId]) {
        messageCounts[groupId][userId] = 0;
    }

    messageCounts[groupId][userId] += 1;

    saveMessageCounts(messageCounts);
}

function topMembers(sock, chatId, isGroup) {
    if (!isGroup) {
        sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ This command is only available in group chats.') });
        return;
    }

    const messageCounts = loadMessageCounts();
    const groupCounts = messageCounts[chatId] || {};

    const sortedMembers = Object.entries(groupCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); // Get top 5 members

    if (sortedMembers.length === 0) {
        sock.sendMessage(chatId, { text: S.info('TOP MEMBERS', '⚠️ No message activity recorded yet.') });
        return;
    }

    const memberLines = [];
    sortedMembers.forEach(([userId, count], index) => {
        memberLines.push(`${index + 1}. @${userId.split('@')[0]} - ${count} messages`);
    });
    const message = S.panel({
        title: 'TOP MEMBERS',
        icon: '🏆',
        lines: [
            '🏆 Top Members Based on Message Count:',
            ...memberLines,
        ],
        footer: S.credit(),
    });

    sock.sendMessage(chatId, { text: message, mentions: sortedMembers.map(([userId]) => userId) });
}

module.exports = { incrementMessageCount, topMembers };

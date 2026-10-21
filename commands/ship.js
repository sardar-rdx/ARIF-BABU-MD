const S = require('../lib/style');

async function shipCommand(sock, chatId, msg, groupMetadata) {
    try {
        // Get all participants from the group
        const participants = await sock.groupMetadata(chatId);
        const ps = participants.participants.map(v => v.id);
        
        // Get two random participants
        let firstUser, secondUser;
        
        // Select first random user
        firstUser = ps[Math.floor(Math.random() * ps.length)];
        
        // Select second random user (different from first)
        do {
            secondUser = ps[Math.floor(Math.random() * ps.length)];
        } while (secondUser === firstUser);

        // Format the mentions
        const formatMention = id => '@' + id.split('@')[0];

        // Create and send the ship message
        await sock.sendMessage(chatId, {
            text: S.panel({
                title: 'SHIP',
                icon: '💖',
                lines: [
                    `${formatMention(firstUser)} ❤️ ${formatMention(secondUser)}`,
                    '',
                    'Congratulations 💖🍻',
                ],
            }),
            mentions: [firstUser, secondUser]
        });

    } catch (error) {
        console.error('Error in ship command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', '❌ Failed to ship! Make sure this is a group.') });
    }
}

module.exports = shipCommand; 
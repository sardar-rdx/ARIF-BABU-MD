const fetch = require('node-fetch');
const S = require('../lib/style');

async function truthCommand(sock, chatId, message) {
    try {
        const shizokeys = 'shizo';
        const res = await fetch(`https://shizoapi.onrender.com/api/texts/truth?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const truthMessage = json.result;

        // Send the truth message
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'TRUTH',
            icon: '🤔',
            lines: [truthMessage],
            footer: S.credit(),
        }) }, { quoted: message });
    } catch (error) {
        console.error('Error in truth command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to get truth. Please try again later!') }, { quoted: message });
    }
}

module.exports = { truthCommand };

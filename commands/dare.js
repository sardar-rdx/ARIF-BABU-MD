const fetch = require('node-fetch');
const S = require('../lib/style');

async function dareCommand(sock, chatId, message) {
    try {
        const shizokeys = 'shizo';
        const res = await fetch(`https://shizoapi.onrender.com/api/texts/dare?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const dareMessage = json.result;

        // Send the dare message
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'DARE',
            icon: '😈',
            lines: [dareMessage],
        }) }, { quoted: message });
    } catch (error) {
        console.error('Error in dare command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to get dare. Please try again later!') }, { quoted: message });
    }
}

module.exports = { dareCommand };

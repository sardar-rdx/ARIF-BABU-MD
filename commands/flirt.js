const fetch = require('node-fetch');
const S = require('../lib/style');

async function flirtCommand(sock, chatId, message) {
    try {
        const shizokeys = 'shizo';
        const res = await fetch(`https://shizoapi.onrender.com/api/texts/flirt?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const flirtMessage = json.result;

        // Send the flirt message
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'FLIRT',
            icon: '😘',
            lines: [flirtMessage]
        }) }, { quoted: message });
    } catch (error) {
        console.error('Error in flirt command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to get flirt message. Please try again later!') }, { quoted: message });
    }
}

module.exports = { flirtCommand }; 

const fetch = require('node-fetch');
const S = require('../lib/style');

async function rosedayCommand(sock, chatId, message) {
    try {
        
        const res = await fetch(`https://api.princetechn.com/api/fun/roseday?apikey=prince`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const rosedayMessage = S.panel({
            title: 'ROSE DAY',
            icon: '🌹',
            lines: [json.result],
        });

        // Send the roseday message
        await sock.sendMessage(chatId, { text: rosedayMessage }, { quoted: message });
    } catch (error) {
        console.error('Error in roseday command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', '❌ Failed to get roseday quote! Try again later.') }, { quoted: message });
    }
}

module.exports = { rosedayCommand };

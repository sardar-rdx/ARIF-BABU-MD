const fetch = require('node-fetch');
const S = require('../lib/style');

async function shayariCommand(sock, chatId, message) {
    try {
        const response = await fetch('https://shizoapi.onrender.com/api/texts/shayari?apikey=shizo');
        const data = await response.json();
        
        if (!data || !data.result) {
            throw new Error('Invalid response from API');
        }

        const buttons = [
            { buttonId: '.shayari', buttonText: { displayText: 'Shayari 🪄' }, type: 1 },
            { buttonId: '.roseday', buttonText: { displayText: '🌹 RoseDay' }, type: 1 }
        ];

        await sock.sendMessage(chatId, { 
            text: S.panel({
                title: 'SHAYARI',
                icon: '🪄',
                lines: [data.result],
            }),
            buttons: buttons,
            headerType: 1
        }, { quoted: message });
    } catch (error) {
        console.error('Error in shayari command:', error);
        await sock.sendMessage(chatId, { 
            text: S.error('ERROR', '❌ Failed to fetch shayari! Try again later.'),
        }, { quoted: message });
    }
}

module.exports = { shayariCommand }; 
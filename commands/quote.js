const fetch = require('node-fetch');
const S = require('../lib/style');

module.exports = async function quoteCommand(sock, chatId, message) {
    try {
        const shizokeys = 'shizo';
        const res = await fetch(`https://shizoapi.onrender.com/api/texts/quotes?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const quoteMessage = S.panel({
            title: 'QUOTE',
            icon: '💬',
            lines: [json.result],
        });

        // Send the quote message
        await sock.sendMessage(chatId, { text: quoteMessage }, { quoted: message });
    } catch (error) {
        console.error('Error in quote command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to get quote! Please try again later.') }, { quoted: message });
    }
};

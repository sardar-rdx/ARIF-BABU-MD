const axios = require('axios');
const S = require('../lib/style');

module.exports = async function (sock, chatId, message) {
    try {
        const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
        const fact = response.data.text;
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'FACT',
            icon: '🧠',
            lines: [fact]
        }) },{ quoted: message });
    } catch (error) {
        console.error('Error fetching fact:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Sorry, I could not fetch a fact right now.') },{ quoted: message });
    }
};

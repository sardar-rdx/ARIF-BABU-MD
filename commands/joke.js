const axios = require('axios');
const S = require('../lib/style');

module.exports = async function (sock, chatId) {
    try {
        const response = await axios.get('https://icanhazdadjoke.com/', {
            headers: { Accept: 'application/json' }
        });
        const joke = response.data.joke;
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'JOKE',
            icon: '😂',
            lines: [joke]
        }) });
    } catch (error) {
        console.error('Error fetching joke:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Sorry, I could not fetch a joke right now.') });
    }
};

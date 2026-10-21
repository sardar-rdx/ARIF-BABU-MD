const axios = require('axios');
const settings = require('../settings'); // Assuming the API key is stored here
const S = require('../lib/style');

async function gifCommand(sock, chatId, query) {
    const apiKey = settings.giphyApiKey; // Replace with your Giphy API Key

    if (!query) {
        await sock.sendMessage(chatId, { text: S.usage('USAGE', '✘ Please provide a search term for the GIF.') });
        return;
    }

    try {
        const response = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
            params: {
                api_key: apiKey,
                q: query,
                limit: 1,
                rating: 'g'
            }
        });

        const gifUrl = response.data.data[0]?.images?.downsized_medium?.url;

        if (gifUrl) {
            await sock.sendMessage(chatId, { video: { url: gifUrl }, caption: S.panel({
                title: 'GIF',
                icon: '🎞️',
                lines: [`Here is your GIF for "${query}"`]
            }) });
        } else {
            await sock.sendMessage(chatId, { text: S.error('ERROR', 'No GIFs found for your search term.') });
        }
    } catch (error) {
        console.error('Error fetching GIF:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to fetch GIF. Please try again later.') });
    }
}

module.exports = gifCommand;

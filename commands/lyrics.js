const fetch = require('node-fetch');
const S = require('../lib/style');

async function lyricsCommand(sock, chatId, songTitle, message) {
    if (!songTitle) {
        await sock.sendMessage(chatId, { 
            text: S.usagePanel('lyrics <song name>', '✘ Please enter the song name to get the lyrics!')
        },{ quoted: message });
        return;
    }

    try {
        // Use lyricsapi.fly.dev and return only the raw lyrics text
        const apiUrl = `https://lyricsapi.fly.dev/api/lyrics?q=${encodeURIComponent(songTitle)}`;
        const res = await fetch(apiUrl);
        
        if (!res.ok) {
            const errText = await res.text();
            throw errText;
        }
        
        const data = await res.json();

        const lyrics = data && data.result && data.result.lyrics ? data.result.lyrics : null;
        if (!lyrics) {
            await sock.sendMessage(chatId, {
                text: S.error('ERROR', `Sorry, I couldn't find any lyrics for "${songTitle}".`)
            },{ quoted: message });
            return;
        }

        const maxChars = 4096;
        const output = lyrics.length > maxChars ? lyrics.slice(0, maxChars - 3) + '...' : lyrics;

        await sock.sendMessage(chatId, { text: S.panel({
            title: 'LYRICS',
            icon: '🎵',
            lines: [output],
            maxLine: 4096,
            footer: S.credit()
        }) }, { quoted: message });
    } catch (error) {
        console.error('Error in lyrics command:', error);
        await sock.sendMessage(chatId, { 
            text: S.error('ERROR', `An error occurred while fetching the lyrics for "${songTitle}".`)
        },{ quoted: message });
    }
}

module.exports = { lyricsCommand };

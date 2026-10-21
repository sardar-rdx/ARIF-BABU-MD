const axios = require('axios');
const S = require('../lib/style');

async function spotifyCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const used = (rawText || '').split(/\s+/)[0] || '.spotify';
        const query = rawText.slice(used.length).trim();

        if (!query) {
            await sock.sendMessage(chatId, { text: S.usagePanel('.spotify con calma', '✘ Please provide a song, artist, or keywords!') }, { quoted: message });
            return;
        }

        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(apiUrl, { timeout: 20000, headers: { 'user-agent': 'Mozilla/5.0' } });

        if (!data?.status || !data?.result) {
            throw new Error('No result from Spotify API');
        }

        const r = data.result;
        const audioUrl = r.audio;
        if (!audioUrl) {
            await sock.sendMessage(chatId, { text: S.error('ERROR', '❌ No downloadable audio found for this query!') }, { quoted: message });
            return;
        }

        const caption = S.panel({
            title: 'SPOTIFY',
            icon: '🎵',
            fields: [
                { icon: '🎶', label: 'Title', value: `${r.title || r.name || 'Unknown Title'}` },
                { icon: '👤', label: 'Artist', value: `${r.artist || ''}` },
                { icon: '⏱', label: 'Duration', value: `${r.duration || ''}` },
                { icon: '🔗', label: 'Link', value: `${r.url || ''}` },
            ],
        }).trim();

         // Send cover and info as a follow-up (optional)
         if (r.thumbnails) {
            await sock.sendMessage(chatId, { image: { url: r.thumbnails }, caption }, { quoted: message });
        } else if (caption) {
            await sock.sendMessage(chatId, { text: caption }, { quoted: message });
        }
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${(r.title || r.name || 'track').replace(/[\\/:*?"<>|]/g, '')}.mp3`
        }, { quoted: message });

       

    } catch (error) {
        console.error('[SPOTIFY] error:', error?.message || error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', '❌ Failed to fetch Spotify audio! Try another query later.') }, { quoted: message });
    }
}

module.exports = spotifyCommand;

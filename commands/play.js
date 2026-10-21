const yts = require('yt-search');
const axios = require('axios');
const S = require('../lib/style');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: S.usagePanel('.play shape of you', '✘ Please provide a song name!')
            });
        }

        // Search for the song
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: S.error('ERROR', 'No songs found! Try a different search.')
            });
        }

        // Send loading message
        await sock.sendMessage(chatId, {
            text: S.panel({ title: 'DOWNLOAD', icon: '⏳', lines: ['⏳ Please wait, your download is in progress...'] })
        });

        // Get the first video result
        const video = videos[0];
        const urlYt = video.url;

        // Fetch audio data from API
        const response = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${urlYt}`);
        const data = response.data;

        if (!data || !data.status || !data.result || !data.result.downloadUrl) {
            return await sock.sendMessage(chatId, { 
                text: S.error('ERROR', 'Failed to fetch audio from the API! Try again later.')
            });
        }

        const audioUrl = data.result.downloadUrl;
        const title = data.result.title;

        // Send the audio
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: message });

    } catch (error) {
        console.error('Error in song2 command:', error);
        await sock.sendMessage(chatId, { 
            text: S.error('ERROR', 'Download failed! Please try again later.')
        });
    }
}

module.exports = playCommand; 

/*Powered by RDX-BOT*
*Credits to SARDAR RDX*`*/
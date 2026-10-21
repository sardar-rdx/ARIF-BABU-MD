const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { uploadImage } = require('../lib/uploadImage');
const S = require('../lib/style');

async function getQuotedOrOwnImageUrl(sock, message) {
    // 1) Quoted image (highest priority)
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return await uploadImage(buffer);
    }

    // 2) Image in the current message
    if (message.message?.imageMessage) {
        const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return await uploadImage(buffer);
    }

    return null;
}

module.exports = {
    name: 'removebg',
    alias: ['rmbg', 'nobg'],
    category: 'general',
    desc: 'Remove background from images',
    async exec(sock, message, args) {
        try {
            const chatId = message.key.remoteJid;
            let imageUrl = null;
            
            // Check if args contain a URL
            if (args.length > 0) {
                const url = args.join(' ');
                if (isValidUrl(url)) {
                    imageUrl = url;
                } else {
                    return sock.sendMessage(chatId, { 
                        text: S.usagePanel('.removebg https://example.com/image.jpg', '✘ Invalid URL provided!') 
                    }, { quoted: message });
                }
            } else {
                // Try to get image from message or quoted message
                imageUrl = await getQuotedOrOwnImageUrl(sock, message);
                
                if (!imageUrl) {
                    return sock.sendMessage(chatId, { 
                        text: S.panel({
                            title: 'REMOVEBG',
                            icon: '🖼️',
                            bullets: [
                                '.removebg <image_url>',
                                'Reply to an image with .removebg',
                                'Send image with .removebg',
                                'Example: .removebg https://example.com/image.jpg',
                            ],
                        }) 
                    }, { quoted: message });
                }
            }

        
            // Call the remove background API
            const apiUrl = `https://api.siputzx.my.id/api/iloveimg/removebg?image=${encodeURIComponent(imageUrl)}`;
            
            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30 second timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.status === 200 && response.data) {
                // Send the processed image
                await sock.sendMessage(chatId, {
                    image: response.data,
                    caption: S.success('SUCCESS', '✅ Background removed successfully!', {
                        footer: S.credit(),
                    })
                }, { quoted: message });
            } else {
                throw new Error('Failed to process image');
            }

        } catch (error) {
            console.error('RemoveBG Error:', error.message);
            
            let errorMessage = S.error('ERROR', '❌ Failed to remove background! Try again later.');
            
            if (error.response?.status === 429) {
                errorMessage = S.error('ERROR', '⏰ Rate limit exceeded! Please try again later.');
            } else if (error.response?.status === 400) {
                errorMessage = S.error('ERROR', '❌ Invalid image URL or format!');
            } else if (error.response?.status === 500) {
                errorMessage = S.error('ERROR', '🔧 Server error! Please try again later.');
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = S.error('ERROR', '⏰ Request timeout! Please try again.');
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                errorMessage = S.error('ERROR', '🌐 Network error! Please check your connection.');
            }
            
            await sock.sendMessage(chatId, { 
                text: errorMessage 
            }, { quoted: message });
        }
    }
};

// Helper function to validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

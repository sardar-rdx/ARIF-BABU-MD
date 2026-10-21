const fetch = require('node-fetch');
const S = require('../lib/style');

async function handleTranslateCommand(sock, chatId, message, match) {
    try {
        // Show typing indicator
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        let textToTranslate = '';
        let lang = '';

        // Check if it's a reply
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage) {
            // Get text from quoted message
            textToTranslate = quotedMessage.conversation || 
                            quotedMessage.extendedTextMessage?.text || 
                            quotedMessage.imageMessage?.caption || 
                            quotedMessage.videoMessage?.caption || 
                            '';

            // Get language from command
            lang = match.trim();
        } else {
            // Parse command arguments for direct message
            const args = match.trim().split(' ');
            if (args.length < 2) {
                return sock.sendMessage(chatId, {
                    text: S.panel({
                        title: 'USAGE',
                        icon: '📖',
                        lines: ['✘ Please provide text and language!'],
                        groups: [
                            {
                                name: '➜ Usage',
                                items: [
                                    '1. Reply to a message with: .translate <lang> or .trt <lang>',
                                    '2. Or type: .translate <text> <lang> or .trt <text> <lang>',
                                ],
                            },
                            {
                                name: '➜ Example',
                                items: [
                                    '.translate hello fr',
                                    '.trt hello fr',
                                ],
                            },
                            {
                                name: '➜ Language codes',
                                items: [
                                    'fr - French | es - Spanish | de - German',
                                    'it - Italian | pt - Portuguese | ru - Russian',
                                    'ja - Japanese | ko - Korean | zh - Chinese',
                                    'ar - Arabic | hi - Hindi',
                                ],
                            },
                        ],
                    }),
                    quoted: message
                });
            }

            lang = args.pop(); // Get language code
            textToTranslate = args.join(' '); // Get text to translate
        }

        if (!textToTranslate) {
            return sock.sendMessage(chatId, {
                text: S.error('ERROR', 'No text found to translate. Please provide text or reply to a message.'),
                quoted: message
            });
        }

        // Try multiple translation APIs in sequence
        let translatedText = null;
        let error = null;

        // Try API 1 (Google Translate API)
        try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(textToTranslate)}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data[0] && data[0][0] && data[0][0][0]) {
                    translatedText = data[0][0][0];
                }
            }
        } catch (e) {
            error = e;
        }

        // If API 1 fails, try API 2
        if (!translatedText) {
            try {
                const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${lang}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.responseData && data.responseData.translatedText) {
                        translatedText = data.responseData.translatedText;
                    }
                }
            } catch (e) {
                error = e;
            }
        }

        // If API 2 fails, try API 3
        if (!translatedText) {
            try {
                const response = await fetch(`https://api.dreaded.site/api/translate?text=${encodeURIComponent(textToTranslate)}&lang=${lang}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.translated) {
                        translatedText = data.translated;
                    }
                }
            } catch (e) {
                error = e;
            }
        }

        if (!translatedText) {
            throw new Error('All translation APIs failed');
        }

        // Send translation
        await sock.sendMessage(chatId, {
            text: S.panel({
                title: 'TRANSLATE',
                icon: '🌐',
                lines: [translatedText],
                footer: S.credit(),
            }),
        }, {
            quoted: message
        });

    } catch (error) {
        console.error('❌ Error in translate command:', error);
        await sock.sendMessage(chatId, {
            text: S.panel({
                title: 'ERROR',
                icon: '❌',
                lines: ['Failed to translate text. Please try again later.'],
                groups: [
                    {
                        name: '➜ Usage',
                        items: [
                            '1. Reply to a message with: .translate <lang> or .trt <lang>',
                            '2. Or type: .translate <text> <lang> or .trt <text> <lang>',
                        ],
                    },
                ],
            }),
            quoted: message
        });
    }
}

module.exports = {
    handleTranslateCommand
}; 
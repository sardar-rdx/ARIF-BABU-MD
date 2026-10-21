const axios = require('axios');
const { sleep } = require('../lib/myfunc');
const S = require('../lib/style');

async function pairCommand(sock, chatId, message, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, {
                text: S.usagePanel('.pair 91702395XXXX', '✘ Please provide a valid WhatsApp number!'),
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363400900650126@newsletter',
                        newsletterName: 'RDX BOT MD',
                        serverMessageId: -1
                    }
                }
            });
        }

        const numbers = q.split(',')
            .map((v) => v.replace(/[^0-9]/g, ''))
            .filter((v) => v.length > 5 && v.length < 20);

        if (numbers.length === 0) {
            return await sock.sendMessage(chatId, {
                text: S.error('ERROR', 'Invalid number! Please use the correct format.'),
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363400900650126@newsletter',
                        newsletterName: 'RDX BOT MD',
                        serverMessageId: -1
                    }
                }
            });
        }

        for (const number of numbers) {
            const whatsappID = number + '@s.whatsapp.net';
            const result = await sock.onWhatsApp(whatsappID);

            if (!result[0]?.exists) {
                return await sock.sendMessage(chatId, {
                    text: S.error('ERROR', 'That number is not registered on WhatsApp!'),
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363400900650126@newsletter',
                            newsletterName: 'RDX BOT MD',
                            serverMessageId: -1
                        }
                    }
                });
            }

            await sock.sendMessage(chatId, {
                text: S.panel({ title: 'PAIRING', icon: '⏳', lines: ['⏳ Please wait while your code is generated...'] }),
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363400900650126@newsletter',
                        newsletterName: 'RDX BOT MD',
                        serverMessageId: -1
                    }
                }
            });

            try {
                const response = await axios.get(`https://knight-bot-paircode.onrender.com/code?number=${number}`);
                
                if (response.data && response.data.code) {
                    const code = response.data.code;
                    if (code === "Service Unavailable") {
                        throw new Error('Service Unavailable');
                    }
                    
                    await sleep(5000);
                    await sock.sendMessage(chatId, {
                        text: S.success('SUCCESS', `Your pairing code: ${code}`),
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363400900650126@newsletter',
                                newsletterName: 'RDX BOT MD',
                                serverMessageId: -1
                            }
                        }
                    });
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (apiError) {
                console.error('API Error:', apiError);
                const errorMessage = apiError.message === 'Service Unavailable' 
                    ? S.error('ERROR', 'Service is currently unavailable! Try again later.')
                    : S.error('ERROR', 'Failed to generate pairing code! Try again later.');
                
                await sock.sendMessage(chatId, {
                    text: errorMessage,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363400900650126@newsletter',
                            newsletterName: 'RDX BOT MD',
                            serverMessageId: -1
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, {
            text: S.error('ERROR', 'An error occurred! Please try again later.'),
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363400900650126@newsletter',
                    newsletterName: 'RDX BOT MD',
                    serverMessageId: -1
                }
            }
        });
    }
}

module.exports = pairCommand; 
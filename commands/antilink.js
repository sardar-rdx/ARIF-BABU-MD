const { bots } = require('../lib/antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');
const S = require('../lib/style');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only group admins can use this command.') }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = S.panel({
                title: 'ANTILINK',
                icon: '⚡',
                bullets: [
                    `${prefix}antilink on`,
                    `${prefix}antilink set delete | kick | warn`,
                    `${prefix}antilink off`,
                ],
            });
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: S.info('ANTILINK', '⚠️ Antilink is already on') }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? S.success('SUCCESS', 'Antilink has been turned ON') : S.error('ERROR', 'Failed to turn on Antilink')
                },{ quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: S.info('ANTILINK', '⚠️ Antilink has been turned OFF') }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: S.usage('USAGE', '✘ Please specify an action:', {
                            bullets: [`${prefix}antilink set delete | kick | warn`],
                        })
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: S.error('ERROR', 'Invalid action. Choose delete, kick, or warn.')
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? S.success('SUCCESS', `Antilink action set to ${setAction}`) : S.error('ERROR', 'Failed to set Antilink action')
                }, { quoted: message });
                break;

            case 'get':
                const status = await getAntilink(chatId, 'on');
                const actionConfig = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: S.panel({
                        title: 'ANTILINK',
                        icon: '⚡',
                        fields: [
                            { icon: '📶', label: 'Status', value: status ? 'ON' : 'OFF' },
                            { icon: '⚙️', label: 'Action', value: actionConfig ? actionConfig.action : 'Not set' },
                        ],
                        footer: S.credit(),
                    })
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: S.usage('USAGE', `✘ Use ${prefix}antilink for usage.`) });
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Error processing antilink command') });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const antilinkSetting = getAntilinkSetting(chatId);
    if (antilinkSetting === 'off') return;

    console.log(`Antilink Setting for ${chatId}: ${antilinkSetting}`);
    console.log(`Checking message for links: ${userMessage}`);
    
    // Log the full message object to diagnose message structure
    console.log("Full message object: ", JSON.stringify(message, null, 2));

    let shouldDelete = false;

    const linkPatterns = {
        whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
        whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/i,
        telegram: /t\.me\/[A-Za-z0-9_]+/i,
        // Matches:
        // - Full URLs with protocol (http/https)
        // - URLs starting with www.
        // - Bare domains anywhere in the string, even when attached to text
        //   e.g., "helloinstagram.comworld" or "testhttps://x.com"
        allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i,
    };

    // Detect WhatsApp Group links
    if (antilinkSetting === 'whatsappGroup') {
        console.log('WhatsApp group link protection is enabled.');
        if (linkPatterns.whatsappGroup.test(userMessage)) {
            console.log('Detected a WhatsApp group link!');
            shouldDelete = true;
        }
    } else if (antilinkSetting === 'whatsappChannel' && linkPatterns.whatsappChannel.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'telegram' && linkPatterns.telegram.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'allLinks' && linkPatterns.allLinks.test(userMessage)) {
        shouldDelete = true;
    }

    if (shouldDelete) {
        const quotedMessageId = message.key.id; // Get the message ID to delete
        const quotedParticipant = message.key.participant || senderId; // Get the participant ID

        console.log(`Attempting to delete message with id: ${quotedMessageId} from participant: ${quotedParticipant}`);

        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
            });
            console.log(`Message with ID ${quotedMessageId} deleted successfully.`);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }

        const mentionedJidList = [senderId];
        await sock.sendMessage(chatId, { text: S.error('LINK DETECTED', `@${senderId.split('@')[0]}, posting links is not allowed.`), mentions: mentionedJidList });
    } else {
        console.log('No link detected or protection not enabled for this type of link.');
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};

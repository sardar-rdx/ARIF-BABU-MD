const { setAntitag, getAntitag, removeAntitag } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');
const S = require('../lib/style');

async function handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only group admins can use this command.') },{quoted :message});
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = S.panel({
                title: 'ANTITAG',
                icon: '⚡',
                bullets: [
                    `${prefix}antitag on`,
                    `${prefix}antitag set delete | kick`,
                    `${prefix}antitag off`,
                ],
            });
            await sock.sendMessage(chatId, { text: usage },{quoted :message});
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntitag(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: S.info('ANTITAG', '⚠️ Antitag is already on') },{quoted :message});
                    return;
                }
                const result = await setAntitag(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? S.success('SUCCESS', 'Antitag has been turned ON') : S.error('ERROR', 'Failed to turn on Antitag')
                },{quoted :message});
                break;

            case 'off':
                await removeAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { text: S.info('ANTITAG', '⚠️ Antitag has been turned OFF') },{quoted :message});
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: S.usage('USAGE', '✘ Please specify an action:', {
                            bullets: [`${prefix}antitag set delete | kick`],
                        })
                    },{quoted :message});
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: S.error('ERROR', 'Invalid action. Choose delete or kick.')
                    },{quoted :message});
                    return;
                }
                const setResult = await setAntitag(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? S.success('SUCCESS', `Antitag action set to ${setAction}`) : S.error('ERROR', 'Failed to set Antitag action')
                },{quoted :message});
                break;

            case 'get':
                const status = await getAntitag(chatId, 'on');
                const actionConfig = await getAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: S.panel({
                        title: 'ANTITAG',
                        icon: '⚡',
                        fields: [
                            { icon: '📶', label: 'Status', value: status ? 'ON' : 'OFF' },
                            { icon: '⚙️', label: 'Action', value: actionConfig ? actionConfig.action : 'Not set' },
                        ],
                        footer: S.credit(),
                    })
                },{quoted :message});
                break;

            default:
                await sock.sendMessage(chatId, { text: S.usage('USAGE', `✘ Use ${prefix}antitag for usage.`) },{quoted :message});
        }
    } catch (error) {
        console.error('Error in antitag command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Error processing antitag command') },{quoted :message});
    }
}

async function handleTagDetection(sock, chatId, message, senderId) {
    try {
        const antitagSetting = await getAntitag(chatId, 'on');
        if (!antitagSetting || !antitagSetting.enabled) return;

        // Get mentioned JIDs from contextInfo (proper mentions)
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        // Extract text from all possible message types
        const messageText = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        );

        // Find all @mentions in text using improved regex
        // Matches: @123456789, @⁨+91 70239 51514⁩, @~.., @217875470114951, etc.
        const textMentions = messageText.match(/@[\d+\s\-()~.]+/g) || [];
        
        // Also match numeric-only mentions (like @217875470114951)
        const numericMentions = messageText.match(/@\d{10,}/g) || [];
        
        // Combine all mentions and remove duplicates
        const allMentions = [...new Set([...mentionedJids, ...textMentions, ...numericMentions])];
        
        // Count unique numeric mentions (bot tagall patterns)
        const uniqueNumericMentions = new Set();
        numericMentions.forEach(mention => {
            const numMatch = mention.match(/@(\d+)/);
            if (numMatch) uniqueNumericMentions.add(numMatch[1]);
        });
        
        // Count mentions from mentionedJid array (proper WhatsApp mentions)
        const mentionedJidCount = mentionedJids.length;
        
        // Count unique numeric mentions found in text (bot tagall pattern)
        const numericMentionCount = uniqueNumericMentions.size;
        
        // Use the higher count (either proper mentions or text-based mentions)
        // This ensures we catch both standard mentions and bot tagall patterns
        const totalMentions = Math.max(mentionedJidCount, numericMentionCount);

        // Check if it's a group message and has multiple mentions
        if (totalMentions >= 3) {
            // Get group participants to check if it's tagging most/all members
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants || [];
            
            // If mentions are more than 50% of group members, consider it as tagall
            const mentionThreshold = Math.ceil(participants.length * 0.5);
            
            // Also check if there are many numeric mentions in the text (bot tagall pattern)
            // This catches bots that use numeric IDs instead of proper mentions
            const hasManyNumericMentions = numericMentionCount >= 10 || 
                                          (numericMentionCount >= 5 && numericMentionCount >= mentionThreshold);
            
            // Trigger if: standard mentions exceed threshold OR many numeric mentions detected
            if (totalMentions >= mentionThreshold || hasManyNumericMentions) {
                
                const action = antitagSetting.action || 'delete';
                
                if (action === 'delete') {
                    // Delete the message
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: message.key.id,
                            participant: senderId
                        }
                    });
                    
                    // Send warning
                    await sock.sendMessage(chatId, {
                        text: S.error('TAGALL DETECTED', 'Tagall Detected!')
                    }, { quoted: message });
                    
                } else if (action === 'kick') {
                    // First delete the message
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: message.key.id,
                            participant: senderId
                        }
                    });

                    // Then kick the user
                    await sock.groupParticipantsUpdate(chatId, [senderId], "remove");

                    // Send notification
                    const usernames = [`@${senderId.split('@')[0]}`];
                    await sock.sendMessage(chatId, {
                        text: S.error('ANTITAG DETECTED', `${usernames.join(', ')} has been kicked for tagging all members.`),
                        mentions: [senderId]
                    }, { quoted: message });
                }
            }
        }
    } catch (error) {
        console.error('Error in tag detection:', error);
    }
}

module.exports = {
    handleAntitagCommand,
    handleTagDetection
};


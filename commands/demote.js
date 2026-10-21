const isAdmin = require('../lib/isAdmin');
const S = require('../lib/style');

async function demoteCommand(sock, chatId, mentionedJids, message) {
    try {
        // First check if it's a group
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: S.restricted('RESTRICTED', '⚠️ This command can only be used in groups!')
            });
            return;
        }

        // Check admin status first, before any other operations
        try {
            const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
            
            if (!adminStatus.isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: S.restricted('RESTRICTED', '⚠️ Please make the bot an admin first to use this command.')
                });
                return;
            }

            if (!adminStatus.isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    text: S.restricted('RESTRICTED', '⚠️ Only group admins can use the demote command.')
                });
                return;
            }
        } catch (adminError) {
            console.error('Error checking admin status:', adminError);
            await sock.sendMessage(chatId, { 
                text: S.error('ERROR', '⚠️ Please make sure the bot is an admin of this group.')
            });
            return;
        }

        let userToDemote = [];
        
        // Check for mentioned users
        if (mentionedJids && mentionedJids.length > 0) {
            userToDemote = mentionedJids;
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToDemote = [message.message.extendedTextMessage.contextInfo.participant];
        }
        
        // If no user found through either method
        if (userToDemote.length === 0) {
            await sock.sendMessage(chatId, { 
                text: S.usage('USAGE', '✘ Please mention the user or reply to their message to demote!')
            });
            return;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.groupParticipantsUpdate(chatId, userToDemote, "demote");
        
        // Get usernames for each demoted user
        const usernames = await Promise.all(userToDemote.map(async jid => {
            return `@${jid.split('@')[0]}`;
        }));

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotionMessage = S.panel({
            title: 'GROUP DEMOTION',
            icon: '👑',
            fields: [
                { icon: '👥', label: `Demoted User${userToDemote.length > 1 ? 's' : ''}`, value: usernames.join(', ') },
                { icon: '🛡️', label: 'Demoted By', value: `@${message.key.participant ? message.key.participant.split('@')[0] : message.key.remoteJid.split('@')[0]}` },
                { icon: '📅', label: 'Date', value: new Date().toLocaleString() },
            ],
            footer: S.credit(),
        });
        
        await sock.sendMessage(chatId, { 
            text: demotionMessage,
            mentions: [...userToDemote, message.key.participant || message.key.remoteJid]
        });
    } catch (error) {
        console.error('Error in demote command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: S.error('ERROR', '⚠️ Rate limit reached. Please try again in a few seconds.')
                });
            } catch (retryError) {
                console.error('Error sending retry message:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: S.error('ERROR', 'Failed to demote user(s). Make sure the bot is admin and has sufficient permissions.')
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

// Function to handle automatic demotion detection
async function handleDemotionEvent(sock, groupId, participants, author) {
    try {
        // Safety check for participants
        if (!Array.isArray(participants) || participants.length === 0) {
            return;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get usernames for demoted participants
        const demotedUsernames = await Promise.all(participants.map(async jid => {
            // Handle case where jid might be an object or not a string
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]}`;
        }));

        let demotedBy;
        let mentionList = participants.map(jid => {
            // Ensure all mentions are proper JID strings
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            // Ensure author has the correct format
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            demotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            demotedBy = 'System';
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotionMessage = S.panel({
            title: 'GROUP DEMOTION',
            icon: '👑',
            fields: [
                { icon: '👥', label: `Demoted User${participants.length > 1 ? 's' : ''}`, value: demotedUsernames.join(', ') },
                { icon: '🛡️', label: 'Demoted By', value: demotedBy },
                { icon: '📅', label: 'Date', value: new Date().toLocaleString() },
            ],
            footer: S.credit(),
        });
        
        await sock.sendMessage(groupId, {
            text: demotionMessage,
            mentions: mentionList
        });
    } catch (error) {
        console.error('Error handling demotion event:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

module.exports = { demoteCommand, handleDemotionEvent };

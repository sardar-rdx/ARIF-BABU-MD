const fs = require('fs');
const path = require('path');
const os = require('os');
const isOwnerOrSudo = require('../lib/isOwner');
const S = require('../lib/style');

const channelInfo = {
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363400900650126@newsletter',
            newsletterName: 'RDX BOT MD',
            serverMessageId: -1
        }
    }
};

async function clearSessionCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: S.restricted('RESTRICTED', '⚠️ This command can only be used by the owner!'),
                ...channelInfo
            });
            return;
        }

        // Define session directory
        const sessionDir = path.join(__dirname, '../session');

        if (!fs.existsSync(sessionDir)) {
            await sock.sendMessage(chatId, { 
                text: S.error('ERROR', 'Session directory not found!'),
                ...channelInfo
            });
            return;
        }

        let filesCleared = 0;
        let errors = 0;
        let errorDetails = [];

        // Send initial status
        await sock.sendMessage(chatId, { 
            text: S.panel({
                title: 'OPTIMIZE',
                icon: '🔍',
                lines: ['⚙️ Optimizing session files for better performance...'],
            }),
            ...channelInfo
        });

        const files = fs.readdirSync(sessionDir);
        
        // Count files by type for optimization
        let appStateSyncCount = 0;
        let preKeyCount = 0;

        for (const file of files) {
            if (file.startsWith('app-state-sync-')) appStateSyncCount++;
            if (file.startsWith('pre-key-')) preKeyCount++;
        }

        // Delete files
        for (const file of files) {
            if (file === 'creds.json') {
                // Skip creds.json file
                continue;
            }
            try {
                const filePath = path.join(sessionDir, file);
                fs.unlinkSync(filePath);
                filesCleared++;
            } catch (error) {
                errors++;
                errorDetails.push(`Failed to delete ${file}: ${error.message}`);
            }
        }

        // Send completion message
        const message = S.panel({
            title: 'SESSION CLEAR',
            icon: '✅',
            fields: [
                { icon: '📁', label: 'Total files cleared', value: `${filesCleared}` },
                { icon: '🔄', label: 'App state sync files', value: `${appStateSyncCount}` },
                { icon: '🔑', label: 'Pre-key files', value: `${preKeyCount}` },
            ],
            lines: errors > 0 ? [`⚠️ Errors encountered: ${errors}`, errorDetails.join('\n')] : [],
            footer: S.credit(),
        });

        await sock.sendMessage(chatId, { 
            text: message,
            ...channelInfo
        });

    } catch (error) {
        console.error('Error in clearsession command:', error);
        await sock.sendMessage(chatId, { 
            text: S.error('ERROR', 'Failed to clear session files!'),
            ...channelInfo
        });
    }
}

module.exports = clearSessionCommand; 
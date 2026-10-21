const fs = require('fs');

function readJsonSafe(path, fallback) {
    try {
        const txt = fs.readFileSync(path, 'utf8');
        return JSON.parse(txt);
    } catch (_) {
        return fallback;
    }
}

const isOwnerOrSudo = require('../lib/isOwner');
const S = require('../lib/style');

async function settingsCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only the bot owner can use this command!') }, { quoted: message });
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        const dataDir = './data';

        const mode = readJsonSafe(`${dataDir}/messageCount.json`, { isPublic: true });
        const autoStatus = readJsonSafe(`${dataDir}/autoStatus.json`, { enabled: false });
        const autoread = readJsonSafe(`${dataDir}/autoread.json`, { enabled: false });
        const autotyping = readJsonSafe(`${dataDir}/autotyping.json`, { enabled: false });
        const pmblocker = readJsonSafe(`${dataDir}/pmblocker.json`, { enabled: false });
        const anticall = readJsonSafe(`${dataDir}/anticall.json`, { enabled: false });
        const userGroupData = readJsonSafe(`${dataDir}/userGroupData.json`, {
            antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: {}, antitag: {}
        });
        const autoReaction = Boolean(userGroupData.autoReaction);

        // Per-group features
        const groupId = isGroup ? chatId : null;
        const antilinkOn = groupId ? Boolean(userGroupData.antilink && userGroupData.antilink[groupId]) : false;
        const antibadwordOn = groupId ? Boolean(userGroupData.antibadword && userGroupData.antibadword[groupId]) : false;
        const welcomeOn = groupId ? Boolean(userGroupData.welcome && userGroupData.welcome[groupId]) : false;
        const goodbyeOn = groupId ? Boolean(userGroupData.goodbye && userGroupData.goodbye[groupId]) : false;
        const chatbotOn = groupId ? Boolean(userGroupData.chatbot && userGroupData.chatbot[groupId]) : false;
        const antitagCfg = groupId ? (userGroupData.antitag && userGroupData.antitag[groupId]) : null;

        const fields = [];
        const lines = [];
        fields.push({ icon: '🌐', label: 'Mode', value: mode.isPublic ? 'Public' : 'Private' });
        fields.push({ icon: '📢', label: 'Auto Status', value: autoStatus.enabled ? 'ON' : 'OFF' });
        fields.push({ icon: '👁️', label: 'Autoread', value: autoread.enabled ? 'ON' : 'OFF' });
        fields.push({ icon: '⌨️', label: 'Autotyping', value: autotyping.enabled ? 'ON' : 'OFF' });
        fields.push({ icon: '🚫', label: 'PM Blocker', value: pmblocker.enabled ? 'ON' : 'OFF' });
        fields.push({ icon: '📞', label: 'Anticall', value: anticall.enabled ? 'ON' : 'OFF' });
        fields.push({ icon: '💞', label: 'Reaction', value: autoReaction ? 'ON' : 'OFF' });
        if (groupId) {
            fields.push({ icon: '👥', label: 'Group', value: groupId });
            if (antilinkOn) {
                const al = userGroupData.antilink[groupId];
                fields.push({ icon: '🔗', label: 'Antilink', value: `ON (action: ${al.action || 'delete'})` });
            } else {
                fields.push({ icon: '🔗', label: 'Antilink', value: 'OFF' });
            }
            if (antibadwordOn) {
                const ab = userGroupData.antibadword[groupId];
                fields.push({ icon: '🚫', label: 'Antibadword', value: `ON (action: ${ab.action || 'delete'})` });
            } else {
                fields.push({ icon: '🚫', label: 'Antibadword', value: 'OFF' });
            }
            fields.push({ icon: '👋', label: 'Welcome', value: welcomeOn ? 'ON' : 'OFF' });
            fields.push({ icon: '🚶', label: 'Goodbye', value: goodbyeOn ? 'ON' : 'OFF' });
            fields.push({ icon: '🤖', label: 'Chatbot', value: chatbotOn ? 'ON' : 'OFF' });
            if (antitagCfg && antitagCfg.enabled) {
                fields.push({ icon: '🏷️', label: 'Antitag', value: `ON (action: ${antitagCfg.action || 'delete'})` });
            } else {
                fields.push({ icon: '🏷️', label: 'Antitag', value: 'OFF' });
            }
        } else {
            lines.push('💡 Note: Per-group settings show inside a group.');
        }

        const settingsText = S.panel({
            title: 'SETTINGS',
            icon: '⚙️',
            fields,
            lines,
            footer: S.credit(),
        });

        await sock.sendMessage(chatId, { text: settingsText }, { quoted: message });
    } catch (error) {
        console.error('Error in settings command:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', '❌ Failed to read settings!') }, { quoted: message });
    }
}

module.exports = settingsCommand;



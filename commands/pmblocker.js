const fs = require('fs');
const isOwnerOrSudo = require('../lib/isOwner');
const S = require('../lib/style');

const PMBLOCKER_PATH = './data/pmblocker.json';

const DEFAULT_PM_MESSAGE = S.panel({
    title: 'RESTRICTED',
    icon: '🔒',
    lines: [
        '⚠️ Direct messages are blocked!',
        'You cannot DM this bot.',
        'Please contact the owner in group chats only.',
    ],
});

function readState() {
    try {
        if (!fs.existsSync(PMBLOCKER_PATH)) return { enabled: false, message: DEFAULT_PM_MESSAGE };
        const raw = fs.readFileSync(PMBLOCKER_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return {
            enabled: !!data.enabled,
            message: typeof data.message === 'string' && data.message.trim() ? data.message : DEFAULT_PM_MESSAGE
        };
    } catch {
        return { enabled: false, message: DEFAULT_PM_MESSAGE };
    }
}

function writeState(enabled, message) {
    try {
        if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
        const current = readState();
        const payload = {
            enabled: !!enabled,
            message: typeof message === 'string' && message.trim() ? message : current.message
        };
        fs.writeFileSync(PMBLOCKER_PATH, JSON.stringify(payload, null, 2));
    } catch {}
}

async function pmblockerCommand(sock, chatId, message, args) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
    
    if (!message.key.fromMe && !isOwner) {
        await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only bot owner can use this command!') }, { quoted: message });
        return;
    }
    
    const argStr = (args || '').trim();
    const [sub, ...rest] = argStr.split(' ');
    const state = readState();

    if (!sub || !['on', 'off', 'status', 'setmsg'].includes(sub.toLowerCase())) {
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'PMBLOCKER',
            icon: '🔒',
            lines: ['⚠️ Owner only command'],
            bullets: [
                '.pmblocker on - Enable PM auto-block',
                '.pmblocker off - Disable PM blocker',
                '.pmblocker status - Show current status',
                '.pmblocker setmsg <text> - Set warning message',
            ],
        }) }, { quoted: message });
        return;
    }

    if (sub.toLowerCase() === 'status') {
        // Keep the status row readable when the stored message is the default panel.
        const messageValue = state.message === DEFAULT_PM_MESSAGE
            ? 'Default warning message'
            : String(state.message).replace(/\s*\n+\s*/g, ' ');
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'STATUS',
            icon: 'ℹ️',
            fields: [
                { icon: '🛡️', label: 'PM Blocker', value: state.enabled ? 'ON' : 'OFF' },
                { icon: '💬', label: 'Message', value: messageValue },
            ],
            footer: S.credit(),
        }) }, { quoted: message });
        return;
    }

    if (sub.toLowerCase() === 'setmsg') {
        const newMsg = rest.join(' ').trim();
        if (!newMsg) {
            await sock.sendMessage(chatId, { text: S.usagePanel('.pmblocker setmsg Do not DM the bot', '✘ Please provide a new warning message!') }, { quoted: message });
            return;
        }
        writeState(state.enabled, newMsg);
        await sock.sendMessage(chatId, { text: S.success('SUCCESS', 'PM Blocker message updated!') }, { quoted: message });
        return;
    }

    const enable = sub.toLowerCase() === 'on';
    writeState(enable);
    await sock.sendMessage(chatId, { text: S.success('SUCCESS', `PM Blocker is now ${enable ? 'ENABLED' : 'DISABLED'}.`) }, { quoted: message });
}

module.exports = { pmblockerCommand, readState };



const fs = require('fs');
const S = require('../lib/style');

const ANTICALL_PATH = './data/anticall.json';

function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false };
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return { enabled: !!data.enabled };
    } catch {
        return { enabled: false };
    }
}

function writeState(enabled) {
    try {
        if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
        fs.writeFileSync(ANTICALL_PATH, JSON.stringify({ enabled: !!enabled }, null, 2));
    } catch {}
}

async function anticallCommand(sock, chatId, message, args) {
    const state = readState();
    const sub = (args || '').trim().toLowerCase();

    if (!sub || (sub !== 'on' && sub !== 'off' && sub !== 'status')) {
        await sock.sendMessage(chatId, { text: S.usage('USAGE', '✘ Invalid or missing subcommand!', {
            bullets: [
                '.anticall on  - Enable auto-block on incoming calls',
                '.anticall off - Disable anticall',
                '.anticall status - Show current status',
            ],
        }) }, { quoted: message });
        return;
    }

    if (sub === 'status') {
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'ANTICALL',
            icon: 'ℹ️',
            fields: [
                { icon: '📶', label: 'Status', value: state.enabled ? 'ON' : 'OFF' },
            ],
            footer: S.credit(),
        }) }, { quoted: message });
        return;
    }

    const enable = sub === 'on';
    writeState(enable);
    await sock.sendMessage(chatId, { text: S.success('SUCCESS', `Anticall is now ${enable ? 'ENABLED' : 'DISABLED'}.`) }, { quoted: message });
}

module.exports = { anticallCommand, readState };



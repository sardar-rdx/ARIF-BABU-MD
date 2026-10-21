const settings = require('../settings');
const { addSudo, removeSudo, getSudoList } = require('../lib/index');
const isOwnerOrSudo = require('../lib/isOwner');
const S = require('../lib/style');

function extractMentionedJid(message) {
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned[0];
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const match = text.match(/\b(\d{7,15})\b/);
    if (match) return match[1] + '@s.whatsapp.net';
    return null;
}

async function sudoCommand(sock, chatId, message) {
    const senderJid = message.key.participant || message.key.remoteJid;
    const isOwner = message.key.fromMe || await isOwnerOrSudo(senderJid, sock, chatId);

    const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const args = rawText.trim().split(' ').slice(1);
    const sub = (args[0] || '').toLowerCase();

    if (!sub || !['add', 'del', 'remove', 'list'].includes(sub)) {
        await sock.sendMessage(chatId, { text: S.usage('USAGE', '✘ Invalid or missing subcommand!', {
            bullets: [
                '.sudo add <@user|number>',
                '.sudo del <@user|number>',
                '.sudo list',
            ],
        }) },{quoted :message});
        return;
    }

    if (sub === 'list') {
        const list = await getSudoList();
        if (list.length === 0) {
            await sock.sendMessage(chatId, { text: S.info('SUDO', '⚠️ No sudo users set.') },{quoted :message});
            return;
        }
        const text = list.map((j, i) => `${i + 1}. ${j}`).join('\n');
        await sock.sendMessage(chatId, { text: S.panel({
            title: 'SUDO LIST',
            icon: 'ℹ️',
            lines: [
                '➜ Sudo users:',
                text,
            ],
            footer: S.credit(),
        }) },{quoted :message});
        return;
    }

    if (!isOwner) {
        await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only owner can add/remove sudo users. Use .sudo list to view.') },{quoted :message});
        return;
    }

    const targetJid = extractMentionedJid(message);
    if (!targetJid) {
        await sock.sendMessage(chatId, { text: S.usage('USAGE', '✘ Please mention a user or provide a number.') },{quoted :message});
        return;
    }

    if (sub === 'add') {
        const ok = await addSudo(targetJid);
        await sock.sendMessage(chatId, { text: ok ? S.success('SUCCESS', `Added sudo: ${targetJid}`) : S.error('ERROR', 'Failed to add sudo') },{quoted :message});
        return;
    }

    if (sub === 'del' || sub === 'remove') {
        const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
        if (targetJid === ownerJid) {
            await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Owner cannot be removed.') },{quoted :message});
            return;
        }
        const ok = await removeSudo(targetJid);
        await sock.sendMessage(chatId, { text: ok ? S.success('SUCCESS', `Removed sudo: ${targetJid}`) : S.error('ERROR', 'Failed to remove sudo') },{quoted :message});
        return;
    }
}

module.exports = sudoCommand;



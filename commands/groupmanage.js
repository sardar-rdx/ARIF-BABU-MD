const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const S = require('../lib/style');

async function ensureGroupAndAdmin(sock, chatId, senderId) {
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ This command can only be used in groups.') });
        return { ok: false };
    }
    // Check admin status of sender and bot
    const isAdmin = require('../lib/isAdmin');
    const adminStatus = await isAdmin(sock, chatId, senderId);
    if (!adminStatus.isBotAdmin) {
        await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Please make the bot an admin first.') });
        return { ok: false };
    }
    if (!adminStatus.isSenderAdmin) {
        await sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ Only group admins can use this command.') });
        return { ok: false };
    }
    return { ok: true };
}

async function setGroupDescription(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;
    const desc = (text || '').trim();
    if (!desc) {
        await sock.sendMessage(chatId, { text: S.usagePanel('.setgdesc <description>', '✘ Please provide a description!') }, { quoted: message });
        return;
    }
    try {
        await sock.groupUpdateDescription(chatId, desc);
        await sock.sendMessage(chatId, { text: S.success('SUCCESS', 'Group description updated.') }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to update group description.') }, { quoted: message });
    }
}

async function setGroupName(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;
    const name = (text || '').trim();
    if (!name) {
        await sock.sendMessage(chatId, { text: S.usagePanel('.setgname <new name>', '✘ Please provide a new name!') }, { quoted: message });
        return;
    }
    try {
        await sock.groupUpdateSubject(chatId, name);
        await sock.sendMessage(chatId, { text: S.success('SUCCESS', 'Group name updated.') }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to update group name.') }, { quoted: message });
    }
}

async function setGroupPhoto(sock, chatId, senderId, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage || quoted?.stickerMessage;
    if (!imageMessage) {
        await sock.sendMessage(chatId, { text: S.usage('USAGE', '✘ Reply to an image/sticker with .setgpp') }, { quoted: message });
        return;
    }
    try {
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const imgPath = path.join(tmpDir, `gpp_${Date.now()}.jpg`);
        fs.writeFileSync(imgPath, buffer);

        await sock.updateProfilePicture(chatId, { url: imgPath });
        try { fs.unlinkSync(imgPath); } catch (_) {}
        await sock.sendMessage(chatId, { text: S.success('SUCCESS', 'Group profile photo updated.') }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to update group profile photo.') }, { quoted: message });
    }
}

module.exports = {
    setGroupDescription,
    setGroupName,
    setGroupPhoto
};



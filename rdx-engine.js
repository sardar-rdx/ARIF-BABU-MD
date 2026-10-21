/**
 * RDX BOT - A WhatsApp Bot
 * Copyright (c) 2024 SARDAR RDX
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Credits:
 * - Baileys Library by @adiwajshing
 * - Pair Code implementation inspired by TechGod143 & DGXEON
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
// Using a lightweight persisted store instead of makeInMemoryStore (compat across versions)
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')
const sessionDir = process.env.SESSION_DIR || join(__dirname, 'session')
const { startServer, setBotSocket } = require('./server')
const botControl = require('./lib/botControl')

// Import lightweight store
const store = require('./lib/lightweight_store')
const { log, banner, connected, disconnected } = require('./lib/logger')

// Initialize store
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Memory optimization - Force garbage collection if available
setInterval(() => {
    if (global.gc) {
        global.gc()
    log.sys('Garbage collection completed')
    }
}, 60_000) // every 1 minute

// Memory monitoring - Restart if RAM gets too high
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
    log.warn('RAM too high (>400MB), restarting bot...')
        process.exit(1) // Panel will auto-restart
    }
}, 30_000) // check every 30 seconds

let phoneNumber = ""
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "RDX BOT"
global.themeemoji = "•"
const pairingCode = process.argv.includes("--pairing-code")
const useQr = process.argv.includes("--qr")
const useMobile = process.argv.includes("--mobile")
// Latest pairing code (served on pair website /status)
global.latestPairCode = null
global.pairCodeNumber = null
global.botStopped = false
global.pairingRequired = false
let socketGeneration = 0

function digitsOnly(v) { return (v || '').replace(/[^0-9]/g, '') }

function isSocketOpen(sock) {
    try {
        const ws = sock?.ws
        return ws?.isOpen === true || ws?.readyState === 1 || ws?.socket?.readyState === 1
    } catch {
        return false
    }
}

async function waitForSocketOpen(sock, timeoutMs = 25000) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        if (isSocketOpen(sock)) return true
        await new Promise(r => setTimeout(r, 400))
    }
    return false
}

async function requestPairCodeSafe(sock, number, attempts = 3) {
    const num = digitsOnly(number)
    if (num.length < 8) throw new Error('Invalid phone number — use country code and number using digits only.')
    const opened = await waitForSocketOpen(sock, 25000)
    if (!opened) throw new Error('WhatsApp connection did not open. Check the connection status and try again.')
    await new Promise(r => setTimeout(r, 1500))
    let lastErr
    for (let i = 0; i < attempts; i++) {
        try {
            let code = await sock.requestPairingCode(num)
            code = code?.match(/.{1,4}/g)?.join('-') || code
            global.latestPairCode = code
            global.pairCodeNumber = num
            log.pair(`Your Pairing Code: ${code}`)
            log.pair('WhatsApp → Settings → Linked Devices → Link with phone number')
            return code
        } catch (e) {
            lastErr = e
            log.warn(`Pairing code attempt ${i + 1}/${attempts} failed: ${e.message}`)
            await new Promise(r => setTimeout(r, 2500))
        }
    }
    throw lastErr || new Error('Failed to generate pairing code')
}

// Start pair-code website server
startServer(process.env.PAIR_PORT || process.env.PORT || 3000)

// Only create readline interface if we're in an interactive environment
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        // In non-interactive environment, use ownerNumber from settings
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}


async function startXeonBotInc() {
    const generation = ++socketGeneration
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion()
        if (generation !== socketGeneration || global.botStopped) return
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
        if (generation !== socketGeneration || global.botStopped) return
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: process.env.BAILEYS_LOG_LEVEL || 'warn' }),
            // QR only if explicitly requested; pairing-code is the default (QR conflicts with requestPairingCode)
            printQRInTerminal: useQr && !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        })

        // Save credentials when they update
        XeonBotInc.ev.on('creds.update', saveCreds)

    // Expose socket to pair-code website + register bot controls
    setBotSocket(XeonBotInc)

    botControl.register({
        stop: async () => {
            global.botStopped = true
            socketGeneration++
            global.latestPairCode = null
            global.pairCodeNumber = null
            try { XeonBotInc.end?.(undefined) } catch {}
            try { XeonBotInc.ws?.close?.() } catch {}
            log.warn('Bot stopped from pair website')
            return { stopped: true }
        },
        start: async () => {
            if (global.pairingRequired) {
                return { pairingRequired: true, message: 'Use New Bot to reset the expired session before pairing.' }
            }
            if (!global.botStopped && isSocketOpen(XeonBotInc)) {
                return { alreadyRunning: true }
            }
            global.botStopped = false
            log.info('Bot starting from pair website...')
            startXeonBotInc()
            return { starting: true }
        },
        connect: async () => {
            // Alias of start — reconnect with existing session or fresh pairing
            if (global.pairingRequired) {
                return { pairingRequired: true, message: 'Use New Bot to reset the expired session before pairing.' }
            }
            global.botStopped = false
            if (isSocketOpen(XeonBotInc)) {
                return { alreadyRunning: true }
            }
            log.info('Reconnecting from pair website...')
            startXeonBotInc()
            return { connecting: true }
        },
        logout: async () => {
            global.botStopped = true
            socketGeneration++
            global.latestPairCode = null
            global.pairCodeNumber = null
            try {
                await XeonBotInc.logout()
                log.warn('Logged out from WhatsApp (device unlinked)')
            } catch (e) {
                log.warn('Logout: ' + e.message)
            }
            try { rmSync(sessionDir, { recursive: true, force: true }) } catch {}
            global.botStopped = false
            global.pairingRequired = false
            log.info('Session cleared — waiting for a number from the pair website')
            startXeonBotInc()
            return { loggedOut: true }
        },
        reset: async () => {
            // "New Bot" — wipe session completely and reboot for a new pairing
            global.botStopped = true
            socketGeneration++
            global.latestPairCode = null
            global.pairCodeNumber = null
            try { XeonBotInc.end?.(undefined) } catch {}
            try { XeonBotInc.ws?.close?.() } catch {}
            try { rmSync(sessionDir, { recursive: true, force: true }) } catch {}
            await new Promise(r => setTimeout(r, 1500))
            global.botStopped = false
            global.pairingRequired = false
            log.warn('Session reset — waiting for a number from the pair website')
            startXeonBotInc()
            return { reset: true }
        }
    })

    store.bind(XeonBotInc.ev)

    // Message handling
    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                await handleStatus(XeonBotInc, chatUpdate);
                return;
            }
            // In private mode, only block non-group messages (allow groups for moderation)
            // Note: XeonBotInc.public is not synced, so we check mode in main.js instead
            // This check is kept for backward compatibility but mainly blocks DMs
            if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                if (!isGroup) return // Block DMs in private mode, but allow group messages
            }
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

            // Clear message retry cache to prevent memory bloat
            if (XeonBotInc?.msgRetryCounterCache) {
                XeonBotInc.msgRetryCounterCache.clear()
            }

            try {
                await handleMessages(XeonBotInc, chatUpdate, true)
            } catch (err) {
                console.error("Error in handleMessages:", err)
                // Only try to send error message if we have a valid chatId
                if (mek.key && mek.key.remoteJid) {
                    await XeonBotInc.sendMessage(mek.key.remoteJid, {
                        text: '❌ An error occurred while processing your message.',
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363400900650126@newsletter',
                                newsletterName: 'RDX BOT MD',
                                serverMessageId: -1
                            }
                        }
                    }).catch(console.error);
                }
            }
        } catch (err) {
            console.error("Error in messages.upsert:", err)
        }
    })

    // Add these event handlers for better functionality
    XeonBotInc.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    XeonBotInc.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = XeonBotInc.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
        }
    })

    XeonBotInc.getName = (jid, withoutContact = false) => {
        id = XeonBotInc.decodeJid(jid)
        withoutContact = XeonBotInc.withoutContact || withoutContact
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
            XeonBotInc.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    XeonBotInc.public = true

    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    // Generate a CLI pairing code only when explicitly requested with --pairing-code.
    // Website pairing is always user-triggered so logout never silently reuses an old number.
    if (!XeonBotInc.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api')

        if (pairingCode) {
            let pairNumber = null
            if (!!global.phoneNumber) {
                pairNumber = global.phoneNumber
            } else {
                pairNumber = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFormat: 6281376552730 (without + or spaces) : `)))
            }
            pairNumber = digitsOnly(pairNumber)
            const pn = require('awesome-phonenumber');
            if (!pn('+' + pairNumber).isValid()) {
                log.error('Invalid phone number — use full international format without + or spaces');
                process.exit(1);
            }

            setTimeout(async () => {
                try {
                    await requestPairCodeSafe(XeonBotInc, pairNumber)
                } catch (error) {
                    log.error('Failed to get pairing code: ' + error.message)
                    log.pair('Open the pair website → enter your number → click Generate Pair Code')
                }
            }, 4000)
        } else {
            log.pair('Waiting for a number in the pair website — click Generate Pair Code to connect')
        }
    }

        // Connection handling
    XeonBotInc.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect, qr } = s
        
        if (qr && useQr && !pairingCode) {
            log.pair('QR Code generated — scan with WhatsApp')
        }
        
        if (connection === 'connecting') {
            log.info('Connecting to WhatsApp...')
        }
        
        if (connection == "open") {
            global.botStopped = false
            global.pairingRequired = false
            banner()
            connected(XeonBotInc.user)
            global.latestPairCode = null

            try {
                const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                await XeonBotInc.sendMessage(botNumber, {
                    text: `🤖 Bot Connected Successfully!\n\n⏰ Time: ${new Date().toLocaleString()}\n✅ Status: Online and Ready!\n\n✅Make sure to join below channel`,
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
                log.ok('Welcome message sent to owner')
            } catch (error) {
                log.error('Could not send welcome message: ' + error.message)
            }
        }
        
        if (connection === 'close') {
            if (generation !== socketGeneration) return
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const closeReason = lastDisconnect?.error?.message || 'No error details provided'
            log.warn(`WhatsApp connection closed (${statusCode || 'unknown'}): ${closeReason}`)
            const wasRegistered = !!XeonBotInc.authState?.creds?.registered
            const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401

            // User stopped the bot from the pair website — do not reconnect
            if (global.botStopped) {
                log.warn('Bot is stopped — not reconnecting (use Start on the website)')
                disconnected(statusCode, false)
                return
            }

            if (isLoggedOut) {
                disconnected(statusCode, false)
                global.latestPairCode = null
                global.pairCodeNumber = null
                global.pairingRequired = true
                global.botStopped = true
                if (wasRegistered) {
                    try {
                        rmSync(sessionDir, { recursive: true, force: true })
                        log.warn('Logged-out session removed. Click New Bot to start a fresh pairing.')
                    } catch (error) {
                        log.error('Error deleting logged-out session: ' + error.message)
                    }
                } else {
                    log.warn('WhatsApp rejected the saved session. Click New Bot to reset it and pair again.')
                }
                return
            }

            // Recover from temporary disconnects, but do not spawn stale sockets.
            disconnected(statusCode, true)
            log.info('Reconnecting in 5 seconds...')
            await delay(5000)
            if (generation === socketGeneration && !global.botStopped) {
                startXeonBotInc()
            }
        }
    })

    // Track recently-notified callers to avoid spamming messages
    const antiCallNotified = new Set();

    // Anticall handler: block callers when enabled
    XeonBotInc.ev.on('call', async (calls) => {
        try {
            const { readState: readAnticallState } = require('./commands/anticall');
            const state = readAnticallState();
            if (!state.enabled) return;
            for (const call of calls) {
                const callerJid = call.from || call.peerJid || call.chatId;
                if (!callerJid) continue;
                try {
                    // First: attempt to reject the call if supported
                    try {
                        if (typeof XeonBotInc.rejectCall === 'function' && call.id) {
                            await XeonBotInc.rejectCall(call.id, callerJid);
                        } else if (typeof XeonBotInc.sendCallOfferAck === 'function' && call.id) {
                            await XeonBotInc.sendCallOfferAck(call.id, callerJid, 'reject');
                        }
                    } catch {}

                    // Notify the caller only once within a short window
                    if (!antiCallNotified.has(callerJid)) {
                        antiCallNotified.add(callerJid);
                        setTimeout(() => antiCallNotified.delete(callerJid), 60000);
                        await XeonBotInc.sendMessage(callerJid, { text: '📵 Anticall is enabled. Your call was rejected and you will be blocked.' });
                    }
                } catch {}
                // Then: block after a short delay to ensure rejection and message are processed
                setTimeout(async () => {
                    try { await XeonBotInc.updateBlockStatus(callerJid, 'block'); } catch {}
                }, 800);
            }
        } catch (e) {
            // ignore
        }
    });

    XeonBotInc.ev.on('group-participants.update', async (update) => {
        await handleGroupParticipantUpdate(XeonBotInc, update);
    });

    XeonBotInc.ev.on('messages.upsert', async (m) => {
        if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
            await handleStatus(XeonBotInc, m);
        }
    });

    XeonBotInc.ev.on('status.update', async (status) => {
        await handleStatus(XeonBotInc, status);
    });

    XeonBotInc.ev.on('messages.reaction', async (status) => {
        await handleStatus(XeonBotInc, status);
    });

    return XeonBotInc
    } catch (error) {
        if (generation !== socketGeneration || global.botStopped) return
        log.error('Error in startXeonBotInc: ' + error.message)
        await delay(5000)
        if (generation === socketGeneration && !global.botStopped) {
            startXeonBotInc()
        }
    }
}


// Start the bot with error handling
startXeonBotInc().catch(error => {
    log.error('Fatal error: ' + error.message)
    process.exit(1)
})
process.on('uncaughtException', (err) => {
    log.error('Uncaught Exception: ' + err.message)
})

process.on('unhandledRejection', (err) => {
    log.error('Unhandled Rejection: ' + (err?.message || err))
})

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    log.warn(`File changed: ${__filename} — reloading`)
    delete require.cache[file]
    require(file)
})
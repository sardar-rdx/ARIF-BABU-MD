const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { log } = require('./lib/logger')
const botControl = require('./lib/botControl')

let botSocket = null
let lastPairRequest = 0

function setBotSocket(sock) {
    botSocket = sock
}

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

async function requestPairCodeWithRetry(sock, number, attempts = 3) {
    const opened = await waitForSocketOpen(sock, 25000)
    if (!opened) throw new Error('WhatsApp connection did not open. Check the connection status and try again.')
    await new Promise(r => setTimeout(r, 1500))
    let lastErr
    for (let i = 0; i < attempts; i++) {
        try {
            let code = await sock.requestPairingCode(number)
            code = code?.match(/.{1,4}/g)?.join('-') || code
            return code
        } catch (e) {
            lastErr = e
            await new Promise(r => setTimeout(r, 2500))
        }
    }
    throw lastErr || new Error('Failed to generate pairing code')
}

function json(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    })
    res.end(JSON.stringify(data))
}

const dashboardPassword = process.env.DASHBOARD_PASSWORD
const dashboardUsername = process.env.DASHBOARD_USERNAME || 'admin'
if (process.env.NODE_ENV === 'production' && (!dashboardPassword || dashboardPassword.length < 20)) {
    throw new Error('Set DASHBOARD_PASSWORD to a secret of at least 20 characters before running in production.')
}

function safeEqual(left, right) {
    const a = Buffer.from(left)
    const b = Buffer.from(right)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function isAuthorized(req) {
    if (!dashboardPassword) return true
    const match = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '')
    if (!match) return false
    let credentials
    try {
        credentials = Buffer.from(match[1], 'base64').toString('utf8')
    } catch {
        return false
    }
    const separator = credentials.indexOf(':')
    if (separator < 0) return false
    return safeEqual(credentials.slice(0, separator), dashboardUsername) &&
        safeEqual(credentials.slice(separator + 1), dashboardPassword)
}

function isSameOrigin(req) {
    const origin = req.headers.origin
    if (!origin) return true
    const protocol = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
    return origin === `${protocol}://${host}`
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', chunk => {
            body += chunk
            if (body.length > 8192) {
                reject(new Error('Request body too large'))
                req.destroy()
            }
        })
        req.on('end', () => {
            if (!body) return resolve({})
            try {
                resolve(JSON.parse(body))
            } catch {
                reject(new Error('Invalid JSON body'))
            }
        })
        req.on('error', reject)
    })
}

function saveSettings(ownerNumber, prefix) {
    try {
        const settingsPath = path.join(process.env.RDX_DATA_DIR || path.join(__dirname, 'session'), 'settings.json')
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
        const saved = fs.existsSync(settingsPath)
            ? JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
            : {}
        if (ownerNumber) saved.ownerNumber = ownerNumber
        if (prefix) saved.prefix = prefix
        fs.writeFileSync(settingsPath, JSON.stringify(saved, null, 2), { mode: 0o600 })
        const settings = require('./settings')
        if (ownerNumber) settings.ownerNumber = ownerNumber
        if (prefix) settings.prefix = prefix
        return true
    } catch (e) {
        console.error('Failed to save settings:', e)
        return false
    }
}

function startServer(port) {
    port = port || process.env.PORT || 3000

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Referrer-Policy', 'no-referrer')
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('Cache-Control', 'no-store')

        if (req.method === 'OPTIONS') {
            res.writeHead(204)
            return res.end()
        }

        // Render's health probe stays public; all other routes are private.
        if (url.pathname === '/healthz') {
            return json(res, 200, { ok: true })
        }
        if (!isAuthorized(req)) {
            res.writeHead(401, {
                'WWW-Authenticate': 'Basic realm="RDX Bot Console", charset="UTF-8"',
                'Cache-Control': 'no-store',
                'Content-Type': 'text/plain; charset=utf-8'
            })
            return res.end('Authentication required')
        }

        // Connection status for the website
        if (url.pathname === '/status') {
            const registered = !!botSocket?.authState?.creds?.registered
            const connected = !!botSocket?.user?.id
            const wsOpen = isSocketOpen(botSocket)
            let currentPrefix = '.'
            let currentOwner = ''
            try {
                const s = require('./settings')
                currentPrefix = s.prefix || '.'
                currentOwner = s.ownerNumber || ''
            } catch {}
            let hasSession = false
            try {
                const sessionDir = process.env.SESSION_DIR || path.join(__dirname, 'session')
                hasSession = fs.existsSync(path.join(sessionDir, 'creds.json'))
            } catch {}
            return json(res, 200, {
                success: true,
                registered,
                connected: connected && wsOpen,
                socketOpen: wsOpen,
                stopped: !!global.botStopped,
                pairingRequired: !!global.pairingRequired,
                hasSession,
                botname: global.botname || 'RDX BOT',
                prefix: currentPrefix,
                ownerNumber: currentOwner,
                // Auto-generated pairing code (if bot requested one on startup)
                pairCode: global.latestPairCode || null,
                pairNumber: global.pairCodeNumber || null
            })
        }

        // Bot controls: /control?action=stop|start|connect|logout|reset
        if (url.pathname === '/control') {
            if (req.method !== 'POST' || !isSameOrigin(req)) {
                return json(res, 405, { success: false, error: 'Use a same-origin POST request.' })
            }
            let body
            try {
                body = await readJsonBody(req)
            } catch (err) {
                return json(res, 400, { success: false, error: err.message })
            }
            const action = (body.action || '').toLowerCase()
            const allowed = ['stop', 'start', 'connect', 'logout', 'reset', 'newbot']
            if (!allowed.includes(action)) {
                return json(res, 400, { success: false, error: 'Unknown action. Use: ' + allowed.join(', ') })
            }
            if (!botControl.has(action === 'newbot' ? 'reset' : action)) {
                return json(res, 503, { success: false, error: 'Bot control not ready yet. Wait a few seconds after bot start.' })
            }
            try {
                const key = action === 'newbot' ? 'reset' : action
                const result = await botControl.call(key)
                log.web(`Control action from website: ${action}`)
                return json(res, 200, { success: true, action, result: result || {} })
            } catch (err) {
                console.error('Control error:', err)
                return json(res, 500, { success: false, error: err.message || 'Control failed' })
            }
        }

        // Save owner number + prefix: /configure?owner=91XXXX&prefix=.
        if (url.pathname === '/configure') {
            if (req.method !== 'POST' || !isSameOrigin(req)) {
                return json(res, 405, { success: false, error: 'Use a same-origin POST request.' })
            }
            let body
            try {
                body = await readJsonBody(req)
            } catch (err) {
                return json(res, 400, { success: false, error: err.message })
            }
            const owner = (body.owner || '').replace(/[^0-9]/g, '')
            const prefix = body.prefix || ''

            if (!owner && !prefix) {
                return json(res, 400, { success: false, error: 'Provide owner number and/or prefix.' })
            }
            if (owner && (owner.length < 8 || owner.length > 15)) {
                return json(res, 400, { success: false, error: 'Invalid owner number. Use 8-15 digits with country code.' })
            }
            if (prefix && prefix.length > 3) {
                return json(res, 400, { success: false, error: 'Prefix must be 1-3 characters.' })
            }

            const ok = saveSettings(owner || null, prefix || null)
            if (ok) {
                return json(res, 200, {
                    success: true,
                    message: 'Settings saved!',
                    ownerNumber: owner || undefined,
                    prefix: prefix || undefined
                })
            }
            return json(res, 500, { success: false, error: 'Failed to save settings.' })
        }

        // Generate pairing code: /code?number=91XXXXXXXXXX&prefix=.&owner=91XXXX
        if (url.pathname === '/code') {
            if (req.method !== 'POST' || !isSameOrigin(req)) {
                return json(res, 405, { success: false, error: 'Use a same-origin POST request.' })
            }
            let body
            try {
                body = await readJsonBody(req)
            } catch (err) {
                return json(res, 400, { success: false, error: err.message })
            }
            const number = digitsOnly(body.number || '')
            const prefix = body.prefix || ''
            const owner = digitsOnly(body.owner || '')

            if (number.length < 8 || number.length > 15) {
                return json(res, 400, {
                    success: false,
                    error: 'Invalid number. Enter 8-15 digits with country code (no +, no spaces).'
                })
            }

            // Save owner number & prefix before pairing
            if (owner || prefix) {
                saveSettings(owner || number, prefix || null)
            } else {
                // Auto-set owner as the pair number if not already set differently
                saveSettings(number, null)
            }

            if (!botSocket) {
                return json(res, 503, {
                    success: false,
                    error: 'Bot socket not ready. Please wait a few seconds and try again.'
                })
            }
            if (global.pairingRequired) {
                return json(res, 409, {
                    success: false,
                    error: 'WhatsApp rejected the saved session. Click New Bot to reset it, then generate a fresh pairing code.'
                })
            }
            if (botSocket.authState?.creds?.registered) {
                return json(res, 400, {
                    success: false,
                    error: 'Bot is already connected to a WhatsApp account.'
                })
            }

            const now = Date.now()
            if (now - lastPairRequest < 5000) {
                return json(res, 429, {
                    success: false,
                    error: 'Please wait 5 seconds before requesting another code.'
                })
            }
            lastPairRequest = now

            try {
                global.phoneNumber = number
                // Wait for WhatsApp WS to open — requestPairingCode fails if socket is not open (common cause of "code not working")
                const opened = await waitForSocketOpen(botSocket, 25000)
                if (!opened) {
                    return json(res, 503, {
                        success: false,
                        error: 'WhatsApp connection not ready yet. Wait ~15 seconds after bot start, then try again.'
                    })
                }
                let code = await requestPairCodeWithRetry(botSocket, number)
                global.latestPairCode = code
                global.pairCodeNumber = number
                return json(res, 200, { success: true, code, number })
            } catch (err) {
                console.error('Pairing code error:', err)
                return json(res, 500, {
                    success: false,
                    error: 'Failed to generate pairing code. Please try again.'
                })
            }
        }

        // Serve files from public/
        let filePath = url.pathname === '/' ? '/index.html' : url.pathname
        filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '')
        const publicDir = path.join(__dirname, 'public')
        const full = path.join(publicDir, filePath)
        if (!full.startsWith(publicDir)) {
            res.writeHead(403)
            return res.end('Forbidden')
        }

        fs.readFile(full, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' })
                return res.end('Not Found')
            }
            const ext = path.extname(full).toLowerCase()
            const types = {
                '.html': 'text/html; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.js': 'text/javascript; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.json': 'application/json'
            }
            res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' })
            res.end(data)
        })
    })

    server.listen(port, () => {
        log.web(`Pair website running → http://localhost:${port}`)
    })

    return server
}

module.exports = { startServer, setBotSocket }

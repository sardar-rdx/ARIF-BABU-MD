// Bridge between pair website (server.js) and the live bot (rdx-engine.js)
let handlers = {}

function register(h) {
    handlers = h || {}
}

async function call(name, ...args) {
    const fn = handlers[name]
    if (typeof fn !== 'function') {
        throw new Error(`Bot control "${name}" is not available`)
    }
    return fn(...args)
}

function has(name) {
    return typeof handlers[name] === 'function'
}

module.exports = { register, call, has }

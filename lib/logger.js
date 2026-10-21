const chalk = require('chalk')

function ts() {
    return chalk.gray(`[${new Date().toLocaleTimeString('en-GB', { hour12: false })}]`)
}

const log = {
    info: (msg) => console.log(ts(), chalk.blue('  INFO  '), chalk.white(msg)),
    ok: (msg) => console.log(ts(), chalk.green('  OK    '), chalk.green(msg)),
    success: (msg) => console.log(ts(), chalk.green(' SUCCESS'), chalk.green(msg)),
    warn: (msg) => console.log(ts(), chalk.yellow('  WARN  '), chalk.yellow(msg)),
    error: (msg) => console.log(ts(), chalk.red('  ERROR '), chalk.red(msg)),
    cmd: (msg) => console.log(ts(), chalk.magenta('  CMD   '), chalk.cyan(msg)),
    pair: (msg) => console.log(ts(), chalk.cyan('  PAIR  '), chalk.cyan(msg)),
    web: (msg) => console.log(ts(), chalk.blue('  WEB   '), chalk.blue(msg)),
    sys: (msg) => console.log(ts(), chalk.gray('  SYS   '), chalk.gray(msg)),
}

function banner() {
    const name = global.botname || 'RDX BOT'
    const line = chalk.hex('#22d3ee')('═'.repeat(56))
    const inner = 42
    const label = `🤖  ${name}  🤖`
    const labelLen = label.length + 1 // emoji counts as 2 cells
    const left = Math.floor((inner - labelLen) / 2)
    const right = inner - labelLen - left
    console.log('\n' + line)
    console.log(
        chalk.hex('#22d3ee')('  ╔' + '═'.repeat(inner) + '╗')
    )
    console.log(
        chalk.hex('#22d3ee')('  ║') +
        chalk.bold.hex('#4ade80')(' '.repeat(left) + label + ' '.repeat(right)) +
        chalk.hex('#22d3ee')('║')
    )
    console.log(
        chalk.hex('#22d3ee')('  ╚' + '═'.repeat(inner) + '╝')
    )
    console.log(line)
    console.log(
        chalk.hex('#a3a3a3')('  ') +
        chalk.hex('#facc15')(' YT Channel ') + chalk.white(': ') + chalk.hex('#4ade80')('RDX BOT ZONE')
    )
    console.log(
        chalk.hex('#a3a3a3')('  ') +
        chalk.hex('#facc15')(' Owner      ') + chalk.white(': ') + chalk.hex('#4ade80')('ARIF BABU')
    )
    console.log(
        chalk.hex('#a3a3a3')('  ') +
        chalk.hex('#facc15')(' Credit     ') + chalk.white(': ') + chalk.hex('#4ade80')('SARDAR RDX')
    )
    console.log(
        chalk.hex('#a3a3a3')('  ') +
        chalk.hex('#facc15')(' Version    ') + chalk.white(': ') + chalk.hex('#4ade80')((require('../settings').version) || '1.0.0')
    )
    console.log(line + '\n')
}

function connected(user) {
    const num = user?.id?.split(':')[0] || 'unknown'
    const name = user?.name || ''
    const line = chalk.hex('#22d3ee')('─'.repeat(56))
    console.log('')
    console.log(line)
    console.log(
        chalk.hex('#4ade80')('  ✅  ') + chalk.bold.white('BOT CONNECTED SUCCESSFULLY')
    )
    console.log(line)
    console.log(
        chalk.hex('#a3a3a3')('  ') + chalk.hex('#facc15')(' Number   ') + chalk.white(': ') + chalk.hex('#4ade80')('+' + num)
    )
    if (name) {
        console.log(
            chalk.hex('#a3a3a3')('  ') + chalk.hex('#facc15')(' Name     ') + chalk.white(': ') + chalk.hex('#4ade80')(name)
        )
    }
    console.log(
        chalk.hex('#a3a3a3')('  ') + chalk.hex('#facc15')(' Status   ') + chalk.white(': ') + chalk.hex('#4ade80')('Online & Ready')
    )
    console.log(
        chalk.hex('#a3a3a3')('  ') + chalk.hex('#facc15')(' Time     ') + chalk.white(': ') + chalk.hex('#4ade80')(new Date().toLocaleString())
    )
    console.log(line)
    console.log(
        chalk.hex('#a3a3a3')('  ') + chalk.hex('#22d3ee')('🌐 Pair Website: ') + chalk.white(`http://localhost:${process.env.PORT || process.env.PAIR_PORT || 3000}`)
    )
    console.log(line + '\n')
}

function disconnected(statusCode, willReconnect) {
    const line = chalk.hex('#f87171')('─'.repeat(56))
    console.log('')
    console.log(line)
    if (statusCode === 401 || statusCode === DisconnectReason?.loggedOut) {
        console.log(
            chalk.hex('#f87171')('  ❌  ') + chalk.bold.red('SESSION LOGGED OUT')
        )
        console.log(
            chalk.hex('#a3a3a3')('  ') + chalk.hex('#facc15')(' Action ') + chalk.white(': ') + chalk.hex('#f87171')('Session cleared — re-authenticate via website')
        )
    } else {
        console.log(
            chalk.hex('#f87171')('  ⚠️  ') + chalk.bold.yellow('CONNECTION CLOSED')
        )
        console.log(
            chalk.hex('#a3a3a3')('  ') + chalk.hex('#facc15')(' Code   ') + chalk.white(': ') + chalk.hex('#f87171')(String(statusCode || 'unknown'))
        )
        if (willReconnect) {
            console.log(
                chalk.hex('#a3a3a3')('  ') + chalk.hex('#facc15')(' Action ') + chalk.white(': ') + chalk.hex('#facc15')('Reconnecting in 5s...')
            )
        }
    }
    console.log(line + '\n')
}

let DisconnectReason = null
try { DisconnectReason = require('@whiskeysockets/baileys').DisconnectReason } catch {}

module.exports = { log, banner, connected, disconnected }

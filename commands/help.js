const settings = require('../settings');
const S = require('../lib/style');

async function helpCommand(sock, chatId, message) {
    const header = S.panel({
        title: settings.botName || 'RDX-BOT-MD',
        icon: '🤖',
        fields: [
            { icon: '🏷️', label: 'Version', value: settings.version || '3.0.0' },
            { icon: '👑', label: 'Owner', value: settings.botOwner || 'ARIF BABU' },
            { icon: '▶️', label: 'YT', value: global.ytch }
        ],
        footer: S.credit()
    });

    const helpMessage = `${header}\n\n${S.menu({
        title: 'AVAILABLE COMMANDS',
        icon: '📖',
        groups: [
            {
                name: 'GENERAL',
                icon: '🌐',
                items: [
                    '.help or .menu',
                    '.ping',
                    '.alive',
                    '.tts <text>',
                    '.owner',
                    '.joke',
                    '.quote',
                    '.fact',
                    '.weather <city>',
                    '.news',
                    '.attp <text>',
                    '.lyrics <song_title>',
                    '.8ball <question>',
                    '.groupinfo',
                    '.staff or .admins ',
                    '.vv',
                    '.trt <text> <lang>',
                    '.ss <link>',
                    '.jid',
                    '.url'
                ]
            },
            {
                name: 'ADMIN',
                icon: '👮‍♂️',
                items: [
                    '.ban @user',
                    '.promote @user',
                    '.demote @user',
                    '.mute <minutes>',
                    '.unmute',
                    '.delete or .del',
                    '.kick @user',
                    '.warnings @user',
                    '.warn @user',
                    '.antilink',
                    '.antibadword',
                    '.clear',
                    '.tag <message>',
                    '.tagall',
                    '.tagnotadmin',
                    '.hidetag <message>',
                    '.chatbot',
                    '.resetlink',
                    '.antitag <on/off>',
                    '.welcome <on/off>',
                    '.goodbye <on/off>',
                    '.setgdesc <description>',
                    '.setgname <new name>',
                    '.setgpp (reply to image)'
                ]
            },
            {
                name: 'OWNER',
                icon: '🔒',
                items: [
                    '.mode <public/private>',
                    '.clearsession',
                    '.antidelete',
                    '.cleartmp',
                    '.update',
                    '.settings',
                    '.setpp <reply to image>',
                    '.autoreact <on/off>',
                    '.autostatus <on/off>',
                    '.autostatus react <on/off>',
                    '.autotyping <on/off>',
                    '.autoread <on/off>',
                    '.anticall <on/off>',
                    '.pmblocker <on/off/status>',
                    '.pmblocker setmsg <text>',
                    '.setmention <reply to msg>',
                    '.mention <on/off>'
                ]
            },
            {
                name: 'IMAGE/STICKER',
                icon: '🎨',
                items: [
                    '.blur <image>',
                    '.simage <reply to sticker>',
                    '.sticker <reply to image>',
                    '.removebg',
                    '.remini',
                    '.crop <reply to image>',
                    '.tgsticker <Link>',
                    '.meme',
                    '.take <packname> ',
                    '.emojimix <emj1>+<emj2>',
                    '.igs <insta link>',
                    '.igsc <insta link>'
                ]
            },
            {
                name: 'PIES',
                icon: '🖼️',
                items: [
                    '.pies <country>',
                    '.china ',
                    '.indonesia ',
                    '.japan ',
                    '.korea ',
                    '.hijab'
                ]
            },
            {
                name: 'GAME',
                icon: '🎮',
                items: [
                    '.tictactoe @user',
                    '.hangman',
                    '.guess <letter>',
                    '.trivia',
                    '.answer <answer>',
                    '.truth',
                    '.dare'
                ]
            },
            {
                name: 'AI',
                icon: '🤖',
                items: [
                    '.gpt <question>',
                    '.gemini <question>',
                    '.imagine <prompt>',
                    '.flux <prompt>',
                    '.sora <prompt>'
                ]
            },
            {
                name: 'FUN',
                icon: '🎯',
                items: [
                    '.compliment @user',
                    '.insult @user',
                    '.flirt ',
                    '.shayari',
                    '.goodnight',
                    '.roseday',
                    '.character @user',
                    '.wasted @user',
                    '.ship @user',
                    '.simp @user',
                    '.stupid @user [text]'
                ]
            },
            {
                name: 'TEXTMAKER',
                icon: '🔤',
                items: [
                    '.metallic <text>',
                    '.ice <text>',
                    '.snow <text>',
                    '.impressive <text>',
                    '.matrix <text>',
                    '.light <text>',
                    '.neon <text>',
                    '.devil <text>',
                    '.purple <text>',
                    '.thunder <text>',
                    '.leaves <text>',
                    '.1917 <text>',
                    '.arena <text>',
                    '.hacker <text>',
                    '.sand <text>',
                    '.blackpink <text>',
                    '.glitch <text>',
                    '.fire <text>'
                ]
            },
            {
                name: 'DOWNLOADER',
                icon: '📥',
                items: [
                    '.play <song_name>',
                    '.song <song_name>',
                    '.spotify <query>',
                    '.instagram <link>',
                    '.facebook <link>',
                    '.tiktok <link>',
                    '.video <song name>',
                    '.ytmp4 <Link>'
                ]
            },
            {
                name: 'MISC',
                icon: '🧩',
                items: [
                    '.heart',
                    '.horny',
                    '.circle',
                    '.lgbt',
                    '.lolice',
                    '.its-so-stupid',
                    '.namecard ',
                    '.oogway',
                    '.tweet',
                    '.ytcomment ',
                    '.comrade ',
                    '.gay ',
                    '.glass ',
                    '.jail ',
                    '.passed ',
                    '.triggered'
                ]
            },
            {
                name: 'ANIME',
                icon: '🖼️',
                items: [
                    '.nom ',
                    '.poke ',
                    '.cry ',
                    '.kiss ',
                    '.pat ',
                    '.hug ',
                    '.wink ',
                    '.facepalm '
                ]
            },
            {
                name: 'GITHUB',
                icon: '💻',
                items: [
                    '.git',
                    '.github',
                    '.sc',
                    '.script',
                    '.repo'
                ]
            }
        ],
        signature: 'Join our channel for updates'
    })}`;

    await sock.sendMessage(chatId, {
        text: helpMessage,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363400900650126@newsletter',
                newsletterName: 'RDX BOT MD',
                serverMessageId: -1
            }
        }
    }, { quoted: message });
}

module.exports = helpCommand;

const S = require('../lib/style');

const eightBallResponses = [
    "Yes, definitely!",
    "No way!",
    "Ask again later.",
    "It is certain.",
    "Very doubtful.",
    "Without a doubt.",
    "My reply is no.",
    "Signs point to yes."
];

async function eightBallCommand(sock, chatId, question) {
    if (!question) {
        await sock.sendMessage(chatId, { text: S.usage('USAGE', '✘ Please ask a question!') });
        return;
    }

    const randomResponse = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    await sock.sendMessage(chatId, { text: S.panel({
        title: '8 BALL',
        icon: '🎱',
        lines: [randomResponse]
    }) });
}

module.exports = { eightBallCommand };

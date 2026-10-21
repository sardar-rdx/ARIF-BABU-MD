const axios = require('axios');
const S = require('../lib/style');

let triviaGames = {};

async function startTrivia(sock, chatId) {
    if (triviaGames[chatId]) {
        sock.sendMessage(chatId, { text: S.restricted('RESTRICTED', '⚠️ A trivia game is already in progress!') });
        return;
    }

    try {
        const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
        const questionData = response.data.results[0];

        triviaGames[chatId] = {
            question: questionData.question,
            correctAnswer: questionData.correct_answer,
            options: [...questionData.incorrect_answers, questionData.correct_answer].sort(),
        };

        sock.sendMessage(chatId, {
            text: S.panel({
                title: 'TRIVIA',
                icon: '🧠',
                lines: [
                    `❓ Question: ${triviaGames[chatId].question}`,
                    '➜ Options:',
                ],
                bullets: triviaGames[chatId].options,
                footer: S.credit(),
            })
        });
    } catch (error) {
        sock.sendMessage(chatId, { text: S.error('ERROR', 'Error fetching trivia question. Try again later.') });
    }
}

function answerTrivia(sock, chatId, answer) {
    if (!triviaGames[chatId]) {
        sock.sendMessage(chatId, { text: S.info('TRIVIA', '⚠️ No trivia game is in progress.') });
        return;
    }

    const game = triviaGames[chatId];

    if (answer.toLowerCase() === game.correctAnswer.toLowerCase()) {
        sock.sendMessage(chatId, { text: S.success('SUCCESS', `Correct! The answer is ${game.correctAnswer}`) });
    } else {
        sock.sendMessage(chatId, { text: S.error('ERROR', `Wrong! The correct answer was ${game.correctAnswer}`) });
    }

    delete triviaGames[chatId];
}

module.exports = { startTrivia, answerTrivia };

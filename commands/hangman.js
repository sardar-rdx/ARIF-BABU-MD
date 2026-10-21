const fs = require('fs');
const S = require('../lib/style');

const words = ['javascript', 'bot', 'hangman', 'whatsapp', 'nodejs'];
let hangmanGames = {};

function startHangman(sock, chatId) {
    const word = words[Math.floor(Math.random() * words.length)];
    const maskedWord = '_ '.repeat(word.length).trim();

    hangmanGames[chatId] = {
        word,
        maskedWord: maskedWord.split(' '),
        guessedLetters: [],
        wrongGuesses: 0,
        maxWrongGuesses: 6,
    };

    sock.sendMessage(chatId, { text: S.panel({
        title: 'HANGMAN',
        icon: '🎮',
        lines: [`Game started! The word is: ${maskedWord}`]
    }) });
}

function guessLetter(sock, chatId, letter) {
    if (!hangmanGames[chatId]) {
        sock.sendMessage(chatId, { text: S.usagePanel('.hangman', '✘ No game in progress.') });
        return;
    }

    const game = hangmanGames[chatId];
    const { word, guessedLetters, maskedWord, maxWrongGuesses } = game;

    if (guessedLetters.includes(letter)) {
        sock.sendMessage(chatId, { text: S.error('ERROR', `You already guessed "${letter}". Try another letter.`) });
        return;
    }

    guessedLetters.push(letter);

    if (word.includes(letter)) {
        for (let i = 0; i < word.length; i++) {
            if (word[i] === letter) {
                maskedWord[i] = letter;
            }
        }
        sock.sendMessage(chatId, { text: S.panel({
            title: 'GOOD GUESS',
            icon: '✅',
            lines: [maskedWord.join(' ')]
        }) });

        if (!maskedWord.includes('_')) {
            sock.sendMessage(chatId, { text: S.panel({
                title: 'SUCCESS',
                icon: '🎉',
                lines: [`Congratulations! You guessed the word: ${word}`]
            }) });
            delete hangmanGames[chatId];
        }
    } else {
        game.wrongGuesses += 1;
        sock.sendMessage(chatId, { text: S.panel({
            title: 'WRONG',
            icon: '⚠️',
            lines: [`Wrong guess! You have ${maxWrongGuesses - game.wrongGuesses} tries left.`]
        }) });

        if (game.wrongGuesses >= maxWrongGuesses) {
            sock.sendMessage(chatId, { text: S.panel({
                title: 'GAME OVER',
                icon: '💀',
                lines: [`The word was: ${word}`]
            }) });
            delete hangmanGames[chatId];
        }
    }
}

module.exports = { startHangman, guessLetter };

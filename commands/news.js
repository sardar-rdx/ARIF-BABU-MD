const axios = require('axios');
const S = require('../lib/style');

module.exports = async function (sock, chatId) {
    try {
        const apiKey = 'dcd720a6f1914e2d9dba9790c188c08c';  // Replace with your NewsAPI key
        const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`);
        const articles = response.data.articles.slice(0, 5); // Get top 5 articles
        const articleLines = [];
        articles.forEach((article, index) => {
            articleLines.push(`${index + 1}. *${article.title}*`);
            articleLines.push(`   ${article.description}`);
        });
        const newsMessage = S.panel({
            title: 'LATEST NEWS',
            icon: '📰',
            lines: articleLines,
            footer: S.credit(),
        });
        await sock.sendMessage(chatId, { text: newsMessage });
    } catch (error) {
        console.error('Error fetching news:', error);
        await sock.sendMessage(chatId, { text: S.error('ERROR', 'Sorry, I could not fetch news right now! Try again later.') });
    }
};

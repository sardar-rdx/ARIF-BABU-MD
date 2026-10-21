const moment = require('moment-timezone');
const fetch = require('node-fetch');
const S = require('../lib/style');


async function githubCommand(sock, chatId, message) {
  try {
    const res = await fetch('https://api.github.com/repos/mruniquehacker/Knightbot-md');
    if (!res.ok) throw new Error('Error fetching repository data');
    const json = await res.json();

    let txt = S.panel({
      title: 'GITHUB',
      icon: '📦',
      fields: [
        { icon: '📛', label: 'Name', value: json.name },
        { icon: '👀', label: 'Watchers', value: json.watchers_count },
        { icon: '📦', label: 'Size', value: `${(json.size / 1024).toFixed(2)} MB` },
        { icon: '🕒', label: 'Last Updated', value: moment(json.updated_at).format('DD/MM/YY - HH:mm:ss') },
        { icon: '🔗', label: 'URL', value: json.html_url },
        { icon: '🍴', label: 'Forks', value: json.forks_count },
        { icon: '⭐', label: 'Stars', value: json.stargazers_count },
      ],
      footer: S.credit(),
    });

    await sock.sendMessage(chatId, { text: txt }, { quoted: message });
  } catch (error) {
    await sock.sendMessage(chatId, { text: S.error('ERROR', 'Error fetching repository information.') }, { quoted: message });
  }
}

module.exports = githubCommand; 
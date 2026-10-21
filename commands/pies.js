const fetch = require('node-fetch');
const S = require('../lib/style');

const BASE = 'https://api.shizo.top/pies';
const VALID_COUNTRIES = ['india','malaysia', 'thailand', 'china', 'indonesia', 'japan', 'korea', 'vietnam'];

async function fetchPiesImageBuffer(country) {
	const url = `${BASE}/${country}?apikey=shizo`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const contentType = res.headers.get('content-type') || '';
	if (!contentType.includes('image')) throw new Error('API did not return an image');
	return res.buffer();
}

async function piesCommand(sock, chatId, message, args) {
	const sub = (args && args[0] ? args[0] : '').toLowerCase();
	if (!sub) {
		await sock.sendMessage(chatId, { text: S.usage('USAGE', `✘ Please provide a country!\n➜ Example: .pies india\n➜ Countries: ${VALID_COUNTRIES.join(', ')}`) }, { quoted: message });
		return;
	}
	if (!VALID_COUNTRIES.includes(sub)) {
		await sock.sendMessage(chatId, { text: S.error('ERROR', `Unsupported country: ${sub}\n➜ Try one of: ${VALID_COUNTRIES.join(', ')}`) }, { quoted: message });
		return;
	}
	try {
		const imageBuffer = await fetchPiesImageBuffer(sub);
		await sock.sendMessage(
			chatId,
			{ image: imageBuffer, caption: S.panel({ title: 'PIE', icon: '🥧', fields: [{ icon: '🌍', label: 'Country', value: sub }], footer: S.credit() }) },
			{ quoted: message }
		);
	} catch (err) {
		console.error('Error in pies command:', err);
		await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to fetch image! Please try again.') }, { quoted: message });
	}
}

async function piesAlias(sock, chatId, message, country) {
	try {
		const imageBuffer = await fetchPiesImageBuffer(country);
		await sock.sendMessage(
			chatId,
			{ image: imageBuffer, caption: S.panel({ title: 'PIE', icon: '🥧', fields: [{ icon: '🌍', label: 'Country', value: country }], footer: S.credit() }) },
			{ quoted: message }
		);
	} catch (err) {
		console.error(`Error in pies alias (${country}) command:`, err);
		await sock.sendMessage(chatId, { text: S.error('ERROR', 'Failed to fetch image! Please try again.') }, { quoted: message });
	}
}

module.exports = { piesCommand, piesAlias, VALID_COUNTRIES };

const settings = {
  packname: 'RDX BOT',
  author: 'SARDAR RDX', // Credit / author name
  botName: "RDX BOT",
  botOwner: 'ARIF BABU', // Owner name shown in bot
  ownerNumber: '919336152663', // Set by the pairing page when you enter your number
  prefix: '.', // Command prefix
  giphyApiKey: process.env.GIPHY_API_KEY || '',
  commandMode: "public",
  maxStoreMessages: 20, 
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "3.0.7",
  updateZipUrl: "https://github.com/mruniquehacker/Knightbot-MD/archive/refs/heads/main.zip",
};

// Values changed from the pairing console are stored beside the persistent
// runtime data on hosts such as Render, rather than in the deployed source tree.
try {
  const fs = require('fs');
  const path = require('path');
  const dataDir = process.env.RDX_DATA_DIR || path.join(__dirname, 'session');
  const savedSettings = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8'));
  Object.assign(settings, savedSettings);
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.warn('Could not load saved settings:', error.message);
  }
}

module.exports = settings;

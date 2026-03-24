const express = require('express');
const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

const app = express();
app.use(express.json());

const TOKEN = 'jkuxxsoxDUwNZxXo20T3gK6zuJcwS0o8';

function isVideoLink(text) {
  return /youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com/.test(text);
}

async function sendText(chatId, text) {
  await axios.post('https://gate.whapi.cloud/messages/text', {
    to: chatId,
    body: text
  }, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
}

async function downloadAndSend(chatId, url) {
  await sendText(chatId, '⏳ Downloading your video...');
  try {
    const filename = `/tmp/video_${Date.now()}.mp4`;
    const stream = ytdl(url, { quality: 'highest' });
    const writer = fs.createWriteStream(filename);
    await new Promise((resolve, reject) => {
      stream.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
      stream.on('error', reject);
    });
    const videoData = fs.readFileSync(filename).toString('base64');
    await axios.post('https://gate.whapi.cloud/messages/video', {
      to: chatId,
      media: `data:video/mp4;base64,${videoData}`,
      caption: '🎬 Here is your video!'
    }, { headers: { Authorization: `Bearer ${TOKEN}` } });
    fs.unlinkSync(filename);
  } catch (err) {
    console.log('Download error:', err.message);
    await sendText(chatId, '❌ Failed to download. Make sure the link is public!');
  }
}

app.get('/', (req, res) => res.send('Bot is running!'));

app.use(async (req, res) => {
  try {
    const msg = req.body?.messages?.[0];
    if (!msg || msg.from_me) return res.sendStatus(200);
    const chatId = msg.chat_id;
    const text = msg.text?.body || '';
    console.log('Received:', text);
    if (isVideoLink(text)) {
      downloadAndSend(chatId, text);
    } else {
      await sendText(chatId, 'Send me a YouTube, TikTok or Instagram link! 🎬');
    }
    res.sendStatus(200);
  } catch (err) {
    console.log('Error:', err.message);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Bot running on port ' + PORT));

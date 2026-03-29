const express = require('express');
const axios = require('axios');
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
  }, { headers: { Authorization: `Bearer ${TOKEN}` } });
}

async function downloadAndSend(chatId, url) {
  await sendText(chatId, '⏳ Downloading your video...');

  try {
    // Get download link from cobalt
    const cobalt = await axios.post('https://api.cobalt.tools/', {
      url: url,
      videoQuality: '720',
      filenameStyle: 'basic'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log('Cobalt response:', cobalt.data);

    const downloadUrl = cobalt.data.url;
    if (!downloadUrl) {
      await sendText(chatId, '❌ Could not get download link');
      return;
    }

    // Download the video
    const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    const videoData = Buffer.from(response.data).toString('base64');

    // Send to WhatsApp
    await axios.post('https://gate.whapi.cloud/messages/video', {
      to: chatId,
      media: `data:video/mp4;base64,${videoData}`,
      caption: '🎬 Here is your video!'
    }, { headers: { Authorization: `Bearer ${TOKEN}` } });

  } catch (err) {
    console.log('Error:', err.response?.data || err.message);
    await sendText(chatId, '❌ Failed: ' + (err.response?.data?.error?.code || err.message));
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

const express = require('express');
const axios = require('axios');
const { execSync, exec } = require('child_process');
const fs = require('fs');

const app = express();
app.use(express.json());

const TOKEN = 'jkuxxsoxDUwNZxXo20T3gK6zuJcwS0o8';
const YTDLP = '/opt/render/project/src/bin/yt-dlp';
const COOKIES = '/opt/render/project/src/cookies.txt';
const DENO = '/opt/render/project/src/deno/bin/deno';

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
  const filename = `/tmp/video_${Date.now()}.mp4`;
  const cookieFlag = fs.existsSync(COOKIES) ? `--cookies "${COOKIES}"` : '';
  const denoFlag = fs.existsSync(DENO) ? `--js-runtimes deno:${DENO}` : '';

  exec(`${YTDLP} ${cookieFlag} ${denoFlag} -o "${filename}" --merge-output-format mp4 "${url}"`, async (err, stdout, stderr) => {
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    if (err) {
      await sendText(chatId, '❌ Error: ' + (stderr || err.message).slice(0, 300));
      return;
    }
    try {
      const videoData = fs.readFileSync(filename).toString('base64');
      await axios.post('https://gate.whapi.cloud/messages/video', {
        to: chatId,
        media: `data:video/mp4;base64,${videoData}`,
        caption: '🎬 Here is your video!'
      }, { headers: { Authorization: `Bearer ${TOKEN}` } });
      fs.unlinkSync(filename);
    } catch (e) {
      await sendText(chatId, '❌ Send error: ' + e.message.slice(0, 200));
    }
  });
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

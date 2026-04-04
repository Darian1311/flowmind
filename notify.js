const http = require('http');
const https = require('https');

const BOT_TOKEN = '8773275820:AAGM8oNKBPvAj0hNxmmxkHyHPsvtCKXWs10';
const CHAT_ID   = '6266841438';
const PORT      = process.env.PORT || 3000;

// ── Trimite mesaj pe Telegram
function sendTelegram(text) {
  const body = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' });

  const options = {
    hostname: 'api.telegram.org',
    path:     `/bot${BOT_TOKEN}/sendMessage`,
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.ok) resolve(parsed);
        else reject(new Error(parsed.description));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Formatează mesajul Telegram
function buildMessage(fields) {
  const val = (v) => (v && v.trim()) ? v.trim() : '—';

  return [
    '🔔 <b>Mesaj nou pe FlowMind!</b>',
    '',
    `👤 <b>Nume:</b> ${val(fields.nume)}`,
    `📧 <b>Email:</b> ${val(fields.email)}`,
    `🏢 <b>Companie:</b> ${val(fields.companie)}`,
    `🤖 <b>Soluție de interes:</b> ${val(fields.solutie_de_interes)}`,
    '',
    `💬 <b>Mesaj:</b>`,
    val(fields.mesaj),
  ].join('\n');
}

// ── Server HTTP
const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('FlowMind notify server running.');
    return;
  }

  // Webhook Formspree
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);

        // Formspree trimite datele fie direct, fie sub payload.data
        const fields = payload.data || payload;

        const message = buildMessage(fields);
        await sendTelegram(message);

        console.log(`[${new Date().toISOString()}] Mesaj trimis pe Telegram pentru: ${fields.email || '?'}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Eroare:`, err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });

    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[FlowMind] Notify server pornit pe portul ${PORT}`);
  console.log(`[FlowMind] Webhook URL: http://localhost:${PORT}/webhook`);
});

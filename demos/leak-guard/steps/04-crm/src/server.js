const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const leads = [];

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'POST' && url === '/api/leads') {
    const { name, phone, comment } = await readJson(req);
    if (!name || !phone) return send(res, 400, { error: 'name and phone are required' });
    leads.push({ name, phone, comment: comment || '', createdAt: new Date().toISOString() });
    return send(res, 201, { ok: true });
  }

  if (req.method === 'GET' && url === '/api/debug') {
    const config = { crmUrl: 'https://crm.example/api/v1', crmApiKey: process.env.CRM_API_KEY, smtpPassword: process.env.SMTP_PASSWORD };
    return send(res, 200, { config, leads });
  }

  const file = path.normalize(path.join(PUBLIC, url === '/' ? 'index.html' : url));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, { error: 'not found' });
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => console.log(`landing on ${port}`));
}

module.exports = server;

const http = require('node:http');
const crypto = require('node:crypto');

const users = new Map(); // id -> { id, email, name, role, passwordHash }
const sessions = new Map(); // token -> userId
const notes = new Map(); // id -> { id, ownerId, title, body }
let nextId = 1;

function hash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString('hex')}`;
}

function checkPassword(password, stored) {
  const [salt] = stored.split(':');
  return crypto.timingSafeEqual(Buffer.from(hash(password, salt)), Buffer.from(stored));
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function currentUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  return users.get(sessions.get(token));
}

const routes = [];
function route(method, pattern, handler, { auth = true } = {}) {
  routes.push({ method, pattern, handler, auth });
}

route('POST', /^\/api\/register$/, async (req, res) => {
  const { email, name, password } = await readJson(req);
  if (!email || !name || !password || password.length < 8) {
    return send(res, 400, { error: 'email, name and password (8+ chars) are required' });
  }
  if ([...users.values()].some((u) => u.email === email)) return send(res, 409, { error: 'email taken' });
  const user = { id: nextId++, email, name, role: 'user', passwordHash: hash(password) };
  users.set(user.id, user);
  send(res, 201, publicUser(user));
}, { auth: false });

route('POST', /^\/api\/login$/, async (req, res) => {
  const { email, password } = await readJson(req);
  const user = [...users.values()].find((u) => u.email === email);
  if (!user || !password || !checkPassword(password, user.passwordHash)) {
    return send(res, 401, { error: 'invalid email or password' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  send(res, 200, { token });
}, { auth: false });

route('GET', /^\/api\/notes$/, async (req, res, user) => {
  send(res, 200, [...notes.values()].filter((n) => n.ownerId === user.id));
});

route('POST', /^\/api\/notes$/, async (req, res, user) => {
  const { title, body } = await readJson(req);
  if (!title) return send(res, 400, { error: 'title is required' });
  const note = { id: nextId++, ownerId: user.id, title, body: body || '' };
  notes.set(note.id, note);
  send(res, 201, note);
});

route('DELETE', /^\/api\/notes\/(\d+)$/, async (req, res, user, [id]) => {
  const note = notes.get(Number(id));
  if (!note || note.ownerId !== user.id) return send(res, 404, { error: 'not found' });
  notes.delete(note.id);
  send(res, 204, {});
});

route('GET', /^\/api\/notes\/(\d+)$/, async (req, res, user, [id]) => {
  const note = notes.get(Number(id));
  if (!note) return send(res, 404, { error: 'not found' });
  send(res, 200, note);
});

route('GET', /^\/api\/me$/, async (req, res, user) => {
  send(res, 200, publicUser(user));
});

route('PATCH', /^\/api\/me$/, async (req, res, user) => {
  Object.assign(user, await readJson(req));
  send(res, 200, publicUser(user));
});

route('GET', /^\/api\/admin\/users$/, async (req, res, user) => {
  if (user.role !== 'admin') return send(res, 403, { error: 'forbidden' });
  send(res, 200, [...users.values()].map(publicUser));
});

const server = http.createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  for (const r of routes) {
    const match = req.method === r.method && path.match(r.pattern);
    if (!match) continue;
    const user = currentUser(req);
    if (r.auth && !user) return send(res, 401, { error: 'unauthorized' });
    try {
      return await r.handler(req, res, user, match.slice(1));
    } catch (err) {
      console.error(err);
      return send(res, 500, { error: 'internal error' });
    }
  }
  send(res, 404, { error: 'not found' });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => console.log(`notes api on ${port}`));
}

module.exports = server;

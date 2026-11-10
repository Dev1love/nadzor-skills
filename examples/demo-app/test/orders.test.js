process.env.DB_PATH = ':memory:';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const app = require('../src/server');
const db = require('../src/db');

let server;
let baseUrl;
let token;

async function post(path, body, authToken) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await post('/api/register', { email: 'buyer@example.com', name: 'Buyer', password: 'correct-horse-1' });
  token = (await post('/api/login', { email: 'buyer@example.com', password: 'correct-horse-1' })).body.token;
  db.prepare("INSERT INTO promo_codes (code, percent, expires_at, max_uses, used) VALUES ('ONCE', 10, '2099-12-31', 1, 0)").run();
});

after(() => server.close());

test('promo code with max_uses = 1 works only once', async () => {
  const order = { items: [{ productId: 1, qty: 1 }], address: 'Lenina 1', phone: '+70000000000', zone: 'msk', promoCode: 'ONCE' };
  const first = await post('/api/orders', order, token);
  assert.equal(first.status, 201);
  assert.ok(first.body.discount > 0);

  const second = await post('/api/orders', order, token);
  assert.equal(second.status, 409);
  assert.equal(db.prepare("SELECT used FROM promo_codes WHERE code = 'ONCE'").get().used, 1);
});

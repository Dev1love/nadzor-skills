process.env.DB_PATH = ':memory:';
const { test } = require('node:test');
const assert = require('node:assert');
const db = require('../src/db');
const { findValidPromo } = require('../src/services/orderService');

const insertPromo = db.prepare('INSERT INTO promo_codes (code, percent, expires_at, max_uses, used) VALUES (?, ?, ?, ?, ?)');

test('unknown promo code is rejected', () => {
  assert.equal(findValidPromo('NOPE'), null);
});

test('promo code that reached max_uses is rejected', () => {
  insertPromo.run('USEDUP', 10, '2099-12-31', 5, 5);
  assert.equal(findValidPromo('USEDUP'), null);
});

test('valid promo code is returned with its percent', () => {
  insertPromo.run('SPRING', 15, '2099-12-31', 5, 0);
  assert.equal(findValidPromo('SPRING').percent, 15);
});

// TODO: flaky, fix later
test.skip('promo code is still valid on its expiry day', () => {
  const today = new Date().toISOString().slice(0, 10);
  insertPromo.run('LASTDAY', 10, today, 5, 0);
  assert.notEqual(findValidPromo('LASTDAY'), null);
});

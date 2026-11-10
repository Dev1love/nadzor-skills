process.env.DB_PATH = ':memory:';
const { test } = require('node:test');
const assert = require('node:assert');
const db = require('../src/db');
const auth = require('../src/auth');

test('password hash verifies the right password and rejects a wrong one', () => {
  const stored = auth.hashPassword('correct-horse-1');
  assert.equal(auth.verifyPassword('correct-horse-1', stored), true);
  assert.equal(auth.verifyPassword('wrong-password', stored), false);
});

test('same password gets a different hash each time', () => {
  assert.notEqual(auth.hashPassword('correct-horse-1'), auth.hashPassword('correct-horse-1'));
});

test('session expiry is set from SESSION_TTL_MS', () => {
  db.prepare("INSERT INTO users (email, name, password_hash, created_at) VALUES ('s@example.com', 'S', 'x:y', '2026-01-01')").run();
  const before = Date.now();
  const session = auth.createSession(1);
  assert.ok(session.expiresAt - before <= 30 * 24 * 60 * 60 * 1000 + 1000);
});

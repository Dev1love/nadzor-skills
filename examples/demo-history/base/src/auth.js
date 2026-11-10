const crypto = require('node:crypto');
const db = require('./db');

const SESSION_TTL_MS = 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return { token, expiresAt };
}

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token);
  if (!row || row.expires_at < Date.now()) return res.status(401).json({ error: 'unauthorized' });

  req.user = { id: row.id, email: row.email, name: row.name, role: row.role };
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}

const attempts = new Map();

function loginLimiter(req, res, next) {
  const now = Date.now();
  const entry = attempts.get(req.ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(req.ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX_ATTEMPTS) return res.status(429).json({ error: 'too many attempts' });
  next();
}

module.exports = { SESSION_TTL_MS, hashPassword, verifyPassword, createSession, requireAuth, requireAdmin, loginLimiter };

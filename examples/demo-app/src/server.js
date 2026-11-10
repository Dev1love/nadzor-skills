const express = require('express');
const path = require('node:path');
const db = require('./db');
const auth = require('./auth');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  db.prepare(
    `INSERT OR IGNORE INTO users (email, name, password_hash, role, created_at) VALUES (?, 'Admin', ?, 'admin', ?)`
  ).run(process.env.ADMIN_EMAIL, auth.hashPassword(process.env.ADMIN_PASSWORD), new Date().toISOString());
}

app.post('/api/register', (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password || password.length < 8) {
    return res.status(400).json({ error: 'email, name and password (8+ chars) are required' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'email already registered' });

  const result = db
    .prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(email, name, auth.hashPassword(password), new Date().toISOString());
  res.status(201).json({ id: Number(result.lastInsertRowid), email, name });
});

app.post('/api/login', auth.loginLimiter, (req, res) => {
  const { email, password } = req.body;
  const user = email && db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
  if (!user || !password || !auth.verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid email or password' });
  }
  res.json(auth.createSession(user.id));
});

// Sort options are whitelisted: the value from the query never reaches SQL as is.
const PRODUCT_SORT = { price: 'price', newest: 'created_at DESC', title: 'title' };

app.get('/api/products', (req, res) => {
  const orderBy = PRODUCT_SORT[req.query.sort] || 'id';
  const products = db.prepare(`SELECT id, title, price, stock FROM products ORDER BY ${orderBy}`).all();
  res.json(products);
});

app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/webhooks', require('./routes/webhooks'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message, stack: err.stack, details: err });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`shop listening on ${port}`));
}

module.exports = app;

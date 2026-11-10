const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, '..', 'shop.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    percent INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    max_uses INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL NOT NULL,
    shipping REAL NOT NULL,
    total REAL NOT NULL,
    zone TEXT,
    promo_code TEXT,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty INTEGER NOT NULL,
    price INTEGER NOT NULL
  );
`);

const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get();
if (count === 0) {
  const insert = db.prepare('INSERT INTO products (title, price, stock, created_at) VALUES (?, ?, ?, ?)');
  const now = new Date().toISOString();
  insert.run('Кружка', 1290, 50, now);
  insert.run('Футболка', 1990, 30, now);
  insert.run('Рюкзак', 4590, 10, now);
}

module.exports = db;

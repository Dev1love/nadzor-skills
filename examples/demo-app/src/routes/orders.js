const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const pricing = require('../services/pricing');
const { findValidPromo, cancelOrder } = require('../services/orderService');
const { formatPriceForReceipt } = require('../lib/format');
const notifier = require('../notifications');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const orders = db
    .prepare('SELECT id, status, total, created_at FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id);
  res.json(orders);
});

router.post('/preview', (req, res) => {
  const items = (req.body.items || []).map((item) => {
    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.productId);
    return { price: product ? product.price : 0, qty: item.qty };
  });
  const promo = req.body.promoCode ? findValidPromo(req.body.promoCode) : null;
  res.json(pricing.calculateTotal(items, promo, req.body.zone));
});

router.post('/', (req, res) => {
  const { items, address, phone, zone, promoCode } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'cart is empty' });
  if (!address || !phone) return res.status(400).json({ error: 'address and phone are required' });

  let subtotal = 0;
  const lines = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    if (!product) return res.status(400).json({ error: `product ${item.productId} not found` });
    if (product.stock < item.qty) return res.status(409).json({ error: `not enough stock for ${product.title}` });
    subtotal += product.price * item.qty;
    lines.push({ productId: product.id, qty: item.qty, price: product.price });
  }

  let discount = 0;
  let promo = null;
  if (promoCode) {
    promo = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(promoCode);
    if (!promo || new Date(promo.expires_at) < new Date()) {
      return res.status(400).json({ error: 'promo code is invalid or expired' });
    }
    discount = (subtotal * promo.percent) / 100;
  }
  const shipping = subtotal >= 5000 ? 0 : 300;
  const total = subtotal - discount + shipping;

  db.exec('BEGIN');
  try {
    if (promo) {
      const updated = db
        .prepare('UPDATE promo_codes SET used = used + 1 WHERE code = ? AND used < max_uses')
        .run(promo.code);
      if (updated.changes === 0) {
        db.exec('ROLLBACK');
        return res.status(409).json({ error: 'promo code usage limit reached' });
      }
    }

    const order = db
      .prepare(
        `INSERT INTO orders (user_id, status, subtotal, discount, shipping, total, zone, promo_code, address, phone, created_at)
         VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.user.id, subtotal, discount, shipping, total, zone || null, promo ? promo.code : null, address, phone, new Date().toISOString());

    for (const line of lines) {
      db.prepare('INSERT INTO order_items (order_id, product_id, qty, price) VALUES (?, ?, ?, ?)').run(
        order.lastInsertRowid,
        line.productId,
        line.qty,
        line.price
      );
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(line.qty, line.productId);
    }
    db.exec('COMMIT');

    try {
      notifier.send('email', req.user.email, 'Заказ оформлен', `Заказ №${order.lastInsertRowid} на ${total} ₽`);
    } catch (e) {}

    res.status(201).json({ id: Number(order.lastInsertRowid), subtotal, discount, shipping, total });
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
});

router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  order.items = db.prepare('SELECT product_id, qty, price FROM order_items WHERE order_id = ?').all(order.id);
  res.json(order);
});

router.get('/:id/receipt', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  res
    .type('text/plain')
    .send(
      [
        `Заказ №${order.id}`,
        `Товары: ${formatPriceForReceipt(order.subtotal)}`,
        `Скидка: ${formatPriceForReceipt(order.discount)}`,
        `Доставка: ${formatPriceForReceipt(order.shipping)}`,
        `Итого: ${formatPriceForReceipt(order.total)}`,
      ].join('\n')
    );
});

router.post('/:id/cancel', (req, res) => {
  const result = cancelOrder(req.params.id, req.user.id);
  if (!result.ok) return res.status(result.reason === 'not_found' ? 404 : 409).json({ error: result.reason });
  res.json({ status: 'cancelled' });
});

module.exports = router;

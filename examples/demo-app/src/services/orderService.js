const db = require('../db');

function findValidPromo(code) {
  const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(code);
  if (!promo) return null;
  if (new Date(promo.expires_at) < new Date()) return null;
  if (promo.used >= promo.max_uses) return null;
  return promo;
}

function cancelOrder(orderId, userId) {
  const order = db.prepare('SELECT id, status FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
  if (!order) return { ok: false, reason: 'not_found' };
  if (order.status !== 'new') return { ok: false, reason: 'not_cancellable' };

  db.exec('BEGIN');
  try {
    const items = db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(orderId);
    for (const item of items) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.qty, item.product_id);
    }
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(orderId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { ok: true };
}

module.exports = { findValidPromo, cancelOrder };

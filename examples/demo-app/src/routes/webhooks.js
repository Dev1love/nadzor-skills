const express = require('express');
const db = require('../db');
const notifier = require('../notifications');

const router = express.Router();

router.post('/payment', (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (status === 'succeeded') {
      db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
      const order = db
        .prepare('SELECT o.id, o.total, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?')
        .get(orderId);
      notifier.send('email', order.email, 'Оплата получена', `Заказ №${order.id} оплачен`);
    }
  } catch (err) {
    console.log('payment webhook failed', err);
  }
  res.json({ received: true });
});

module.exports = router;

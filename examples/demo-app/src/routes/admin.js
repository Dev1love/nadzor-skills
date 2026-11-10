const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { formatPriceForCsv } = require('../lib/format');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const ORDERS_QUERY = `
  SELECT o.id, o.status, o.total, o.created_at, u.email
  FROM orders o JOIN users u ON u.id = o.user_id
  ORDER BY o.id DESC
`;

router.get('/orders', (req, res) => {
  res.json(db.prepare(ORDERS_QUERY).all());
});

router.get('/orders.csv', (req, res) => {
  const rows = db.prepare(ORDERS_QUERY).all();
  const lines = ['id;email;total;status;created_at'];
  for (const row of rows) {
    lines.push([row.id, row.email, formatPriceForCsv(row.total), row.status, row.created_at].join(';'));
  }
  res.type('text/csv').send(lines.join('\n'));
});

module.exports = router;

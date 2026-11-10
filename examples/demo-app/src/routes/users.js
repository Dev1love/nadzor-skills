const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

router.get('/me', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.patch('/me', (req, res) => {
  const fields = Object.keys(req.body);
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });

  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${assignments} WHERE id = ?`).run(...fields.map((field) => req.body[field]), req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;

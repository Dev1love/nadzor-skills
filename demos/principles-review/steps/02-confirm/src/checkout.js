const db = require('./db');
const { orderTotal } = require('./orders');
const { NotifierFactory } = require('./notify');
const { renderConfirmationEmail } = require('./email');
const { renderReceipt } = require('./receipt');

function checkout(input) {
  if (!input.email || !input.email.includes('@')) throw new Error('email is required');
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('cart is empty');
  for (const item of input.items) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) throw new Error(`bad qty for ${item.title}`);
  }

  const order = db.saveOrder({
    email: input.email,
    items: input.items,
    totalKop: orderTotal(input.items),
    createdAt: new Date().toISOString(),
  });

  NotifierFactory.create('email').send(order.email, 'Заказ оформлен', renderConfirmationEmail(order));
  return { order, receipt: renderReceipt(order) };
}

module.exports = { checkout };

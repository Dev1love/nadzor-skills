const { test } = require('node:test');
const assert = require('node:assert');
const { checkout } = require('../src/checkout');

test('checkout saves the order and returns a receipt', () => {
  const { order, receipt } = checkout({
    email: 'buyer@example.com',
    items: [{ title: 'Кружка', priceKop: 12350, qty: 2 }],
  });
  assert.equal(order.totalKop, 24700);
  assert.match(receipt, /Итого: 247 ₽/);
});

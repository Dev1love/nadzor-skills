const { test } = require('node:test');
const assert = require('node:assert');
const { cartTotal } = require('../src/cart');

test('subtotal sums price times quantity', () => {
  assert.equal(cartTotal([{ price: 1200, qty: 2 }, { price: 300, qty: 1 }]).subtotal, 2700);
});

test('shipping is free for big orders', () => {
  assert.equal(cartTotal([{ price: 3000, qty: 1 }]).shipping, 0);
});

test('total includes the discount', () => {
  const cart = cartTotal([{ price: 4000, qty: 1 }]);
  assert.equal(cart.discount, 400);
  assert.equal(cart.total, 3600);
});

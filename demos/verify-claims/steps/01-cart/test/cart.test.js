const { test } = require('node:test');
const assert = require('node:assert');
const { cartTotal } = require('../src/cart');

test('subtotal sums price times quantity', () => {
  assert.equal(cartTotal([{ price: 1200, qty: 2 }, { price: 300, qty: 1 }]).subtotal, 2700);
});

test('shipping is charged below 5000 and free from 5000', () => {
  assert.equal(cartTotal([{ price: 4999, qty: 1 }]).shipping, 350);
  assert.equal(cartTotal([{ price: 5000, qty: 1 }]).shipping, 0);
});

const { test } = require('node:test');
const assert = require('node:assert');
const { orderTotal } = require('../src/orders');

test('orderTotal sums kopecks', () => {
  assert.equal(orderTotal([{ priceKop: 12350, qty: 2 }, { priceKop: 99, qty: 1 }]), 24799);
});

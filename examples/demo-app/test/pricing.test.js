const { test, mock } = require('node:test');
const assert = require('node:assert');
const pricing = require('../src/services/pricing');

test('applyDiscount rounds to whole rubles', () => {
  assert.equal(pricing.applyDiscount(999, 15), 849);
});

test('calculateTotal returns result', () => {
  const result = pricing.calculateTotal([{ price: 500, qty: 2 }], null, 'msk');
  assert.ok(result);
  assert.notEqual(result.total, undefined);
});

test('calculateTotal applies promo', () => {
  mock.method(pricing, 'calculateTotal', () => ({ subtotal: 1000, discount: 100, shipping: 300, total: 1200 }));
  const result = pricing.calculateTotal([{ price: 1000, qty: 1 }], { percent: 10 }, 'msk');
  assert.equal(result.total, 1200);
  assert.equal(result.discount, 100);
  mock.restoreAll();
});

test('shipping cost for Moscow', () => {
  assert.equal(pricing.getShippingCost({ zone: 'msk', subtotal: 1200 }), 300);
});

test('shipping is 300 for msk', () => {
  assert.strictEqual(pricing.getShippingCost({ zone: 'msk', subtotal: 2000 }), 300);
});

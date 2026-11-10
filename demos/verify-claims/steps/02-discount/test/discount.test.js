const { test } = require('node:test');
const assert = require('node:assert');
const { discountFor } = require('../src/discount');

test('no discount below 3000', () => {
  assert.equal(discountFor(2999), 0);
});

test('10% from 3000', () => {
  assert.equal(discountFor(3000), 300);
});

test('discount is rounded to whole rubles', () => {
  assert.equal(discountFor(3005), 301);
});

test.skip('15% for loyal customers (5+ orders)', () => {
  assert.equal(discountFor(4000, 5), 600);
});

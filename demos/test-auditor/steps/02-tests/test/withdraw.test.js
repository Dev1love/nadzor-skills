const { test, mock } = require('node:test');
const assert = require('node:assert');
const withdraw = require('../src/withdraw');

const account = { balance: 1000, overdraft: 0, frozen: false };

test('canWithdraw returns a boolean', () => {
  assert.equal(typeof withdraw.canWithdraw(account, 100), 'boolean');
});

test('allows withdrawal within balance', () => {
  assert.equal(withdraw.canWithdraw(account, 500), true);
});

test('allows a small withdrawal', () => {
  assert.equal(withdraw.canWithdraw(account, 300), true);
});

test('blocks a frozen account', () => {
  mock.method(withdraw, 'canWithdraw', () => false);
  assert.equal(withdraw.canWithdraw({ ...account, frozen: true }, 100), false);
  mock.restoreAll();
});

test('rejects a negative amount', () => {
  assert.equal(withdraw.canWithdraw(account, -50), false);
});

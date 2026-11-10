// Overdraft is a credit line: the balance may go below zero, but not below -overdraft.
function canWithdraw(account, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (account.frozen) return false;
  return amount <= account.balance + account.overdraft;
}

module.exports = { canWithdraw };

const REFERRAL_BONUS = 300;

// The bonus is paid once, after the friend's first completed order.
function referralBonus(friendCompletedOrders) {
  return friendCompletedOrders >= 1 ? REFERRAL_BONUS : 0;
}

module.exports = { REFERRAL_BONUS, referralBonus };

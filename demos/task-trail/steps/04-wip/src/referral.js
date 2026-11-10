const REFERRAL_BONUS = 300;

function referralBonus(friendOrders) {
  return friendOrders > 0 ? REFERRAL_BONUS : 0;
}

module.exports = { referralBonus };

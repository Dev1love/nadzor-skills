const DISCOUNT_FROM = 3000;
const DISCOUNT_PERCENT = 10;

function discountFor(subtotal, ordersCount = 0) {
  if (subtotal < DISCOUNT_FROM) return 0;
  // TODO: loyal customers
  return Math.round((subtotal * DISCOUNT_PERCENT) / 100);
}

module.exports = { discountFor };

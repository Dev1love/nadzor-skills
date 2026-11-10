function applyDiscount(subtotal, percent) {
  return Math.round((subtotal * (100 - percent)) / 100);
}

function getShippingCost(order) {
  // TODO: shipping zones
  return 300;
}

function calculateTotal(items, promo, zone) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = promo ? subtotal - applyDiscount(subtotal, promo.percent) : 0;
  const shipping = getShippingCost({ zone, subtotal });
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

module.exports = { applyDiscount, getShippingCost, calculateTotal };

const { discountFor } = require('./discount');

const FREE_SHIPPING_FROM = 3000;
const SHIPPING = 350;

function cartTotal(items, ordersCount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = discountFor(subtotal, ordersCount);
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

module.exports = { cartTotal, FREE_SHIPPING_FROM };

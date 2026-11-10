const FREE_SHIPPING_FROM = 5000;
const SHIPPING = 350;

function cartTotal(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
  return { subtotal, shipping, total: subtotal + shipping };
}

module.exports = { cartTotal, FREE_SHIPPING_FROM };

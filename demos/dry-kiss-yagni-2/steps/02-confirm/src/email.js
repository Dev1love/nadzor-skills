const { formatDateForCustomer } = require('./dates');

function renderConfirmationEmail(order) {
  const total = (order.totalKop / 100).toFixed(2).replace('.', ',') + ' ₽';
  return `Заказ №${order.id} от ${formatDateForCustomer(order.createdAt)} оформлен.\nСумма: ${total}`;
}

module.exports = { renderConfirmationEmail };

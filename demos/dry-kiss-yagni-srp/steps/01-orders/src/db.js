const orders = [];

function saveOrder(order) {
  const saved = { ...order, id: orders.length + 1 };
  orders.push(saved);
  return saved;
}

module.exports = { saveOrder };

function renderReceipt(order) {
  const lines = order.items.map((item) => {
    const sum = Math.round((item.priceKop * item.qty) / 100);
    return `${item.title} x${item.qty}: ${sum} ₽`;
  });
  const total = Math.round(order.totalKop / 100);
  return [...lines, `Итого: ${total} ₽`].join('\n');
}

module.exports = { renderReceipt };

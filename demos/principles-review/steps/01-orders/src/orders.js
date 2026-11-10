// All money is in kopecks (integers) to avoid float errors.
function orderTotal(items) {
  return items.reduce((sum, item) => sum + item.priceKop * item.qty, 0);
}

module.exports = { orderTotal };

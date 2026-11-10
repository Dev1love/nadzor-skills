function applyPromo(total, percent) {
  return total - Math.floor((total * percent) / 100);
}

module.exports = { applyPromo };

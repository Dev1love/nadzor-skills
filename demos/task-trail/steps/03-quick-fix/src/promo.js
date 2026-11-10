function applyPromo(total, percent) {
  return total - Math.round((total * percent) / 100);
}

module.exports = { applyPromo };

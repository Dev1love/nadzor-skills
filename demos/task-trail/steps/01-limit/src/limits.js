const MAX_FIRST_ORDER = 5000;

function canPlaceFirstOrder(total) {
  return total <= MAX_FIRST_ORDER;
}

module.exports = { MAX_FIRST_ORDER, canPlaceFirstOrder };

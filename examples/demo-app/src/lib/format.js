// Shown to the customer on the receipt: local format with the currency sign.
function formatPriceForReceipt(rub) {
  return `${Math.round(rub).toLocaleString('ru-RU')} ₽`;
}

// The CSV is imported by the accountant's software: plain number, dot, two decimals.
function formatPriceForCsv(rub) {
  return Number(rub).toFixed(2);
}

module.exports = { formatPriceForReceipt, formatPriceForCsv };

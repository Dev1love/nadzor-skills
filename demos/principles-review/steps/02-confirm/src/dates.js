// Customers read dates in the email: Russian words, no leading zeros.
function formatDateForCustomer(date) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// The accountant's import program accepts only YYYY-MM-DD.
function formatDateForExport(date) {
  return new Date(date).toISOString().slice(0, 10);
}

module.exports = { formatDateForCustomer, formatDateForExport };

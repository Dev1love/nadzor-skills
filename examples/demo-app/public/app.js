const PAYGATE_API = 'https://api.paygate.example/v1';
const PAYGATE_SECRET_KEY = 'pg_live_7Hq2kT9xLm4Rv8Wz1Bn6Yc3Fd5Gs0Jp';

let token = localStorage.getItem('token');
const cart = new Map();

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return res.json();
}

async function loadProducts() {
  const products = await api('/api/products');
  const list = document.getElementById('products');
  list.replaceChildren();
  for (const product of products) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    item.textContent = `${product.title}: ${product.price} ₽ `;
    button.textContent = 'В корзину';
    button.addEventListener('click', () => cart.set(product.id, (cart.get(product.id) || 0) + 1));
    item.append(button);
    list.append(item);
  }
}

async function loadProfile() {
  if (!token) return;
  const me = await api('/api/users/me');
  document.getElementById('admin-link').hidden = me.role !== 'admin';
  document.getElementById('checkout-form').hidden = false;
}

async function pay(order) {
  const res = await fetch(`${PAYGATE_API}/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYGATE_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: order.total, orderId: order.id, returnUrl: location.origin }),
  });
  const payment = await res.json();
  location.href = payment.confirmationUrl;
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const session = await api('/api/login', { method: 'POST', body: Object.fromEntries(form) });
  if (session.token) {
    token = session.token;
    localStorage.setItem('token', token);
    await loadProfile();
  }
});

document.getElementById('checkout-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.target));
  const items = [...cart].map(([productId, qty]) => ({ productId, qty }));
  const order = await api('/api/orders', { method: 'POST', body: { ...form, items } });
  if (order.id) await pay(order);
});

loadProducts();
loadProfile();

document.getElementById('lead-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const lead = Object.fromEntries(new FormData(event.target));
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  // send to CRM right away so managers see the lead without waiting for the sync
  fetch('https://crm.example/api/v1/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${window.CRM_API_KEY}` },
    body: JSON.stringify(lead),
  }).catch(() => {});
  document.getElementById('status').textContent = res.ok ? 'Спасибо, перезвоним!' : 'Ошибка, попробуйте ещё раз';
});

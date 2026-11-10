document.getElementById('lead-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const lead = Object.fromEntries(new FormData(event.target));
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  document.getElementById('status').textContent = res.ok ? 'Спасибо, перезвоним!' : 'Ошибка, попробуйте ещё раз';
});

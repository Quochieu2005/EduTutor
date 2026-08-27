document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('[data-status-filter]');
  const menu = document.querySelector('.users-status-popover');
  if (!trigger || !menu) return;

  const close = () => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
  trigger.addEventListener('click', () => {
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    trigger.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) menu.querySelector('input[type="search"]')?.focus();
  });
  document.addEventListener('click', (event) => { if (!menu.contains(event.target) && !trigger.contains(event.target)) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  menu.querySelector('input[type="search"]')?.addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    menu.querySelectorAll('.users-status-options label').forEach((option) => { option.hidden = !option.textContent.toLowerCase().includes(query); });
  });
});

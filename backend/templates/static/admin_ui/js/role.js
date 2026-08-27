document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.users-toolbar__filter-options .users-filter-button');
  const trigger = buttons[1];
  const menu = document.querySelector('.users-role-popover');
  if (!trigger || !menu) return;
  trigger.addEventListener('click', () => {
    const open = menu.hidden;
    document.querySelectorAll('.users-status-popover, .users-role-popover').forEach((item) => { item.hidden = true; });
    menu.hidden = !open;
    if (open) menu.querySelector('input[type="search"]')?.focus();
  });
  document.addEventListener('click', (event) => { if (!menu.contains(event.target) && !trigger.contains(event.target)) menu.hidden = true; });
  menu.querySelector('input[type="search"]')?.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    menu.querySelectorAll('.users-status-options label').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('.users-view-button');
  const menu = document.querySelector('.users-view-popover');
  if (!trigger || !menu) return;
  trigger.addEventListener('click', () => { menu.hidden = !menu.hidden; });
  menu.querySelectorAll('label').forEach((label) => label.addEventListener('click', () => { const column = label.textContent.trim(); const index = column === 'Email' ? 3 : 4; label.classList.toggle('is-hidden'); label.querySelector('.users-view-check').hidden = label.classList.contains('is-hidden'); document.querySelectorAll('.users-table tr').forEach((row) => { row.children[index].hidden = label.classList.contains('is-hidden'); }); }));
  document.addEventListener('click', (event) => { if (!menu.contains(event.target) && !trigger.contains(event.target)) menu.hidden = true; });
});

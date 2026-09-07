document.addEventListener('DOMContentLoaded', () => {
  const filters = document.querySelector('.users-toolbar__filters');
  const menu = document.querySelector('.users-status-popover');
  if (!filters || !menu) return;

  const render = () => {
    filters.querySelector('.users-selected-filters')?.remove();
    const selected = [...menu.querySelectorAll('input:checked')]
      .map((input) => input.closest('label')?.querySelector('span')?.textContent)
      .filter(Boolean);
    if (!selected.length) return;

    const group = document.createElement('div');
    group.className = 'users-selected-filters';
    group.innerHTML = `${selected.map((name) => `<span>${name}</span>`).join('')}<button type="button" data-reset>Reset</button><button type="button" data-reset aria-label="Clear filters"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"></path></svg></button>`;
    filters.appendChild(group);
    group.querySelectorAll('[data-reset]').forEach((button) => {
      button.addEventListener('click', () => {
        menu.querySelectorAll('input').forEach((input) => { input.checked = false; });
        menu.dispatchEvent(new Event('change', { bubbles: true }));
        render();
      });
    });
  };

  menu.addEventListener('change', render);
});

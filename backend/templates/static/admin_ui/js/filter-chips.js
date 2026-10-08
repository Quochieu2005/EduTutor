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
    selected.forEach((name) => {
      const chip = document.createElement('span');
      chip.textContent = name;
      group.appendChild(chip);
    });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.dataset.reset = '';
    reset.textContent = 'Reset';
    group.appendChild(reset);
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.dataset.reset = '';
    clear.setAttribute('aria-label', 'Xóa bộ lọc');
    clear.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
    group.appendChild(clear);
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

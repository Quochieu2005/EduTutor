document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.users-sortable-head').forEach((head) => {
    const email = head.textContent.includes('Email');
    head.tabIndex = 0;
    const menu = document.createElement('div'); menu.className = 'users-sort-menu'; menu.hidden = true;
    menu.innerHTML = `<button>↑&nbsp; Asc</button><button>↓&nbsp; Desc</button>${email ? '<hr><button>⊘&nbsp; Hide</button>' : ''}`;
    head.appendChild(menu);
    menu.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { const action = button.textContent.trim(); const index = [...head.parentElement.children].indexOf(head); if (action.includes('Hide')) { document.querySelectorAll('.users-table tr').forEach((row) => { row.children[index].hidden = true; }); const viewLabel = [...document.querySelectorAll('.users-view-popover label')].find((label) => label.textContent.trim() === 'Email'); if (viewLabel) { viewLabel.classList.add('is-hidden'); viewLabel.querySelector('.users-view-check').hidden = true; } } else { const rows = [...document.querySelectorAll('.users-table tbody tr')]; const direction = action.includes('Asc') ? 1 : -1; rows.sort((a, b) => a.children[index].textContent.trim().localeCompare(b.children[index].textContent.trim()) * direction).forEach((row) => row.parentElement.appendChild(row)); } menu.hidden = true; }));
    head.addEventListener('click', (event) => { event.stopPropagation(); document.querySelectorAll('.users-sort-menu').forEach((item) => { if (item !== menu) item.hidden = true; }); menu.hidden = !menu.hidden; });
    document.addEventListener('click', () => { menu.hidden = true; });
  });
});

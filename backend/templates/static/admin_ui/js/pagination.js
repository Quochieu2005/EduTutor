document.addEventListener('DOMContentLoaded', () => {
  const rows = [...document.querySelectorAll('.users-table tbody tr')];
  const select = document.querySelector('.users-pagination select');
  const pageButtons = [...document.querySelectorAll('.users-pagination nav button')];
  let page = 1;
  const render = () => { const size = Number(select.value); const pages = Math.max(1, Math.ceil(rows.length / size)); page = Math.min(page, pages); rows.forEach((row, index) => { row.hidden = index < (page - 1) * size || index >= page * size; }); document.querySelector('.users-pagination p').textContent = `Page ${page} of ${pages}`; pageButtons.forEach((button) => button.classList.toggle('is-active', Number(button.textContent) === page)); };
  select.addEventListener('change', () => { page = 1; render(); });
  pageButtons.forEach((button) => button.addEventListener('click', () => { if (document.querySelector('.users-search input')?.value.trim()) return; const value = Number(button.textContent); if (value) { page = value; render(); } }));
  render();
});

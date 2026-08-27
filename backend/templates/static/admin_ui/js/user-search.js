document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('.users-search input');
  const rows = [...document.querySelectorAll('.users-table tbody tr')];
  if (!input) return;
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    const matches = rows.filter((row) => !query || row.textContent.toLowerCase().includes(query));
    rows.forEach((row) => { row.hidden = !matches.includes(row); });
    document.querySelector('.users-no-results')?.remove();
    if (query && matches.length === 0) { const empty = document.createElement('tr'); empty.className = 'users-no-results'; empty.innerHTML = '<td colspan="8">No results.</td>'; document.querySelector('.users-table tbody').appendChild(empty); document.querySelector('.users-pagination p').textContent = 'Page 1 of 0'; }
  });
  document.addEventListener('click', (event) => { if (event.target.closest('[data-reset]')) { input.value = ''; document.querySelector('.users-no-results')?.remove(); rows.forEach((row, index) => row.hidden = index >= 10); document.querySelector('.users-pagination p').textContent = 'Page 1 of 2'; } });
});

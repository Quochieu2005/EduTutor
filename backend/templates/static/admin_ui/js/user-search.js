document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('.users-search input');
  const statusInputs = [...document.querySelectorAll('.users-status-options input[type="checkbox"]')];
  const tbody = document.querySelector('.users-table tbody');
  const paginationText = document.querySelector('.users-pagination p');
  if (!input || !tbody) return;

  const rows = [...tbody.querySelectorAll('tr')];

  const applyFilters = () => {
    const query = input.value.trim().toLowerCase();
    const statuses = statusInputs.filter((item) => item.checked).map((item) => item.value);
    const hasFilters = query !== '' || statuses.length > 0;
    const pageSize = Number(document.querySelector('.users-pagination select')?.value || 10);
    let visibleCount = 0;

    document.querySelector('.users-no-results')?.remove();
    rows.forEach((row, index) => {
      const status = row.querySelector('.users-status')?.textContent.trim().toLowerCase() || '';
      const matchesText = !query || row.textContent.toLowerCase().includes(query);
      const matchesStatus = statuses.length === 0 || statuses.includes(status);
      const matches = matchesText && matchesStatus;
      row.hidden = !matches || (!hasFilters && index >= pageSize);
      if (matches) visibleCount += 1;
    });

    if (hasFilters && visibleCount === 0) {
      const empty = document.createElement('tr');
      empty.className = 'users-no-results';
      empty.innerHTML = '<td colspan="7">No results.</td>';
      tbody.appendChild(empty);
    }

    if (paginationText) {
      paginationText.textContent = hasFilters
        ? `Showing ${visibleCount} result${visibleCount === 1 ? '' : 's'}`
        : `Page 1 of ${Math.max(1, Math.ceil(rows.length / pageSize))}`;
    }
  };

  input.addEventListener('input', applyFilters);
  statusInputs.forEach((item) => item.addEventListener('change', applyFilters));
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-reset]')) return;
    input.value = '';
    statusInputs.forEach((item) => { item.checked = false; });
    applyFilters();
  });
});

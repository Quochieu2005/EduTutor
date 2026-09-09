document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header-fixed');
  const table = document.querySelector('.resource-table');
  const body = document.querySelector('[data-resource-body]');
  const search = document.querySelector('[data-resource-search]');
  const statusInputs = [...document.querySelectorAll('.users-status-options input[type="checkbox"]')];
  const pageSize = document.querySelector('[data-resource-page-size]');
  const pageSummary = document.querySelector('[data-resource-page-summary]');
  const currentPageButton = document.querySelector('[data-resource-current]');
  const previousButton = document.querySelector('[data-resource-prev]');
  const nextButton = document.querySelector('[data-resource-next]');
  const selectAll = document.querySelector('[data-resource-select-all]');
  const bulkBar = document.querySelector('[data-resource-bulk]');
  const selectedCount = document.querySelector('[data-resource-selected-count]');
  const modal = document.querySelector('[data-resource-modal]');
  const form = document.querySelector('[data-resource-form]');
  const formTitle = document.querySelector('[data-resource-form-title]');
  const entity = document.body.dataset.entityLabel || 'mục';
  const resourceKey = document.body.dataset.resourceKey || '';
  const serverSubmit = form?.dataset.serverSubmit === 'true';
  let page = 1;
  let sortDirection = 1;
  let sortField = '';

  if (!table || !body) return;

  const columns = [...table.querySelectorAll('thead th[data-field]')].map((item) => ({ key: item.dataset.field, label: item.textContent.trim() }));
  const rows = () => [...body.querySelectorAll('tr[data-record-id]')];
  const normalize = (value) => String(value || '').trim().toLocaleLowerCase('vi');

  const toneFor = (value) => {
    const status = normalize(value);
    if (/inactive|rejected|cancelled|failed|blocked|locked/.test(status)) return 'danger';
    if (/active|approved|completed|published|sent|paid|passed|resolved|matched|available/.test(status)) return 'success';
    if (/pending|processing|scheduled|draft|review|screening|interview/.test(status)) return 'warning';
    if (/new|refunded/.test(status)) return 'info';
    return 'neutral';
  };

  const selectedStatuses = () => statusInputs.filter((item) => item.checked).map((item) => normalize(item.value));
  const matchedRows = () => {
    const query = normalize(search?.value);
    const statuses = selectedStatuses();
    return rows().filter((row) => {
      const status = normalize(row.querySelector('[data-field="status"]')?.dataset.value);
      return (!query || normalize(row.textContent).includes(query)) && (!statuses.length || statuses.includes(status));
    });
  };

  const updateStatusCounts = () => {
    statusInputs.forEach((input) => {
      const count = rows().filter((row) => normalize(row.querySelector('[data-field="status"]')?.dataset.value) === normalize(input.value)).length;
      const label = input.closest('label');
      if (label?.querySelector('[data-status-count]')) label.querySelector('[data-status-count]').textContent = count;
    });
  };

  const updateBulkBar = () => {
    const checks = rows().map((row) => row.querySelector('[data-resource-select]')).filter(Boolean);
    const selected = checks.filter((item) => item.checked);
    checks.forEach((item) => item.closest('tr').classList.toggle('is-selected', item.checked));
    if (bulkBar) bulkBar.hidden = selected.length === 0;
    if (selectedCount) selectedCount.textContent = selected.length;
    const visible = matchedRows().filter((row) => !row.hidden).map((row) => row.querySelector('[data-resource-select]'));
    if (selectAll) {
      selectAll.checked = visible.length > 0 && visible.every((item) => item.checked);
      selectAll.classList.toggle('is-all-selected', selectAll.checked);
    }
  };

  const render = () => {
    body.querySelector('.users-no-results')?.remove();
    const matches = matchedRows();
    const size = Number(pageSize?.value || 10);
    const totalPages = Math.max(1, Math.ceil(matches.length / size));
    page = Math.min(Math.max(page, 1), totalPages);
    const start = (page - 1) * size;
    const visible = new Set(matches.slice(start, start + size));
    rows().forEach((row) => { row.hidden = !visible.has(row); });

    if (!matches.length) {
      const empty = document.createElement('tr');
      empty.className = 'users-no-results';
      empty.innerHTML = `<td colspan="${columns.length + 2}">No results.</td>`;
      body.appendChild(empty);
    }

    if (pageSummary) pageSummary.textContent = matches.length ? `Page ${page} of ${totalPages}` : 'No results';
    if (currentPageButton) currentPageButton.textContent = page;
    if (previousButton) previousButton.disabled = page <= 1;
    if (nextButton) nextButton.disabled = page >= totalPages;
    updateBulkBar();
  };

  const renderFilterChips = () => {
    const filters = document.querySelector('.users-toolbar__filters');
    filters?.querySelector('.users-selected-filters')?.remove();
    const selected = statusInputs.filter((item) => item.checked);
    if (!selected.length || !filters) return;
    const group = document.createElement('div');
    group.className = 'users-selected-filters';
    selected.forEach((input) => {
      const chip = document.createElement('span');
      chip.textContent = input.closest('label').querySelector('span').textContent;
      group.appendChild(chip);
    });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      statusInputs.forEach((input) => { input.checked = false; });
      page = 1;
      renderFilterChips();
      render();
    });
    group.appendChild(reset);
    filters.appendChild(group);
  };

  const setCell = (cell, value, field) => {
    cell.dataset.value = value;
    cell.replaceChildren();
    if (field === 'status') {
      const badge = document.createElement('span');
      badge.className = `users-status users-status--${toneFor(value)}`;
      badge.textContent = value;
      cell.appendChild(badge);
    } else {
      cell.textContent = value;
    }
  };

  const attachRowMenu = (row) => {
    const trigger = row.querySelector('.users-row-menu');
    if (!trigger || row.querySelector('.users-row-actions')) return;
    const menu = document.createElement('div');
    menu.className = 'users-row-actions';
    menu.hidden = true;
    menu.innerHTML = '<button type="button" data-resource-edit>Edit <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.5 15H7a4 4 0 0 0-4 4v2"></path><path d="m14.4 17.6 4-4a2 2 0 0 1 3 3l-4 4-4 1z"></path><circle cx="10" cy="7" r="4"></circle></svg></button><hr><button type="button" class="is-delete" data-resource-delete>Delete <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>';
    trigger.parentElement.style.position = 'relative';
    trigger.parentElement.appendChild(menu);
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      document.querySelectorAll('.users-row-actions').forEach((item) => { if (item !== menu) item.hidden = true; });
      menu.hidden = !menu.hidden;
    });
  };

  const closeModal = () => {
    if (modal) modal.hidden = true;
    document.body.classList.remove('has-resource-modal');
  };

  const openModal = (row = null) => {
    if (!modal || !form) return;
    form.reset();
    form.elements.record_id.value = row?.dataset.recordId || '';
    form.action = row?.dataset.editUrl || form.dataset.createUrl || form.action;
    if (formTitle) formTitle.textContent = resourceKey === 'administrators'
      ? `${row ? 'Sửa' : 'Thêm'} quản trị viên`
      : `${row ? 'Edit' : 'Add'} ${entity}`;
    if (row) {
      [...form.elements].forEach((field) => {
        if (!field.name || field.name === 'record_id') return;
        const cell = row.querySelector(`[data-field="${CSS.escape(field.name)}"]`);
        if (cell) field.value = cell.dataset.value || cell.textContent.trim();
      });
    }
    if (resourceKey === 'administrators') {
      form.elements.role.value = row?.dataset.role || 'admin';
      form.elements.permissions.value = row?.dataset.permissions || '';
      form.elements.managed_by.value = row?.dataset.managedBy || '';
      form.elements.status.value = row?.dataset.statusCode || '1';
      form.elements.password.required = !row;
      form.elements.password_confirmation.required = !row;
      form.dataset.editing = row ? 'true' : 'false';
      form.dispatchEvent(new CustomEvent('administrator:form-opened', { detail: { row } }));
    }
    modal.hidden = false;
    document.body.classList.add('has-resource-modal');
    window.requestAnimationFrame(() => form.querySelector('input:not([type="hidden"]), select, textarea')?.focus());
  };

  const confirmDelete = (targets) => {
    if (!targets.length) return;
    const overlay = document.createElement('div');
    overlay.className = 'delete-modal';
    overlay.innerHTML = `<div class="delete-dialog"><h2>&#9888; Delete ${targets.length > 1 ? `${targets.length} items` : entity}</h2><p>Are you sure you want to delete the selected data?<br>This action cannot be undone.</p><aside><b>Warning!</b><br>Please be careful, this operation can not be rolled back.</aside><footer><button type="button">Cancel</button><button type="button">Delete</button></footer></div>`;
    document.body.appendChild(overlay);
    const [cancel, remove] = overlay.querySelectorAll('footer button');
    cancel.addEventListener('click', () => overlay.remove());
    remove.addEventListener('click', async () => {
      const persistedTargets = targets.filter((row) => row.dataset.deleteUrl);
      if (persistedTargets.length) {
        remove.disabled = true;
        const csrfToken = form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || '';
        for (const row of persistedTargets) {
          const response = await fetch(row.dataset.deleteUrl, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            remove.disabled = false;
            window.alert(result.message || 'Không thể xóa quản trị viên.');
            return;
          }
        }
        window.location.reload();
        return;
      }
      targets.forEach((row) => row.remove());
      overlay.remove();
      updateStatusCounts();
      render();
    });
    overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
  };

  rows().forEach(attachRowMenu);
  updateStatusCounts();

  search?.addEventListener('input', () => { page = 1; render(); });
  statusInputs.forEach((input) => input.addEventListener('change', () => { page = 1; renderFilterChips(); render(); }));
  pageSize?.addEventListener('change', () => { page = 1; render(); });
  previousButton?.addEventListener('click', () => { page -= 1; render(); });
  nextButton?.addEventListener('click', () => { page += 1; render(); });

  selectAll?.addEventListener('change', () => {
    matchedRows().filter((row) => !row.hidden).forEach((row) => { row.querySelector('[data-resource-select]').checked = selectAll.checked; });
    updateBulkBar();
  });
  body.addEventListener('change', (event) => { if (event.target.matches('[data-resource-select]')) updateBulkBar(); });

  const clearButton = document.querySelector('[data-resource-clear]');
  if (clearButton) clearButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
  const bulkDelete = document.querySelector('[data-resource-delete-selected]');
  if (bulkDelete) bulkDelete.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  clearButton?.addEventListener('click', () => { rows().forEach((row) => { row.querySelector('[data-resource-select]').checked = false; }); updateBulkBar(); });
  bulkDelete?.addEventListener('click', () => confirmDelete(rows().filter((row) => row.querySelector('[data-resource-select]')?.checked)));

  document.querySelector('[data-resource-add]')?.addEventListener('click', () => openModal());
  document.querySelectorAll('[data-resource-modal-close]').forEach((button) => button.addEventListener('click', closeModal));
  modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

  body.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-record-id]');
    if (event.target.closest('[data-resource-edit]')) openModal(row);
    if (event.target.closest('[data-resource-delete]')) confirmDelete([row]);
  });
  document.addEventListener('click', () => document.querySelectorAll('.users-row-actions').forEach((menu) => { menu.hidden = true; }));

  form?.addEventListener('submit', (event) => {
    if (serverSubmit) return;
    event.preventDefault();
    const data = new FormData(form);
    let row = data.get('record_id') ? body.querySelector(`tr[data-record-id="${CSS.escape(data.get('record_id'))}"]`) : null;
    if (!row) {
      row = document.createElement('tr');
      row.dataset.recordId = `new-${Date.now()}`;
      const check = document.createElement('td');
      check.innerHTML = '<input type="checkbox" data-resource-select aria-label="Chọn mục" />';
      row.appendChild(check);
      columns.forEach(({ key }) => {
        const cell = document.createElement('td');
        cell.dataset.field = key;
        setCell(cell, String(data.get(key) || ''), key);
        row.appendChild(cell);
      });
      const action = document.createElement('td');
      action.innerHTML = '<button class="users-row-menu" type="button" aria-label="Thao tác">&hellip;</button>';
      row.appendChild(action);
      body.prepend(row);
      attachRowMenu(row);
    } else {
      columns.forEach(({ key }) => {
        const cell = row.querySelector(`[data-field="${CSS.escape(key)}"]`);
        if (cell && data.has(key)) setCell(cell, String(data.get(key)), key);
      });
    }
    closeModal();
    updateStatusCounts();
    page = 1;
    render();
  });

  table.querySelectorAll('th[data-resource-sort]').forEach((head) => head.addEventListener('click', () => {
    const field = head.dataset.field;
    sortDirection = sortField === field ? sortDirection * -1 : 1;
    sortField = field;
    table.querySelectorAll('th[data-resource-sort]').forEach((item) => item.removeAttribute('data-sort-direction'));
    head.dataset.sortDirection = sortDirection === 1 ? 'asc' : 'desc';
    rows().sort((a, b) => {
      const first = a.querySelector(`[data-field="${CSS.escape(field)}"]`)?.dataset.value || '';
      const second = b.querySelector(`[data-field="${CSS.escape(field)}"]`)?.dataset.value || '';
      return first.localeCompare(second, 'vi', { numeric: true }) * sortDirection;
    }).forEach((row) => body.appendChild(row));
    page = 1;
    render();
  }));

  const viewButton = document.querySelector('[data-resource-view]');
  const viewMenu = document.querySelector('.users-view-popover');
  viewButton?.addEventListener('click', (event) => { event.stopPropagation(); viewMenu.hidden = !viewMenu.hidden; });
  viewMenu?.querySelectorAll('[data-column-toggle]').forEach((label) => label.addEventListener('click', () => {
    const field = label.dataset.columnToggle;
    const hidden = !label.classList.contains('is-hidden');
    label.classList.toggle('is-hidden', hidden);
    const index = [...table.querySelectorAll('thead th')].findIndex((head) => head.dataset.field === field);
    table.querySelectorAll('tr').forEach((row) => { if (row.children[index]) row.children[index].hidden = hidden; });
  }));

  document.querySelector('[data-resource-export]')?.addEventListener('click', () => {
    const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [columns.map(({ label }) => quote(label)).join(',')];
    matchedRows().forEach((row) => csv.push(columns.map(({ key }) => quote(row.querySelector(`[data-field="${CSS.escape(key)}"]`)?.dataset.value || '')).join(',')));
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${document.body.dataset.resourceKey || 'data'}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (modal && !modal.hidden) closeModal();
    else clearButton?.click();
  });

  const updateHeaderShadow = () => header?.classList.toggle('is-scrolled', window.scrollY > 1);
  updateHeaderShadow();
  window.addEventListener('scroll', updateHeaderShadow, { passive: true });
  render();
});

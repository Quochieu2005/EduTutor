document.addEventListener('DOMContentLoaded', () => {
  const search = document.querySelector('[data-login-user-search]');
  const body = document.querySelector('[data-login-user-body]');
  const count = document.querySelector('[data-login-user-count]');
  if (!search || !body) return;

  const rows = [...body.querySelectorAll('[data-login-user-row]')];
  const selectAll = document.querySelector('[data-login-user-select-all]');
  const bulk = document.querySelector('[data-login-user-bulk]');
  const selectedCount = document.querySelector('[data-login-user-selected-count]');
  const clearSelection = document.querySelector('[data-login-user-clear]');
  const deleteSelected = document.querySelector('[data-login-user-delete-selected]');
  const deleteSelectedUrl = document.querySelector('[data-delete-selected-url]')?.dataset.deleteSelectedUrl;

  const showNotice = (message, isError = false) => {
    const notice = document.createElement('div');
    notice.className = `resource-notice${isError ? ' resource-notice--error' : ''}`;
    notice.setAttribute('role', isError ? 'alert' : 'status');
    notice.textContent = message;
    document.body.appendChild(notice);
    Object.assign(notice.style, {
      position: 'fixed', zIndex: '100', top: '20px', right: '20px', maxWidth: 'min(420px, calc(100vw - 40px))',
      padding: '12px 16px', borderRadius: '10px', background: isError ? '#fee2e2' : '#dcfce7',
      color: isError ? '#991b1b' : '#166534', boxShadow: '0 10px 24px rgb(15 23 42 / 18%)',
    });
    window.setTimeout(() => notice.remove(), 5000);
  };

  rows.forEach((row) => {
    const trigger = row.querySelector('.users-row-menu');
    if (!trigger || row.querySelector('.users-row-actions')) return;
    const menu = document.createElement('div');
    menu.className = 'users-row-actions';
    menu.hidden = true;
    menu.innerHTML = '<button type="button" class="is-delete">Xóa <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>';
    trigger.parentElement.style.position = 'relative';
    trigger.parentElement.appendChild(menu);
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      document.querySelectorAll('.users-row-actions').forEach((item) => { if (item !== menu) item.hidden = true; });
      menu.hidden = !menu.hidden;
    });
  });
  document.addEventListener('click', () => document.querySelectorAll('.users-row-actions').forEach((menu) => { menu.hidden = true; }));

  const selectedRows = () => rows.filter((row) => row.isConnected && row.querySelector('[data-login-user-select]')?.checked);
  const updateSelection = () => {
    const selected = selectedRows();
    selected.forEach((row) => row.classList.add('is-selected'));
    rows.filter((row) => !row.querySelector('[data-login-user-select]')?.checked).forEach((row) => row.classList.remove('is-selected'));
    if (bulk) bulk.hidden = selected.length === 0;
    if (selectedCount) selectedCount.textContent = String(selected.length);
    if (selectAll) {
      const visibleRows = rows.filter((row) => row.isConnected && !row.hidden);
      selectAll.checked = visibleRows.length > 0 && visibleRows.every((row) => row.querySelector('[data-login-user-select]')?.checked);
      selectAll.classList.toggle('is-all-selected', selectAll.checked);
    }
  };
  body.addEventListener('change', (event) => {
    if (event.target.matches('[data-login-user-select]')) updateSelection();
  });
  selectAll?.addEventListener('change', () => {
    rows.filter((row) => !row.hidden).forEach((row) => {
      const checkbox = row.querySelector('[data-login-user-select]');
      if (checkbox) checkbox.checked = selectAll.checked;
    });
    updateSelection();
  });
  clearSelection?.addEventListener('click', () => {
    rows.forEach((row) => { const checkbox = row.querySelector('[data-login-user-select]'); if (checkbox) checkbox.checked = false; });
    if (selectAll) selectAll.checked = false;
    updateSelection();
  });

  deleteSelected?.addEventListener('click', async () => {
    const selected = selectedRows();
    const usernames = selected.map((row) => row.dataset.username).filter(Boolean);
    if (!usernames.length || !deleteSelectedUrl) return;
    const label = usernames.length === 1 ? 'tài khoản đã chọn' : `${usernames.length} tài khoản đã chọn`;
    if (!window.confirm(`Xóa ${label}? Hành động này không thể hoàn tác.`)) return;
    deleteSelected.disabled = true;
    try {
      const response = await fetch(deleteSelectedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.cookie.split('; ').find((item) => item.startsWith('csrftoken='))?.split('=')[1] || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ usernames }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) throw new Error(result?.message || 'Không thể xóa các tài khoản đã chọn.');
      const removed = new Set(result.deleted_usernames || usernames);
      selected.forEach((row) => { if (removed.has(row.dataset.username)) row.remove(); });
      if (selectAll) selectAll.checked = false;
      update();
      const skipped = result.skipped_count ? ` Bỏ qua ${result.skipped_count} tài khoản đang được quản lý ở mục khác.` : '';
      showNotice(`${result.message || `Đã xóa ${removed.size} tài khoản.`}${skipped}`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Không thể xóa các tài khoản đã chọn.', true);
    } finally {
      deleteSelected.disabled = false;
    }
  });

  const update = () => {
    const query = search.value.trim().toLocaleLowerCase('vi');
    let visible = 0;
    rows.forEach((row) => {
      if (!row.isConnected) return;
      const matched = !query || row.textContent.toLocaleLowerCase('vi').includes(query);
      row.hidden = !matched;
      if (matched) visible += 1;
    });
    body.querySelector('[data-login-user-empty-search]')?.remove();
    if (rows.length && !visible) {
      const empty = document.createElement('tr');
      empty.className = 'users-no-results';
      empty.dataset.loginUserEmptySearch = 'true';
      empty.innerHTML = '<td colspan="8">Không tìm thấy tài khoản phù hợp.</td>';
      body.appendChild(empty);
    }
    const totalRows = rows.filter((row) => row.isConnected).length;
    if (count) count.textContent = query ? `${visible}/${totalRows} tài khoản` : `${totalRows} tài khoản`;
    updateSelection();
  };

  search.addEventListener('input', update);
  document.addEventListener('login-user-row-removed', update);
});

document.addEventListener('DOMContentLoaded', () => {
  const search = document.querySelector('[data-login-user-search]');
  const body = document.querySelector('[data-login-user-body]');
  const count = document.querySelector('[data-login-user-count]');
  if (!search || !body) return;

  const rows = [...body.querySelectorAll('[data-login-user-row]')];
  const update = () => {
    const query = search.value.trim().toLocaleLowerCase('vi');
    let visible = 0;
    rows.forEach((row) => {
      const matched = !query || row.textContent.toLocaleLowerCase('vi').includes(query);
      row.hidden = !matched;
      if (matched) visible += 1;
    });
    body.querySelector('[data-login-user-empty-search]')?.remove();
    if (rows.length && !visible) {
      const empty = document.createElement('tr');
      empty.className = 'users-no-results';
      empty.dataset.loginUserEmptySearch = 'true';
      empty.innerHTML = '<td colspan="6">Không tìm thấy tài khoản phù hợp.</td>';
      body.appendChild(empty);
    }
    if (count) count.textContent = query ? `${visible}/${rows.length} tài khoản` : `${rows.length} tài khoản`;
  };

  search.addEventListener('input', update);
});

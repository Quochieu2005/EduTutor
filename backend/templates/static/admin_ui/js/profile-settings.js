(() => {
  const list = document.querySelector('[data-profile-url-list]');
  const addButton = document.querySelector('[data-add-url]');

  if (!list || !addButton) return;

  const createRow = () => {
    const row = document.createElement('div');
    row.className = 'setting-form__url-row';
    row.innerHTML = `
      <input name="urls" type="url" placeholder="https://example.com" />
      <button type="button" class="setting-form__url-remove" data-remove-url aria-label="Xóa URL">×</button>
    `;
    return row;
  };

  addButton.addEventListener('click', () => {
    const row = createRow();
    list.append(row);
    row.querySelector('input').focus();
  });

  list.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-url]');
    if (!removeButton) return;

    const row = removeButton.closest('.setting-form__url-row');
    if (list.children.length === 1) {
      row.querySelector('input').value = '';
      row.querySelector('input').focus();
      return;
    }
    row.remove();
  });
})();

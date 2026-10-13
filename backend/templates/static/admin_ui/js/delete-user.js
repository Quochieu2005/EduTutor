document.addEventListener('DOMContentLoaded', () => {
  const csrfToken = () => document.cookie
    .split('; ')
    .find((item) => item.startsWith('csrftoken='))
    ?.split('=')[1] || document.querySelector('[name="csrfmiddlewaretoken"]')?.value || '';
  const showNotice = (message, isError = false) => {
    const notice = document.createElement('div');
    notice.className = `resource-notice${isError ? ' resource-notice--error' : ''}`;
    notice.setAttribute('role', isError ? 'alert' : 'status');
    notice.textContent = message;
    document.querySelector('.resource-notices')?.appendChild(notice) || document.body.prepend(notice);
    window.setTimeout(() => notice.remove(), 5000);
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.users-row-actions .is-delete');
    if (!button) return;
    const row = button.closest('tr');
    const username = row.children[1].textContent.trim();
    const modal = document.createElement('div');
    modal.className = 'delete-modal';
    modal.innerHTML = '<div class="delete-dialog"><h2>&#9888; Xóa tài khoản</h2><p>Bạn có chắc muốn xóa <b data-delete-username></b>?<br>Tài khoản sẽ bị xóa vĩnh viễn và không thể hoàn tác.</p><label>Nhập username để xác nhận: <input placeholder="Nhập username chính xác"></label><aside><b>Lưu ý:</b><br>Hãy kiểm tra kỹ trước khi thực hiện thao tác này.</aside><footer><button>Hủy</button><button disabled>Xóa</button></footer></div>';
    modal.querySelector('[data-delete-username]').textContent = username;
    document.body.append(modal);
    const [cancel, remove] = modal.querySelectorAll('footer button');
    const input = modal.querySelector('input');
    input.addEventListener('input', () => { remove.disabled = input.value !== username; });
    cancel.addEventListener('click', () => modal.remove());
    remove.addEventListener('click', async () => {
      const deleteUrl = row.dataset.deleteUrl;
      if (!deleteUrl) {
        modal.remove();
        showNotice('Mục này không hỗ trợ xóa trực tiếp.', true);
        return;
      }
      remove.disabled = true;
      try {
        const response = await fetch(deleteUrl, {
          method: 'POST',
          headers: {
            'X-CSRFToken': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'same-origin',
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.ok !== true) {
          throw new Error(result?.message || 'Không thể xóa dữ liệu.');
        }
        row.remove();
        document.dispatchEvent(new CustomEvent('login-user-row-removed'));
        modal.remove();
        showNotice(result.message || 'Đã xóa dữ liệu.');
      } catch (error) {
        remove.disabled = false;
        showNotice(error instanceof Error ? error.message : 'Không thể xóa dữ liệu.', true);
      }
    });
    modal.addEventListener('click', (clickEvent) => { if (clickEvent.target === modal) modal.remove(); });
  });
});

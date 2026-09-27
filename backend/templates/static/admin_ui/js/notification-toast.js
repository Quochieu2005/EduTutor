document.addEventListener('DOMContentLoaded', () => {
  const dismissAfterFiveSeconds = (notice) => {
    if (!notice || notice.dataset.dismissTimer) return;
    notice.dataset.dismissTimer = 'true';
    window.setTimeout(() => notice.remove(), 5000);
  };
  const show = (message, isError = false) => {
    if (!message) return;
    let container = document.querySelector('.app-notifications');
    if (!container) {
      container = document.createElement('div');
      container.className = 'app-notifications';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    const notice = document.createElement('div');
    notice.className = `app-notice${isError ? ' app-notice--error' : ''}`;
    notice.setAttribute('role', isError ? 'alert' : 'status');
    notice.innerHTML = '<span></span><button type="button" aria-label="Đóng thông báo">&times;</button>';
    notice.querySelector('span').textContent = message;
    notice.querySelector('button').addEventListener('click', () => notice.remove());
    container.prepend(notice);
    dismissAfterFiveSeconds(notice);
  };

  document.querySelectorAll('[data-app-notice-close]').forEach((button) => {
    button.addEventListener('click', () => button.closest('.app-notice')?.remove());
  });
  document.querySelectorAll('.app-notice').forEach(dismissAfterFiveSeconds);
  window.addEventListener('app:notify', (event) => show(event.detail?.message, event.detail?.error));
  window.showAppNotification = show;
});

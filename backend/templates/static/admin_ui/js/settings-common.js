(() => {
  const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const eyeOffIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 5.1a10.7 10.7 0 0 1 11.2 6.6 1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5"></path><path d="M14.1 14.2a3 3 0 0 1-4.2-4.2"></path><path d="M17.5 17.5a10.8 10.8 0 0 1-15.4-5.2 1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1"></path><path d="m2 2 20 20"></path></svg>';

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-setting-message-close]');
    if (closeButton) {
      closeButton.closest('[data-setting-message]')?.remove();
      return;
    }

    const toggle = event.target.closest('[data-setting-password-toggle]');
    if (!toggle) return;
    const input = toggle.closest('.setting-password-field')?.querySelector('input');
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const actionLabel = show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
    toggle.setAttribute('aria-label', actionLabel);
    toggle.setAttribute('title', actionLabel);
    toggle.setAttribute('aria-pressed', String(show));
    toggle.innerHTML = show ? eyeOffIcon : eyeIcon;
  });
})();

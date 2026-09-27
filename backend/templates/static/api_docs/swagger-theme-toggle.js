(() => {
  const storageKey = 'edututor-swagger-theme';
  const darkClass = 'swagger-theme-dark';
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.69 2 6 4.69 6 8c0 2.14.9 4.07 2.34 5.44.41.39.66.94.66 1.51V17c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2.05c0-.57.24-1.12.66-1.51A7.92 7.92 0 0 0 18 8c0-3.31-2.69-6-6-6zm2.94 10.01c-.61.58-.94 1.28-.94 1.99V16h-4v-2.01c0-.72-.34-1.42-.94-2A5.96 5.96 0 0 1 8 8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.54-.58 2.98-1.06 4.01z"/></svg>';

  const savedTheme = () => {
    try {
      return localStorage.getItem(storageKey) || 'dark';
    } catch (_) {
      return 'dark';
    }
  };

  const setTheme = (theme, button) => {
    const isDark = theme === 'dark';
    document.body.classList.toggle(darkClass, isDark);
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
    button.title = button.getAttribute('aria-label');
    try {
      localStorage.setItem(storageKey, theme);
    } catch (_) {
      // Không cần lưu khi trình duyệt chặn localStorage.
    }
  };

  const addToggle = () => {
    const wrapper = document.querySelector('.swagger-ui .topbar .wrapper');
    if (!wrapper || wrapper.querySelector('.swagger-theme-toggle')) return Boolean(wrapper);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swagger-theme-toggle';
    button.innerHTML = icon;
    wrapper.append(button);
    setTheme(savedTheme(), button);
    button.addEventListener('click', () => {
      setTheme(document.body.classList.contains(darkClass) ? 'light' : 'dark', button);
    });
    return true;
  };

  const observer = new MutationObserver(() => {
    if (addToggle()) observer.disconnect();
  });

  if (!addToggle()) observer.observe(document.documentElement, { childList: true, subtree: true });
})();

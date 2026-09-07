(() => {
  try {
    const savedTheme = localStorage.getItem('edututor-theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : systemTheme;
  } catch {
    // Keep the page usable when storage is unavailable.
  }
})();

(() => {
  const root = document.documentElement;
  const fontSelect = document.querySelector('#appearance-font');
  const themeInputs = [...document.querySelectorAll('input[name="theme"]')];

  const setTheme = (theme) => {
    root.dataset.theme = theme;
    localStorage.setItem('edututor-theme', theme);
  };
  const setFont = (font) => {
    const families = { inter: 'Inter, sans-serif', manrope: 'Manrope, sans-serif', system: 'system-ui, sans-serif' };
    root.style.setProperty('--settings-font-family', families[font] || families.inter);
    localStorage.setItem('edututor-font', font);
  };

  const savedTheme = localStorage.getItem('edututor-theme') || 'light';
  const savedFont = localStorage.getItem('edututor-font') || 'inter';
  themeInputs.forEach((input) => { input.checked = input.value === savedTheme; });
  if (fontSelect) fontSelect.value = savedFont;
  setTheme(savedTheme);
  setFont(savedFont);

  document.querySelector('.appearance-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    setTheme(themeInputs.find((input) => input.checked)?.value || 'light');
    setFont(fontSelect?.value || 'inter');
  });
})();

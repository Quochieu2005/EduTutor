(() => {
    const passwordInput = document.querySelector('[data-password-input]');
    const toggleButton = document.querySelector('[data-password-toggle]');

    if (!passwordInput || !toggleButton) return;

    const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    const eyeOffIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 5.1a10.7 10.7 0 0 1 11.2 6.6 1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5"></path><path d="M14.1 14.2a3 3 0 0 1-4.2-4.2"></path><path d="M17.5 17.5a10.8 10.8 0 0 1-15.4-5.2 1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1"></path><path d="m2 2 20 20"></path></svg>';

    toggleButton.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        toggleButton.setAttribute('aria-pressed', String(isHidden));
        toggleButton.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        toggleButton.innerHTML = isHidden ? eyeIcon : eyeOffIcon;
    });

    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        passwordInput.type = 'password';
        toggleButton.setAttribute('aria-pressed', 'false');
        toggleButton.setAttribute('aria-label', 'Show password');
        toggleButton.innerHTML = eyeOffIcon;
    });
})();

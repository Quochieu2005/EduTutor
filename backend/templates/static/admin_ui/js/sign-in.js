(() => {
    const form = document.querySelector('[data-sign-in-form]');
    const status = document.querySelector('[data-sign-in-status]');
    let submitTimer;

    if (!form || !status) return;

    document.querySelectorAll('[data-auth-message-close]').forEach((button) => {
        button.addEventListener('click', () => button.closest('[data-auth-message]')?.remove());
    });

    const resetSignInPage = () => {
        window.clearTimeout(submitTimer);
        form.reset();
        const submitButton = form.querySelector('.sign-in-form__submit');
        submitButton.disabled = false;
        submitButton.classList.remove('is-loading');
        submitButton.removeAttribute('aria-busy');
        status.hidden = true;
        status.classList.remove('is-visible');
    };

    // A browser back-navigation can restore this page from bfcache, including
    // the prior email, password, and pending loading state. Start clean then.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) resetSignInPage();
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const submitButton = form.querySelector('.sign-in-form__submit');
        submitButton.disabled = true;
        submitButton.classList.add('is-loading');
        submitButton.setAttribute('aria-busy', 'true');
        status.hidden = false;
        status.classList.remove('is-visible');
        requestAnimationFrame(() => status.classList.add('is-visible'));
        submitTimer = window.setTimeout(() => {
            form.submit();
        }, 900);
    });
})();

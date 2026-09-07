(() => {
    const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    const eyeOffIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 5.1a10.7 10.7 0 0 1 11.2 6.6 1 1 0 0 1 0 .7 10.7 10.7 0 0 1-1.4 2.5"></path><path d="M14.1 14.2a3 3 0 0 1-4.2-4.2"></path><path d="M17.5 17.5a10.8 10.8 0 0 1-15.4-5.2 1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1"></path><path d="m2 2 20 20"></path></svg>';

    document.addEventListener('click', (event) => {
        const closeButton = event.target.closest('[data-auth-message-close]');
        if (closeButton) {
            closeButton.closest('[data-auth-message]')?.remove();
            return;
        }

        const toggle = event.target.closest('[data-auth-password-toggle]');
        if (!toggle) return;
        const input = toggle.closest('.sign-in-form__password-wrap')?.querySelector('input');
        if (!input) return;
        const show = input.type === 'password';
        const label = show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
        input.type = show ? 'text' : 'password';
        toggle.innerHTML = show ? eyeOffIcon : eyeIcon;
        toggle.setAttribute('aria-label', label);
        toggle.setAttribute('title', label);
        toggle.setAttribute('aria-pressed', String(show));
    });

    const forgotForm = document.querySelector('[data-forgot-password-form]');
    const sendingStatus = document.querySelector('[data-forgot-password-status]');
    if (forgotForm && sendingStatus) {
        forgotForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!forgotForm.reportValidity()) return;
            const submitButton = forgotForm.querySelector('.sign-in-form__submit');
            submitButton.disabled = true;
            submitButton.classList.add('is-loading');
            submitButton.setAttribute('aria-busy', 'true');
            sendingStatus.hidden = false;
            requestAnimationFrame(() => sendingStatus.classList.add('is-visible'));
            window.setTimeout(() => forgotForm.submit(), 350);
        });
    }

    const otpForm = document.querySelector('[data-otp-form]');
    const otpInput = document.querySelector('[data-otp-input]');
    const otpSlots = [...document.querySelectorAll('[data-otp-slot]')];
    const verifyButton = document.querySelector('[data-otp-verify]');
    const countdown = document.querySelector('[data-otp-countdown]');
    if (!otpForm || !otpInput || !otpSlots.length || !verifyButton) return;

    let expired = false;
    const renderOtp = () => {
        const code = otpInput.value.replace(/\D/g, '').slice(0, otpSlots.length);
        otpInput.value = code;
        otpSlots.forEach((slot, index) => {
            slot.textContent = code[index] || '';
            slot.classList.toggle('is-active', index === code.length && code.length < otpSlots.length);
        });
        verifyButton.disabled = expired || code.length !== otpSlots.length;
    };

    const expiresAt = Number(otpForm.dataset.otpExpiresAt || 0) * 1000;
    const renderCountdown = () => {
        if (!countdown || !expiresAt) return;
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
        const seconds = String(remaining % 60).padStart(2, '0');
        countdown.textContent = `${minutes}:${seconds}`;
        expired = remaining === 0;
        countdown.closest('.otp-form__countdown')?.classList.toggle('is-expired', expired);
        renderOtp();
    };

    otpInput.addEventListener('input', renderOtp);
    otpInput.addEventListener('focus', renderOtp);
    document.querySelector('[data-otp-container]')?.addEventListener('click', () => otpInput.focus());
    renderOtp();
    renderCountdown();
    const timer = window.setInterval(() => {
        renderCountdown();
        if (expired) window.clearInterval(timer);
    }, 1000);
})();

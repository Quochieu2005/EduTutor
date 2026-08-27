(() => {
    const form = document.querySelector('[data-forgot-password-form]');
    const status = document.querySelector('[data-forgot-password-status]');

    if (form && status) {
        let submitTimer;
        const resetForgotPasswordPage = () => {
            window.clearTimeout(submitTimer);
            form.reset();
            const submitButton = form.querySelector('.sign-in-form__submit');
            submitButton.disabled = false;
            submitButton.classList.remove('is-loading');
            submitButton.removeAttribute('aria-busy');
            status.hidden = true;
            status.classList.remove('is-visible');
        };

        window.addEventListener('pageshow', (event) => {
            if (event.persisted) resetForgotPasswordPage();
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
        const email = new FormData(form).get('email');
        sessionStorage.removeItem(`otp-email-notification:${email}`);
        submitTimer = window.setTimeout(() => {
            window.location.href = `/admin/otp?email=${encodeURIComponent(email)}`;
        }, 900);
        });
    }

    const otpInput = document.querySelector('[data-otp-input]');
    const otpSlots = [...document.querySelectorAll('[data-otp-slot]')];
    const verifyButton = document.querySelector('[data-otp-verify]');

    if (!otpInput || !otpSlots.length || !verifyButton) return;

    const renderOtp = () => {
        const code = otpInput.value.replace(/\D/g, '').slice(0, otpSlots.length);
        otpInput.value = code;
        otpSlots.forEach((slot, index) => {
            slot.textContent = code[index] || '';
            slot.classList.toggle('is-active', index === code.length && code.length < otpSlots.length);
        });
        verifyButton.disabled = code.length !== otpSlots.length;
    };

    otpInput.addEventListener('input', renderOtp);
    otpInput.addEventListener('focus', renderOtp);
    document.querySelector('[data-otp-container]').addEventListener('click', () => otpInput.focus());
    renderOtp();

    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        otpInput.value = '';
        renderOtp();
    });

    const otpStatus = document.querySelector('[data-otp-status]');
    const otpStatusMessage = document.querySelector('[data-otp-status-message]');
    const email = new URLSearchParams(window.location.search).get('email');
    const notificationKey = email ? `otp-email-notification:${email}` : null;

    window.addEventListener('pageshow', (event) => {
        if (!event.persisted || !otpStatus) return;
        otpStatus.classList.remove('is-visible');
        otpStatus.hidden = true;
    });

    if (otpStatus && email && !sessionStorage.getItem(notificationKey)) {
        sessionStorage.setItem(notificationKey, 'shown');
        otpStatusMessage.textContent = `Email sent to ${email}`;
        otpStatus.hidden = false;
        requestAnimationFrame(() => otpStatus.classList.add('is-visible'));
        window.setTimeout(() => {
            otpStatus.classList.remove('is-visible');
            window.setTimeout(() => {
                otpStatus.hidden = true;
            }, 200);
        }, 6000);
    }
})();

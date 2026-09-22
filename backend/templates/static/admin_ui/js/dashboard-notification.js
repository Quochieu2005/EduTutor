(() => {
    const notification = document.querySelector('[data-dashboard-notification]');
    const email = notification?.dataset.welcomeEmail;

    if (!notification || !email) return;

    // Do not replay a one-time welcome toast when the dashboard is restored
    // from the browser's back/forward cache.
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        notification.classList.remove('is-visible');
        notification.hidden = true;
    });

    // The server renders a visible fallback; this keeps the toast working
    // even if this file is delayed or fails to load.
    notification.hidden = false;
    notification.classList.add('is-visible');

    window.setTimeout(() => {
        notification.classList.remove('is-visible');
        window.setTimeout(() => {
            notification.hidden = true;
        }, 200);
    }, 5000);
})();

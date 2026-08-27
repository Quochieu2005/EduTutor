(() => {
    const menus = [...document.querySelectorAll('[data-collapsible-menu]')];

    menus.forEach((menu, index) => {
        const trigger = menu.previousElementSibling;
        if (!trigger) return;

        const menuId = menu.id || `collapsible-menu-${index + 1}`;
        menu.id = menuId;
        trigger.classList.add('admin-sidebar__link--collapsible');
        trigger.setAttribute('aria-controls', menuId);
        trigger.setAttribute('aria-expanded', 'false');
        menu.hidden = true;

        const setOpen = (isOpen) => {
            trigger.setAttribute('aria-expanded', String(isOpen));
            menu.hidden = !isOpen;
        };

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            setOpen(trigger.getAttribute('aria-expanded') !== 'true');
        });

        window.addEventListener('pageshow', (event) => {
            if (event.persisted) setOpen(false);
        });
    });
})();

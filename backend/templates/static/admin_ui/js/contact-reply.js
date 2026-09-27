document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('[data-contact-reply-open]');
  const modal = document.querySelector('[data-contact-reply-modal]');
  if (!trigger || !modal) return;
  const close = () => { modal.hidden = true; };
  trigger.addEventListener('click', () => { modal.hidden = false; modal.querySelector('[name="recipient_email"]')?.focus(); });
  modal.querySelector('.invite-close')?.addEventListener('click', close);
  modal.querySelector('[data-contact-reply-close]')?.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
});

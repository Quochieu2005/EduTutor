document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('[data-contact-reply-open]');
  const modal = document.querySelector('[data-contact-reply-modal]');
  if (!trigger || !modal) return;
  const form = modal.querySelector('form');
  const selectionMessage = document.querySelector('[data-contact-selection-message]');
  const selectedRows = () => [...document.querySelectorAll('tr[data-record-id]')]
    .filter((row) => row.querySelector('[data-resource-select]')?.checked);
  const showSelectionMessage = (message = '') => {
    if (!selectionMessage) return;
    selectionMessage.textContent = message;
    selectionMessage.hidden = !message;
  };
  const close = () => { modal.hidden = true; };
  const openFor = (row, focusMessage = false) => {
    if (!row || !form) return;
    const email = row.dataset.contactEmail || '';
    const name = row.dataset.contactName || 'Người liên hệ';
    const subject = row.dataset.contactSubject || 'yêu cầu tư vấn';
    form.elements.contact_id.value = row.dataset.recordId || '';
    form.querySelector('[data-contact-reply-name]').textContent = name;
    form.querySelector('[data-contact-reply-email]').textContent = email || 'Chưa có email';
    form.querySelector('[data-contact-reply-phone]').textContent = row.dataset.contactPhone || '—';
    form.querySelector('[data-contact-reply-created]').textContent = row.dataset.contactCreatedAt || '—';
    form.querySelector('[data-contact-reply-message]').textContent = row.dataset.contactMessage || '—';
    const emailInput = form.querySelector('[data-contact-reply-email-input]');
    if (emailInput) emailInput.value = email;
    form.elements.subject.value = `EduTutor phản hồi: ${subject}`.slice(0, 250);
    modal.hidden = false;
    showSelectionMessage('');
    const nextField = focusMessage ? form.elements.message : form.elements.subject;
    window.requestAnimationFrame(() => nextField?.focus());
  };
  trigger.addEventListener('click', () => {
    const selected = selectedRows();
    if (selected.length !== 1) {
      showSelectionMessage('Vui lòng tích chọn đúng một liên hệ trước khi phản hồi.');
      return;
    }
    openFor(selected[0], true);
  });
  document.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-record-id]');
    if (!row) return;
    if (event.target.closest('[data-contact-view]')) {
      openFor(row);
    }
    if (event.target.closest('[data-contact-reply]')) {
      openFor(row, true);
    }
  });
  modal.querySelector('.invite-close')?.addEventListener('click', close);
  modal.querySelector('[data-contact-reply-close]')?.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });
});

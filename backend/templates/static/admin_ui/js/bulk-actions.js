document.addEventListener('DOMContentLoaded', () => {
  const checks = [...document.querySelectorAll('.users-table input[type="checkbox"]')];
  const bar = document.querySelector('.users-bulk-actions');
  const entityPlural = document.body.dataset.entityPlural || 'users';
  const [invite, activate, deactivate, remove] = [...(bar?.querySelectorAll('button:not([data-clear-selection])') || [])];
  if (invite) invite.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect></svg><span class="sr-only">Invite selected users</span>';
  invite?.querySelector('.sr-only')?.remove();
  if (activate) activate.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 11 2 2 4-4"></path><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>';
  if (deactivate) deactivate.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" x2="22" y1="8" y2="13"></line><line x1="22" x2="17" y1="8" y2="13"></line></svg>';
  if (remove) remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  [[invite, `Invite selected ${entityPlural}`], [activate, `Activate selected ${entityPlural}`], [deactivate, `Deactivate selected ${entityPlural}`], [remove, `Delete selected ${entityPlural}`]].forEach(([button, tooltip]) => {
    if (!button) return;
    button.dataset.tooltip = tooltip;
    button.removeAttribute('title');
  });
  const count = document.querySelector('[data-selected-count]');
  const clearButton = bar?.querySelector('[data-clear-selection]');
  if (clearButton) {
    clearButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
    clearButton.dataset.tooltip = 'Clear selection (Escape)';
  }
  const visibleRows = () => checks.slice(1).filter((item) => !item.closest('tr')?.hidden);
  const update = () => { const selected = checks.slice(1).filter((item) => item.checked); const visible = visibleRows(); const allVisibleSelected = visible.length > 0 && visible.every((item) => item.checked); checks.slice(1).forEach((item) => item.closest('tr')?.classList.toggle('is-selected', item.checked)); bar.hidden = selected.length === 0; count.textContent = selected.length; checks[0].checked = allVisibleSelected; checks[0].classList.toggle('is-all-selected', allVisibleSelected); };
  checks.forEach((item, index) => item.addEventListener('change', () => { if (index === 0) visibleRows().forEach((row) => { row.checked = item.checked; }); update(); }));
  clearButton?.addEventListener('click', () => { checks.forEach((item) => { item.checked = false; }); update(); });
  remove?.addEventListener('click', () => {
    const selected = checks.slice(1).filter((item) => item.checked);
    if (!selected.length || document.querySelector('.bulk-delete-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'delete-modal bulk-delete-modal';
    modal.innerHTML = `<div class="delete-dialog bulk-delete-dialog" role="alertdialog" aria-modal="true"><h2><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg> Delete ${selected.length} ${entityPlural}</h2><p>Are you sure you want to delete the selected ${entityPlural}?<br>This action cannot be undone.</p><label>Confirm by typing "DELETE":<input autocomplete="off" placeholder='Type "DELETE" to confirm.'></label><aside><b>Warning!</b><br>Please be careful, this operation can not be rolled back.</aside><footer><button type="button">Cancel</button><button type="button" disabled>Delete</button></footer></div>`;
    document.body.appendChild(modal);
    const input = modal.querySelector('input'); const [cancel, confirm] = modal.querySelectorAll('footer button');
    const close = () => modal.remove();
    input.addEventListener('input', () => { confirm.disabled = input.value !== 'DELETE'; });
    cancel.addEventListener('click', close);
    confirm.addEventListener('click', () => { selected.forEach((item) => item.closest('tr')?.remove()); checks.splice(1, checks.length - 1, ...document.querySelectorAll('.users-table tbody input[type="checkbox"]')); update(); close(); });
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    input.focus();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.querySelector('[data-clear-selection]')?.click(); });
});

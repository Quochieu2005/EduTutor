document.addEventListener('DOMContentLoaded', () => {
  const entityLabel = document.body.dataset.entityLabel || 'User';
  const entityName = entityLabel.toLowerCase();
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.users-row-actions .is-delete');
    if (!button) return;
    const row = button.closest('tr');
    const username = row.children[1].textContent.trim();
    const modal = document.createElement('div');
    modal.className = 'delete-modal';
    modal.innerHTML = `<div class="delete-dialog"><h2>&#9888; Delete ${entityLabel}</h2><p>Are you sure you want to delete <b>${username}</b>?<br>This action will permanently remove this ${entityName} from the system. This cannot be undone.</p><label>Username: <input placeholder="Enter username to confirm deletion."></label><aside><b>Warning!</b><br>Please be careful, this operation can not be rolled back.</aside><footer><button>Cancel</button><button disabled>Delete</button></footer></div>`;
    document.body.append(modal);
    const [cancel, remove] = modal.querySelectorAll('footer button');
    const input = modal.querySelector('input');
    input.addEventListener('input', () => { remove.disabled = input.value !== username; });
    cancel.addEventListener('click', () => modal.remove());
    remove.addEventListener('click', () => { row.remove(); modal.remove(); });
    modal.addEventListener('click', (clickEvent) => { if (clickEvent.target === modal) modal.remove(); });
  });
});

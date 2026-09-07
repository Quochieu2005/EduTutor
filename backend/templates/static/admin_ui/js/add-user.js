document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('.users-button--primary');
  if (!trigger) return;
  const entityLabel = document.body.dataset.entityLabel || 'User';
  const entityName = entityLabel.toLowerCase();

  const modal = document.createElement('div');
  modal.className = 'add-user-modal';
  modal.hidden = true;
  modal.innerHTML = `<div class="add-user-dialog" role="dialog" aria-modal="true">
    <button class="add-user-close" type="button" aria-label="Close">&times;</button>
    <h2>Add New ${entityLabel}</h2>
    <p>Create new ${entityName} here. Click save when you're done.</p>
    <form>
      <label>First Name<input placeholder="John"></label>
      <label>Last Name<input placeholder="Doe"></label>
      <label>Username<input placeholder="john_doe"></label>
      <label>Email<input type="email" placeholder="john.doe@gmail.com"></label>
      <label>Phone Number<input placeholder="+123456789"></label>
      <label>Password<input type="password" placeholder="e.g., S3cur3P@ssw0rd"></label>
      <label>Confirm Password<input type="password" placeholder="e.g., S3cur3P@ssw0rd"></label>
      <button class="add-user-save" type="submit">Save changes</button>
    </form>
  </div>`;
  document.body.appendChild(modal);

  const close = () => { modal.hidden = true; };
  trigger.addEventListener('click', () => { modal.hidden = false; });
  modal.querySelector('.add-user-close').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  modal.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
});

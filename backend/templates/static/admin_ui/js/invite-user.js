document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('.users-button--secondary');
  if (!trigger) return;
  const entityLabel = document.body.dataset.entityLabel || 'User';
  const entityName = entityLabel.toLowerCase();

  const modal = document.createElement('div');
  modal.className = 'invite-modal';
  modal.hidden = true;
  const sendIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path><path d="m21.854 2.147-10.94 10.939"></path></svg>';
  modal.innerHTML = `<div class="invite-dialog" role="dialog" aria-modal="true">
    <button class="invite-close" type="button" aria-label="Close">&times;</button>
    <h2>&#9993; Invite ${entityLabel}</h2>
    <p>Invite a new ${entityName} to join EduTutor by sending an email invitation.</p>
    <form>
      <label>Email<input type="email" placeholder="eg: john.doe@gmail.com"></label>
      <label>Description (optional)<textarea placeholder="Add a personal note to your invitation (optional)"></textarea></label>
      <footer><button type="button">Cancel</button><button type="submit">Invite ${sendIcon}</button></footer>
    </form>
  </div>`;
  document.body.append(modal);

  const close = () => { modal.hidden = true; };
  trigger.addEventListener('click', () => { modal.hidden = false; });
  modal.querySelector('.invite-close').addEventListener('click', close);
  modal.querySelector('footer button[type="button"]').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  modal.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); close(); });
});

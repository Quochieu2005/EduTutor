document.addEventListener('DOMContentLoaded', () => {
  const users = [
    ['taurean.stark', 'Taurean Stark', 'taurean.stark@example.com', '+1 470 731 4034', 'Active'],
    ['efrain.schuster57', 'Efrain Schuster', 'efrain.schuster@example.com', '+1 810 704 9315', 'Inactive'],
    ['kristin62', 'Kristin Hayes', 'kristin62@example.com', '+1 328 823 8617', 'Inactive'],
    ['sergio.ebert40', 'Sergio Ebert', 'sergio.ebert@example.com', '+1 853 663 9120', 'Active'],
    ['krystal.prosacco15', 'Krystal Prosacco', 'krystal@example.com', '+1 328 882 7861', 'Inactive'],
    ['gregorio.parker56', 'Gregorio Parker', 'gregorio@example.com', '+1 513 715 9312', 'Active'],
    ['maria.garcia', 'Maria Garcia', 'maria.garcia@example.com', '+1 303 555 0174', 'Active'],
    ['james.wilson', 'James Wilson', 'james.wilson@example.com', '+1 415 555 0198', 'Inactive'],
    ['sophia.martin', 'Sophia Martin', 'sophia.martin@example.com', '+1 202 555 0146', 'Inactive'],
    ['liam.thompson', 'Liam Thompson', 'liam.thompson@example.com', '+1 617 555 0162', 'Active'],
    ['olivia.brown', 'Olivia Brown', 'olivia.brown@example.com', '+1 312 555 0184', 'Active'],
    ['noah.davis', 'Noah Davis', 'noah.davis@example.com', '+1 646 555 0127', 'Inactive'],
    ['emma.moore', 'Emma Moore', 'emma.moore@example.com', '+1 718 555 0153', 'Inactive'],
    ['william.taylor', 'William Taylor', 'william.taylor@example.com', '+1 305 555 0119', 'Active'],
    ['ava.anderson', 'Ava Anderson', 'ava.anderson@example.com', '+1 408 555 0135', 'Inactive'],
  ];
  const body = document.querySelector('.users-table tbody');
  const source = body?.lastElementChild;
  if (!body || !source) return;

  users.forEach(([username, name, email, phone, status]) => {
    const row = source.cloneNode(true);
    const cells = row.querySelectorAll('td');
    cells[0].querySelector('input').checked = false;
    cells[0].querySelector('input').setAttribute('aria-label', `Select ${name}`);
    cells[1].textContent = username;
    cells[2].textContent = name;
    cells[3].textContent = email;
    cells[4].textContent = phone;
    const badge = cells[5].querySelector('.users-status');
    badge.textContent = status;
    badge.className = `users-status users-status--${status.toLowerCase()}`;
    cells[6].querySelector('.users-row-menu').setAttribute('aria-label', `Actions for ${name}`);
    body.appendChild(row);
  });
});

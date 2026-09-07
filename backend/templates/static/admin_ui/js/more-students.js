document.addEventListener('DOMContentLoaded', () => {
  const students = [
    ['ngocmai_student', 'Phạm Ngọc Mai', 'ngocmai@example.com', '0934 112 233', 'Active'],
    ['quangminh_student', 'Đỗ Quang Minh', 'quangminh@example.com', '0976 223 344', 'Active'],
    ['hoangyen_student', 'Vũ Hoàng Yến', 'hoangyen@example.com', '0908 334 455', 'Inactive'],
    ['baotran_student', 'Nguyễn Bảo Trân', 'baotran@example.com', '0925 445 566', 'Active'],
    ['ducanh_student', 'Lê Đức Anh', 'ducanh@example.com', '0963 556 677', 'Active'],
    ['thanhthao_student', 'Trần Thanh Thảo', 'thanhthao@example.com', '0917 667 788', 'Inactive'],
    ['tuanphong_student', 'Phạm Tuấn Phong', 'tuanphong@example.com', '0982 778 899', 'Active'],
    ['myduyen_student', 'Hoàng Mỹ Duyên', 'myduyen@example.com', '0906 889 900', 'Active'],
    ['khanhlinh_student', 'Đặng Khánh Linh', 'khanhlinh@example.com', '0938 990 011', 'Inactive'],
  ];
  const body = document.querySelector('.users-table tbody');
  const source = body?.lastElementChild;
  if (!body || !source) return;

  students.forEach(([username, name, email, phone, status]) => {
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

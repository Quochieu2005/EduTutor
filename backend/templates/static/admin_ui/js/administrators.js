document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-resource-form][data-server-submit="true"]');
  if (!form) return;

  const role = form.elements.role;
  const permissions = form.elements.permissions;
  const manager = form.elements.managed_by;
  const imageInput = form.elements.profile_image;
  const preview = form.querySelector('[data-administrator-image-preview]');
  const imageName = form.querySelector('[data-administrator-image-name]');
  const removeWrap = form.querySelector('[data-administrator-remove-wrap]');
  const removeImage = form.elements.remove_profile_image;
  const password = form.elements.password;
  const passwordConfirmation = form.elements.password_confirmation;

  const eye = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const eyeOff = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 3 18 18"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 4.2A11 11 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-3.2 4.2M6.2 6.2C3.7 8 2 12 2 12s3.5 8 10 8a10 10 0 0 0 4.2-.9"></path></svg>';

  const updateRoleFields = () => {
    const isSuperAdmin = role.value === 'super_admin';
    permissions.disabled = isSuperAdmin;
    manager.disabled = isSuperAdmin;
    if (isSuperAdmin) {
      permissions.value = '';
      manager.value = '';
    }
  };

  const setPreview = (url = '') => {
    preview.style.backgroundImage = url ? `url("${url}")` : '';
    preview.textContent = url ? '' : '+';
  };

  role.addEventListener('change', updateRoleFields);
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    imageName.textContent = file?.name || 'Chưa chọn ảnh';
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => setPreview(reader.result));
    reader.readAsDataURL(file);
    removeImage.checked = false;
  });

  form.querySelectorAll('[data-administrator-password-toggle]').forEach((button) => {
    const input = button.parentElement.querySelector('input');
    button.innerHTML = eye;
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.innerHTML = show ? eyeOff : eye;
      button.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    });
  });

  form.addEventListener('administrator:form-opened', (event) => {
    const row = event.detail.row;
    const avatarUrl = row?.dataset.avatarUrl || '';
    setPreview(avatarUrl);
    imageName.textContent = avatarUrl ? 'Ảnh hiện tại' : 'Chưa chọn ảnh';
    removeWrap.hidden = !avatarUrl;
    removeImage.checked = false;
    password.value = '';
    passwordConfirmation.value = '';
    password.type = 'password';
    passwordConfirmation.type = 'password';
    form.querySelector('[data-administrator-password-help]').textContent = row
      ? 'Để trống nếu không muốn đổi mật khẩu.'
      : 'Mật khẩu là bắt buộc khi tạo quản trị viên.';
    updateRoleFields();
  });

  form.addEventListener('submit', (event) => {
    passwordConfirmation.setCustomValidity('');
    if (password.value !== passwordConfirmation.value) {
      event.preventDefault();
      passwordConfirmation.setCustomValidity('Mật khẩu xác nhận không khớp.');
      passwordConfirmation.reportValidity();
    }
  });

  document.querySelectorAll('[data-administrator-message-close]').forEach((button) => {
    button.addEventListener('click', () => button.closest('[data-administrator-message]')?.remove());
  });
  document.querySelectorAll('[data-administrator-message]').forEach((message) => {
    window.setTimeout(() => message.remove(), 5000);
  });
});

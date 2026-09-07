document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header-fixed');
  const search = document.querySelector('#conversation-search');
  const conversations = [...document.querySelectorAll('.chat-conversation')];
  const filters = [...document.querySelectorAll('[data-chat-filter]')];
  const listEmptyState = document.querySelector('#chat-list-empty');
  const landing = document.querySelector('[data-chat-empty-state]');
  const chatView = document.querySelector('[data-chat-view]');
  const modal = document.querySelector('[data-new-message-modal]');
  const openModalButton = document.querySelector('[data-new-message-open]');
  const closeModalButton = document.querySelector('[data-new-message-close]');
  const peopleSearch = document.querySelector('#people-search');
  const people = [...document.querySelectorAll('.chat-person')];
  const peopleEmpty = document.querySelector('[data-people-empty]');
  const startChatButton = document.querySelector('[data-start-chat]');
  const currentName = document.querySelector('[data-current-name]');
  const currentRole = document.querySelector('[data-current-role]');
  const currentStatus = document.querySelector('[data-current-status]');
  const currentAvatar = document.querySelector('[data-current-avatar]');
  const composer = document.querySelector('#chat-composer');
  const messageInput = document.querySelector('#chat-message-input');
  const messages = document.querySelector('#chat-messages');
  let activeFilter = 'all';
  let selectedPerson = null;

  const updateHeaderShadow = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 1);
  };

  const applyConversationFilter = () => {
    const query = search?.value.trim().toLocaleLowerCase('vi') || '';
    let visibleCount = 0;

    conversations.forEach((conversation) => {
      const matchesQuery = conversation.textContent.toLocaleLowerCase('vi').includes(query);
      const matchesFilter = activeFilter === 'all'
        || (activeFilter === 'unread' && conversation.dataset.unread === 'true')
        || (activeFilter === 'tutor' && conversation.dataset.kind === 'tutor');
      const visible = matchesQuery && matchesFilter;
      conversation.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (listEmptyState) listEmptyState.hidden = visibleCount !== 0;
  };

  const closeNewMessageModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('has-chat-modal');
    openModalButton?.focus();
  };

  const openNewMessageModal = () => {
    if (!modal) return;
    selectedPerson = null;
    people.forEach((person) => {
      person.hidden = false;
      person.classList.remove('is-selected');
      person.setAttribute('aria-selected', 'false');
    });
    if (peopleSearch) peopleSearch.value = '';
    if (peopleEmpty) peopleEmpty.hidden = true;
    if (startChatButton) startChatButton.disabled = true;
    modal.hidden = false;
    document.body.classList.add('has-chat-modal');
    window.requestAnimationFrame(() => peopleSearch?.focus());
  };

  conversations.forEach((conversation) => {
    conversation.addEventListener('click', () => {
      if (landing) landing.hidden = true;
      if (chatView) chatView.hidden = false;
      conversations.forEach((item) => item.classList.toggle('is-active', item === conversation));
      conversation.dataset.unread = 'false';
      conversation.querySelector('.chat-conversation__preview b')?.remove();

      if (currentName) currentName.textContent = conversation.dataset.name;
      if (currentRole) currentRole.textContent = conversation.dataset.role;
      if (currentStatus) currentStatus.textContent = conversation.dataset.status;
      if (currentAvatar) {
        const sourceAvatar = conversation.querySelector('.chat-avatar');
        currentAvatar.className = sourceAvatar.className;
        currentAvatar.innerHTML = sourceAvatar.innerHTML;
      }
    });
  });

  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      activeFilter = filter.dataset.chatFilter;
      filters.forEach((item) => item.classList.toggle('is-active', item === filter));
      applyConversationFilter();
    });
  });

  search?.addEventListener('input', applyConversationFilter);

  openModalButton?.addEventListener('click', openNewMessageModal);
  closeModalButton?.addEventListener('click', closeNewMessageModal);

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeNewMessageModal();
  });

  peopleSearch?.addEventListener('input', () => {
    const query = peopleSearch.value.trim().toLocaleLowerCase('vi');
    let visibleCount = 0;
    people.forEach((person) => {
      const visible = person.textContent.toLocaleLowerCase('vi').includes(query);
      person.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (peopleEmpty) peopleEmpty.hidden = visibleCount !== 0;
  });

  people.forEach((person) => {
    person.setAttribute('aria-selected', 'false');
    person.addEventListener('click', () => {
      selectedPerson = person;
      people.forEach((item) => {
        const isSelected = item === person;
        item.classList.toggle('is-selected', isSelected);
        item.setAttribute('aria-selected', String(isSelected));
      });
      if (startChatButton) startChatButton.disabled = false;
    });
  });

  startChatButton?.addEventListener('click', () => {
    if (!selectedPerson) return;
    const selectedName = selectedPerson.dataset.personName;
    const conversation = conversations.find((item) => item.dataset.name === selectedName);

    if (landing) landing.hidden = true;
    if (chatView) chatView.hidden = false;
    closeNewMessageModal();

    if (conversation) {
      conversation.click();
    } else {
      if (currentName) currentName.textContent = selectedName;
      if (currentRole) currentRole.textContent = selectedPerson.dataset.personRole;
      if (currentStatus) currentStatus.textContent = selectedPerson.dataset.personStatus;
      if (currentAvatar) {
        const sourceAvatar = selectedPerson.querySelector('.chat-avatar');
        currentAvatar.className = sourceAvatar.className;
        currentAvatar.innerHTML = sourceAvatar.innerHTML;
      }
    }
  });

  composer?.addEventListener('submit', (event) => {
    event.preventDefault();
    const content = messageInput.value.trim();
    if (!content) return;

    const message = document.createElement('article');
    message.className = 'chat-message chat-message--outgoing';
    const bubble = document.createElement('div');
    bubble.className = 'chat-message__bubble';
    bubble.textContent = content;
    const time = document.createElement('time');
    time.textContent = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    message.append(bubble, time);
    messages.append(message);
    messageInput.value = '';
    messages.scrollTop = messages.scrollHeight;
  });

  messageInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeNewMessageModal();
  });

  updateHeaderShadow();
  window.addEventListener('scroll', updateHeaderShadow, { passive: true });
});

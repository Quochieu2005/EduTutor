(() => {
	const root = document.documentElement;
	const sidebarToggle = document.querySelector('#sidebar-toggle');
	const sidebar = document.querySelector('#admin-sidebar');
	const sidebarContent = sidebar?.querySelector('.admin-sidebar__content');
	const sidebarScrollKey = 'edututor-admin-sidebar-scroll';
	const mobileMenu = document.querySelector('#mobile-menu');
	const navigation = document.querySelector('#admin-nav');
	const searchButton = document.querySelector('#search-button');
	const searchPanel = document.querySelector('#search-panel');
	const searchInput = document.querySelector('#command-input');
	const commandItems = [...document.querySelectorAll('.command-item')];
	const themeToggle = document.querySelector('#theme-toggle');
	const userMenu = document.querySelector('.admin-user-menu');
	const notificationMenu = document.querySelector('[data-notification-menu]');
	const markNotificationsRead = document.querySelector('[data-mark-notifications-read]');
	const viewAllNotifications = document.querySelector('[data-view-all-notifications]');
	const settingsToggle = document.querySelector('[data-settings-not-used]');
	let settingsSubmenu = document.querySelector('[data-collapsible-menu]');

	const saveSidebarScroll = () => {
		if (!sidebarContent) return;
		try {
			sessionStorage.setItem(sidebarScrollKey, String(sidebarContent.scrollTop));
		} catch {
		}
	};

	const restoreSidebarScroll = () => {
		if (!sidebarContent) return;
		let savedPosition = null;
		try {
			savedPosition = sessionStorage.getItem(sidebarScrollKey);
		} catch {
		}
		if (savedPosition !== null) {
			sidebarContent.scrollTop = Number(savedPosition) || 0;
			return;
		}
		sidebarContent.querySelector('.admin-sidebar__link.is-active')?.scrollIntoView({ block: 'nearest' });
	};

	sidebarContent?.addEventListener('scroll', saveSidebarScroll, { passive: true });
	sidebarContent?.addEventListener('click', (event) => {
		if (event.target.closest('a.admin-sidebar__link, a.admin-sidebar__sub-link')) saveSidebarScroll();
	});
	window.addEventListener('pagehide', saveSidebarScroll);
	window.requestAnimationFrame(restoreSidebarScroll);
	if (settingsToggle && !settingsSubmenu) {
		settingsToggle.classList.add('admin-sidebar__link--collapsible');
		settingsToggle.setAttribute('aria-expanded', 'false');
		settingsToggle.setAttribute('aria-controls', 'settings-submenu');
		settingsSubmenu = document.createElement('ul');
		settingsSubmenu.id = 'settings-submenu';
		settingsSubmenu.className = 'admin-sidebar__subnav';
		settingsSubmenu.setAttribute('aria-label', 'Settings');
		settingsSubmenu.hidden = true;
		settingsSubmenu.innerHTML = [
			['Profile', '<circle cx="9" cy="7" r="4"></circle><path d="M2 21v-2a4 4 0 0 1 4-4h3"></path><circle cx="18" cy="15" r="3"></circle>'],
			['Account', '<path d="m14.7 6.3 1.6 1.6 3.1-3.1a6 6 0 0 1-7.1 8.3l-7.9 7.9a2.1 2.1 0 0 1-3-3l7.9-7.9a6 6 0 0 1 8.3-7.1Z"></path>'],
			['Appearance', '<path d="M12 22a10 9 0 1 1 10-9 5 5 0 0 1-5 5h-2.3a1.7 1.7 0 0 0-1.4 2.8l.3.4A1.7 1.7 0 0 1 12 22Z"></path><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle>'],
			['Notifications', '<path d="M10.3 21a2 2 0 0 0 3.4 0"></path><path d="M4 17h16a1 1 0 0 0 .7-1.7C19.4 14 18 12.5 18 8a6 6 0 0 0-12 0c0 4.5-1.4 6-2.7 7.3A1 1 0 0 0 4 17Z"></path>'],
			['Display', '<rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path>'],
		].map(([label, icon]) => `<li><button type="button" class="admin-sidebar__sub-link"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${label}</span></button></li>`).join('');
		settingsToggle.insertAdjacentElement('afterend', settingsSubmenu);
	}
	const dashboardTabs = [...document.querySelectorAll('.dashboard-tab[data-tab]')];
	const dashboardPanels = [...document.querySelectorAll('.dashboard-tab-panel[data-panel]')];
	const trafficChart = document.querySelector('.dashboard-traffic-chart__svg');
	const trafficPoints = [...document.querySelectorAll('.dashboard-traffic-chart__points circle')];
	let selectedIndex = 0;
	const savedTab = (() => {
		try {
			return localStorage.getItem('edututor-dashboard-tab');
		} catch {
			return null;
		}
	})();

	const setDashboardTab = (target) => {
		const selectedTab = dashboardTabs.find((tab) => tab.dataset.tab === target) || dashboardTabs[0];
		if (!selectedTab) return;
		dashboardTabs.forEach((item) => {
			const active = item === selectedTab;
			item.classList.toggle('is-active', active);
			item.setAttribute('aria-selected', String(active));
		});
		dashboardPanels.forEach((panel) => {
			panel.hidden = panel.dataset.panel !== selectedTab.dataset.tab;
			panel.classList.toggle('is-active', !panel.hidden);
		});
		try {
			localStorage.setItem('edututor-dashboard-tab', selectedTab.dataset.tab);
		} catch {
		}
	};

	setDashboardTab(savedTab || 'overview');

	trafficChart?.addEventListener('mousemove', (event) => {
		const bounds = trafficChart.getBoundingClientRect();
		const chartX = ((event.clientX - bounds.left) / bounds.width) * 1188;
		const nearestX = trafficPoints.reduce((closest, point) => {
			const distance = Math.abs(Number(point.dataset.pointX) - chartX);
			return distance < closest.distance ? { value: Number(point.dataset.pointX), distance } : closest;
		}, { value: 65, distance: Number.POSITIVE_INFINITY }).value;
		trafficPoints.forEach((point) => point.classList.toggle('is-hovered', Number(point.dataset.pointX) === nearestX));
	});

	trafficChart?.addEventListener('mouseleave', () => {
		trafficPoints.forEach((point) => point.classList.remove('is-hovered'));
	});

	const getSavedTheme = () => {
		try {
			return localStorage.getItem('edututor-theme');
		} catch {
			return null;
		}
	};

	const setTheme = (theme) => {
		root.dataset.theme = theme === 'dark' ? 'dark' : 'light';
		themeToggle?.setAttribute('aria-pressed', String(theme === 'dark'));
		try {
			localStorage.setItem('edututor-theme', root.dataset.theme);
		} catch {
		}
	};

	setTheme(getSavedTheme() || 'light');

	dashboardTabs.forEach((tab) => tab.addEventListener('click', () => {
		setDashboardTab(tab.dataset.tab);
	}));

	sidebarToggle?.addEventListener('click', () => {
		const isMobile = window.matchMedia('(max-width: 900px)').matches;
		const stateClass = isMobile ? 'is-open' : 'is-collapsed';
		const isOpen = sidebar.classList.toggle(stateClass);
		sidebarToggle.setAttribute('aria-pressed', String(isOpen));
	});

	const visibleItems = () => commandItems.filter((item) => !item.hidden);

	const selectItem = (index) => {
		const items = visibleItems();
		if (!items.length) return;
		selectedIndex = (index + items.length) % items.length;
		items.forEach((item, itemIndex) => item.classList.toggle('is-selected', itemIndex === selectedIndex));
	};

	const closeSearch = () => {
		searchPanel?.setAttribute('hidden', '');
		searchButton?.setAttribute('aria-expanded', 'false');
	};

	const resetTransientDashboardUi = () => {
		sidebar?.classList.remove('is-collapsed', 'is-open');
		sidebarToggle?.setAttribute('aria-pressed', 'false');
		navigation?.classList.remove('is-open');
		mobileMenu?.setAttribute('aria-expanded', 'false');
		closeSearch();
		if (searchInput) searchInput.value = '';
		commandItems.forEach((item) => {
			item.hidden = false;
			item.classList.remove('is-selected');
		});
		searchPanel?.querySelectorAll('[data-group]').forEach((group) => group.classList.remove('is-hidden'));
		trafficPoints.forEach((point) => point.classList.remove('is-hovered'));
		userMenu?.removeAttribute('open');
		notificationMenu?.removeAttribute('open');
		settingsToggle?.setAttribute('aria-expanded', 'false');
		if (settingsSubmenu) settingsSubmenu.hidden = true;
		selectedIndex = 0;
	};

	window.addEventListener('pageshow', (event) => {
		if (event.persisted) resetTransientDashboardUi();
	});

	mobileMenu?.addEventListener('click', () => {
		const isOpen = navigation.classList.toggle('is-open');
		mobileMenu.setAttribute('aria-expanded', String(isOpen));
	});

	searchButton?.addEventListener('click', () => {
		const isHidden = searchPanel.hasAttribute('hidden');
		searchPanel.toggleAttribute('hidden', !isHidden);
		searchButton.setAttribute('aria-expanded', String(isHidden));
		if (isHidden) {
			searchInput?.focus();
			selectItem(0);
		}
	});

	searchPanel?.addEventListener('click', (event) => {
		if (event.target === searchPanel) closeSearch();
	});

	document.addEventListener('click', (event) => {
		if (userMenu?.open && !userMenu.contains(event.target)) {
			userMenu.removeAttribute('open');
		}
		if (notificationMenu?.open && !notificationMenu.contains(event.target)) {
			notificationMenu.removeAttribute('open');
		}
	});

	const markAllNotificationsRead = () => {
		notificationMenu?.querySelectorAll('.is-unread').forEach((item) => item.classList.remove('is-unread'));
		const count = notificationMenu?.querySelector('[data-notification-count]');
		if (count) count.hidden = true;
		if (markNotificationsRead) markNotificationsRead.textContent = 'Đã đọc tất cả';
	};

	markNotificationsRead?.addEventListener('click', () => {
		markAllNotificationsRead();
	});

	viewAllNotifications?.addEventListener('click', () => {
		const extraNotifications = [...notificationMenu.querySelectorAll('[data-extra-notification]')];
		const willShow = extraNotifications.some((item) => item.hidden);
		extraNotifications.forEach((item) => {
			item.hidden = !willShow;
		});
		viewAllNotifications.textContent = willShow ? 'Thu gọn thông báo' : 'Xem tất cả thông báo';
	});

	searchInput?.addEventListener('input', () => {
		const query = searchInput.value.trim().toLowerCase();
		commandItems.forEach((item) => {
			item.hidden = query !== '' && !item.textContent.toLowerCase().includes(query);
		});
		searchPanel.querySelectorAll('[data-group]').forEach((group) => {
			group.classList.toggle('is-hidden', !group.querySelector('.command-item:not([hidden])'));
		});
		selectItem(0);
	});

	commandItems.forEach((item) => item.addEventListener('click', () => {
		if (item.dataset.route) {
			window.location.assign(item.dataset.route);
			return;
		}
		if (item.dataset.themeCommand) {
			setTheme(item.dataset.themeCommand);
		}
		closeSearch();
	}));

	document.addEventListener('keydown', (event) => {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			searchButton?.click();
		}
			if (event.key === 'Escape') {
				closeSearch();
				userMenu?.removeAttribute('open');
				notificationMenu?.removeAttribute('open');
			}
			if (!searchPanel?.hasAttribute('hidden') && event.key === 'ArrowDown') {
				event.preventDefault();
				selectItem(selectedIndex + 1);
			}
			if (!searchPanel?.hasAttribute('hidden') && event.key === 'ArrowUp') {
				event.preventDefault();
				selectItem(selectedIndex - 1);
			}
			if (!searchPanel?.hasAttribute('hidden') && event.key === 'Enter') {
				visibleItems()[selectedIndex]?.click();
			}
	});

	themeToggle?.addEventListener('click', () => {
		const isDark = root.dataset.theme === 'dark';
		setTheme(isDark ? 'light' : 'dark');
	});
})();

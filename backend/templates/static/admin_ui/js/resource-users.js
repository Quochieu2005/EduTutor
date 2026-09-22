document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".header-fixed");
  const table = document.querySelector(".resource-table");
  const body = document.querySelector("[data-resource-body]");
  const search = document.querySelector("[data-resource-search]");
  const statusInputs = [
    ...document.querySelectorAll(
      '.users-status-options input[type="checkbox"]',
    ),
  ];
  const pageSize = document.querySelector("[data-resource-page-size]");
  const pageSummary = document.querySelector("[data-resource-page-summary]");
  const currentPageButton = document.querySelector("[data-resource-current]");
  const previousButton = document.querySelector("[data-resource-prev]");
  const nextButton = document.querySelector("[data-resource-next]");
  const selectAll = document.querySelector("[data-resource-select-all]");
  const bulkBar = document.querySelector("[data-resource-bulk]");
  const selectedCount = document.querySelector(
    "[data-resource-selected-count]",
  );
  const modal = document.querySelector("[data-resource-modal]");
  const form = document.querySelector("[data-resource-form]");
  const formTitle = document.querySelector("[data-resource-form-title]");
  const entity = document.body.dataset.entityLabel || "mục";
  const resourceKey = document.body.dataset.resourceKey || "";
  const serverSubmit = form?.dataset.serverSubmit === "true";
  const provinceSelect = form?.querySelector("[data-location-province]");
  const wardSelect = form?.querySelector("[data-location-ward]");
  let page = 1;
  let sortDirection = 1;
  let sortField = "";

  if (!table || !body) return;

  form
    ?.querySelectorAll("[data-resource-password-toggle]")
    .forEach((button) => {
      const input = button.parentElement.querySelector(
        'input[type="password"], input[type="text"]',
      );
      if (!input) return;
      button.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        button.setAttribute(
          "aria-label",
          show ? "Ẩn mật khẩu" : "Hiện mật khẩu",
        );
        button.setAttribute("title", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        button.classList.toggle("is-visible", show);
      });
    });

  const filterWards = (preserveValue = "") => {
    if (!provinceSelect || !wardSelect) return;
    const provinceId = provinceSelect.value;
    [...wardSelect.options].forEach((option) => {
      if (!option.value) {
        option.hidden = false;
        option.textContent = provinceId
          ? "Chọn xã/phường/đặc khu"
          : "Chọn tỉnh/thành phố trước";
        return;
      }
      const visible = option.dataset.provinceId === provinceId;
      option.hidden = !visible;
      option.disabled = !visible;
    });
    const currentIsValid =
      wardSelect.selectedOptions[0]?.dataset.provinceId === provinceId;
    if (
      preserveValue &&
      [...wardSelect.options].some(
        (option) => option.value === preserveValue && !option.hidden,
      )
    ) {
      wardSelect.value = preserveValue;
    } else if (!currentIsValid) {
      wardSelect.value = "";
    }
  };
  provinceSelect?.addEventListener("change", () => filterWards());

  const columns = [...table.querySelectorAll("thead th[data-field]")].map(
    (item) => ({ key: item.dataset.field, label: item.textContent.trim() }),
  );
  const rows = () => [...body.querySelectorAll("tr[data-record-id]")];
  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLocaleLowerCase("vi");

  const toneFor = (value) => {
    const status = normalize(value);
    if (/inactive|rejected|cancelled|failed|blocked|locked/.test(status))
      return "danger";
    if (
      /active|approved|completed|published|sent|paid|passed|resolved|matched|available/.test(
        status,
      )
    )
      return "success";
    if (
      /pending|processing|scheduled|draft|review|screening|interview/.test(
        status,
      )
    )
      return "warning";
    if (/new|refunded/.test(status)) return "info";
    return "neutral";
  };

  const selectedStatuses = () =>
    statusInputs
      .filter((item) => item.checked)
      .map((item) => normalize(item.value));
  const matchedRows = () => {
    const query = normalize(search?.value);
    const statuses = selectedStatuses();
    return rows().filter((row) => {
      const status = normalize(
        row.querySelector('[data-field="status"]')?.dataset.value,
      );
      const searchableText =
        resourceKey === "contacts"
          ? [...row.querySelectorAll("td[data-field]")]
              .map((cell) => cell.dataset.value || "")
              .join(" ")
          : row.textContent;
      return (
        (!query || normalize(searchableText).includes(query)) &&
        (!statuses.length || statuses.includes(status))
      );
    });
  };

  const updateStatusCounts = () => {
    statusInputs.forEach((input) => {
      const count = rows().filter(
        (row) =>
          normalize(
            row.querySelector('[data-field="status"]')?.dataset.value,
          ) === normalize(input.value),
      ).length;
      const label = input.closest("label");
      if (label?.querySelector("[data-status-count]"))
        label.querySelector("[data-status-count]").textContent = count;
    });
  };

  const updateBulkBar = () => {
    const checks = rows()
      .map((row) => row.querySelector("[data-resource-select]"))
      .filter(Boolean);
    const selected = checks.filter((item) => item.checked);
    checks.forEach((item) =>
      item.closest("tr").classList.toggle("is-selected", item.checked),
    );
    if (bulkBar) bulkBar.hidden = selected.length === 0;
    if (selectedCount) selectedCount.textContent = selected.length;
    const visible = matchedRows()
      .filter((row) => !row.hidden)
      .map((row) => row.querySelector("[data-resource-select]"));
    if (selectAll) {
      selectAll.checked =
        visible.length > 0 && visible.every((item) => item.checked);
      selectAll.classList.toggle("is-all-selected", selectAll.checked);
    }
  };

  const render = () => {
    body.querySelector(".users-no-results")?.remove();
    const matches = matchedRows();
    const size = Number(pageSize?.value || 10);
    const totalPages = Math.max(1, Math.ceil(matches.length / size));
    page = Math.min(Math.max(page, 1), totalPages);
    const start = (page - 1) * size;
    const visible = new Set(matches.slice(start, start + size));
    rows().forEach((row) => {
      row.hidden = !visible.has(row);
    });

    if (!matches.length) {
      const empty = document.createElement("tr");
      empty.className = "users-no-results";
      empty.innerHTML = `<td colspan="${columns.length + 2}">No results.</td>`;
      body.appendChild(empty);
    }

    if (pageSummary)
      pageSummary.textContent = matches.length
        ? `Page ${page} of ${totalPages}`
        : "No results";
    if (currentPageButton) currentPageButton.textContent = page;
    if (previousButton) previousButton.disabled = page <= 1;
    if (nextButton) nextButton.disabled = page >= totalPages;
    updateBulkBar();
  };

  const renderFilterChips = () => {
    const filters = document.querySelector(".users-toolbar__filters");
    filters?.querySelector(".users-selected-filters")?.remove();
    const selected = statusInputs.filter((item) => item.checked);
    if (!selected.length || !filters) return;
    const group = document.createElement("div");
    group.className = "users-selected-filters";
    selected.forEach((input) => {
      const chip = document.createElement("span");
      chip.textContent = input
        .closest("label")
        .querySelector("span").textContent;
      group.appendChild(chip);
    });
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Reset";
    reset.addEventListener("click", () => {
      statusInputs.forEach((input) => {
        input.checked = false;
      });
      page = 1;
      renderFilterChips();
      render();
    });
    group.appendChild(reset);
    filters.appendChild(group);
  };

  const setCell = (cell, value, field) => {
    cell.dataset.value = value;
    cell.replaceChildren();
    if (field === "status") {
      const badge = document.createElement("span");
      badge.className = `users-status users-status--${toneFor(value)}`;
      badge.textContent = value;
      cell.appendChild(badge);
    } else {
      cell.textContent = value;
    }
  };

  const attachRowMenu = (row) => {
    const trigger = row.querySelector(".users-row-menu");
    if (!trigger || trigger.dataset.rowMenuAttached === "true") return;
    trigger.dataset.rowMenuAttached = "true";
    const menu = document.createElement("div");
    menu.className = "users-row-actions resource-row-actions-portal";
    menu.hidden = true;
    const isAdministrator = resourceKey === "administrators";
    const canEdit = !isAdministrator || row.dataset.canEdit === "true";
    const canDelete = !isAdministrator || row.dataset.canDelete === "true";
    const actions = [];
    if (canEdit)
      actions.push(
        '<button type="button" data-resource-edit>Edit <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.5 15H7a4 4 0 0 0-4 4v2"></path><path d="m14.4 17.6 4-4a2 2 0 0 1 3 3l-4 4-4 1z"></path><circle cx="10" cy="7" r="4"></circle></svg></button>',
      );
    if (canDelete)
      actions.push(
        '<button type="button" class="is-delete" data-resource-delete>Delete <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>',
      );
    menu.innerHTML = actions.join("<hr>");
    document.body.appendChild(menu);

    const positionMenu = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 6;
      let top = triggerRect.bottom + gap;
      let left = triggerRect.right - menuRect.width;
      if (top + menuRect.height > window.innerHeight - 8) {
        top = triggerRect.top - menuRect.height - gap;
      }
      left = Math.max(
        8,
        Math.min(left, window.innerWidth - menuRect.width - 8),
      );
      top = Math.max(8, top);
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.round(top)}px`;
    };

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      document.querySelectorAll(".users-row-actions").forEach((item) => {
        if (item !== menu) item.hidden = true;
      });
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      if (willOpen) positionMenu();
    });
    menu.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target.closest("[data-resource-edit]")) openModal(row);
      if (event.target.closest("[data-resource-delete]")) confirmDelete([row]);
      menu.hidden = true;
    });
  };

  const closeModal = () => {
    if (modal) modal.hidden = true;
    document.body.classList.remove("has-resource-modal");
  };

  const showResourceNotice = (message, isError = false) => {
    if (!message) return;
    let notices = document.querySelector(".resource-notices");
    if (!notices) {
      notices = document.createElement("div");
      notices.className = "resource-notices";
      notices.setAttribute("aria-live", "polite");
      const tableWrap = document.querySelector(".users-table-wrap");
      if (tableWrap) tableWrap.before(notices);
      else document.querySelector(".resource-page")?.prepend(notices);
    }
    const notice = document.createElement("div");
    notice.className = `resource-notice${isError ? " resource-notice--error" : ""}`;
    notice.setAttribute("role", isError ? "alert" : "status");
    notice.innerHTML =
      '<span></span><button type="button" aria-label="Đóng thông báo">&times;</button>';
    notice.querySelector("span").textContent = message;
    notice
      .querySelector("button")
      .addEventListener("click", () => notice.remove());
    notices.prepend(notice);
    window.setTimeout(() => notice.remove(), 5000);
  };

  const showAdministratorMessage = (message, isError = false) => {
    if (resourceKey !== "administrators") return;
    document
      .querySelectorAll("[data-administrator-status-message]")
      .forEach((item) => item.remove());
    const notice = document.createElement("div");
    notice.className = `administrator-message${isError ? " administrator-message--error" : ""}`;
    notice.dataset.administratorStatusMessage = "true";
    notice.setAttribute("role", isError ? "alert" : "status");
    notice.innerHTML =
      '<span></span><button type="button" aria-label="Đóng thông báo">&times;</button>';
    notice.querySelector("span").textContent = message;
    notice
      .querySelector("button")
      .addEventListener("click", () => notice.remove());
    const tableWrap = document.querySelector(".users-table-wrap");
    if (tableWrap) tableWrap.before(notice);
    else document.querySelector(".users-page")?.prepend(notice);
    window.setTimeout(() => notice.remove(), 5000);
  };

  const openModal = (row = null) => {
    if (!modal || !form) return;
    form.reset();
    form
      .querySelectorAll("[data-resource-image-preview]")
      .forEach((preview) => {
        preview.style.backgroundImage = "";
        preview.textContent = "+";
      });
    form.querySelectorAll("[data-resource-image-name]").forEach((name) => {
      name.textContent = "Chưa chọn ảnh";
    });
    form.querySelectorAll("[data-cv-extract-name]").forEach((name) => {
      name.textContent = "Chưa chọn CV";
    });
    form.querySelectorAll("[data-cv-extract-status]").forEach((status) => {
      status.textContent =
        "Dữ liệu gợi ý sẽ được điền vào form để bạn kiểm tra trước khi lưu.";
    });
    let savedValues = {};
    try {
      savedValues = row?.dataset.formValues
        ? JSON.parse(row.dataset.formValues)
        : {};
    } catch (_) {
      savedValues = {};
    }
    form.elements.record_id.value = row?.dataset.recordId || "";
    form.action = row?.dataset.editUrl || form.dataset.createUrl || form.action;
    if (formTitle)
      formTitle.textContent =
        resourceKey === "administrators"
          ? `${row ? "Sửa" : "Thêm"} quản trị viên`
          : resourceKey === "tutors"
            ? `${row ? "Cập nhật" : "Tạo"} hồ sơ gia sư`
            : resourceKey === "tutor-jobs"
              ? `${row ? "Cập nhật" : "Đăng"} tin tuyển dụng`
              : `${row ? "Edit" : "Add"} ${entity}`;
    if (row) {
      [...form.elements].forEach((field) => {
        if (!field.name || field.name === "record_id") return;
        if (field.type === "file") return;
        const cell = row.querySelector(
          `[data-field="${CSS.escape(field.name)}"]`,
        );
        if (Object.prototype.hasOwnProperty.call(savedValues, field.name))
          field.value = savedValues[field.name];
        else if (cell)
          field.value = cell.dataset.value || cell.textContent.trim();
      });
    }
    if (resourceKey === "tutors" && row) {
      const avatarUrl = row.dataset.avatarUrl || "";
      form
        .querySelectorAll("[data-resource-image-preview]")
        .forEach((preview) => {
          preview.style.backgroundImage = avatarUrl
            ? `url(${JSON.stringify(avatarUrl)})`
            : "";
          preview.textContent = avatarUrl ? "" : "+";
        });
      form.querySelectorAll("[data-resource-image-name]").forEach((name) => {
        name.textContent = avatarUrl ? "Ảnh hiện tại" : "Chưa chọn ảnh";
      });
    }
    filterWards(row ? savedValues.ward_id : "");
    if (resourceKey === "tutors") {
      form.elements.password.required = !row;
      // The default password is intended for a newly created tutor only.
      // Never pre-fill it while editing, otherwise a save would reset it.
      form.elements.password.value = row ? "" : "123456789";
      form
        .querySelector("[data-resource-password-toggle]")
        ?.classList.remove("is-visible");
      if (form.elements.password.type !== "password")
        form.elements.password.type = "password";
    }
    if (resourceKey === "administrators") {
      form.elements.role.value = row?.dataset.role || "admin";
      form.elements.permissions.value = row?.dataset.permissions || "";
      form.elements.managed_by.value = row?.dataset.managedBy || "";
      form.elements.status.value = row?.dataset.statusCode || "1";
      form.elements.password.required = !row;
      form.elements.password_confirmation.required = !row;
      form.dataset.editing = row ? "true" : "false";
      const selfEditing = row?.dataset.isCurrent === "true";
      ["role", "permissions", "managed_by", "status"].forEach((name) => {
        if (form.elements[name]) form.elements[name].disabled = selfEditing;
      });
      form.dispatchEvent(
        new CustomEvent("administrator:form-opened", { detail: { row } }),
      );
    }
    modal.hidden = false;
    document.body.classList.add("has-resource-modal");
    window.requestAnimationFrame(() =>
      form
        .querySelector('input:not([type="hidden"]), select, textarea')
        ?.focus(),
    );
  };

  const confirmDelete = (targets) => {
    if (!targets.length) return;
    const overlay = document.createElement("div");
    overlay.className = "delete-modal";
    overlay.innerHTML = `<div class="delete-dialog"><h2>&#9888; Delete ${targets.length > 1 ? `${targets.length} items` : entity}</h2><p>Are you sure you want to delete the selected data?<br>This action cannot be undone.</p><aside><b>Warning!</b><br>Please be careful, this operation can not be rolled back.</aside><footer><button type="button">Cancel</button><button type="button">Delete</button></footer></div>`;
    document.body.appendChild(overlay);
    const [cancel, remove] = overlay.querySelectorAll("footer button");
    cancel.addEventListener("click", () => overlay.remove());
    remove.addEventListener("click", async () => {
      const persistedTargets = targets.filter((row) => row.dataset.deleteUrl);
      if (persistedTargets.length) {
        remove.disabled = true;
        const csrfToken =
          form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
        let successMessage = "";
        for (const row of persistedTargets) {
          const response = await fetch(row.dataset.deleteUrl, {
            method: "POST",
            headers: {
              "X-CSRFToken": csrfToken,
              "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            remove.disabled = false;
            showResourceNotice(
              result.message || "Không thể xóa dữ liệu.",
              true,
            );
            return;
          }
          successMessage = result.message || successMessage;
        }
        showResourceNotice(successMessage || "Đã xóa dữ liệu.");
        setTimeout(() => window.location.reload(), 700);
        return;
      }
      targets.forEach((row) => row.remove());
      overlay.remove();
      updateStatusCounts();
      render();
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
  };

  document.querySelectorAll("[data-cv-extract-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const wrap = input.closest("[data-cv-extract-wrap]");
      const status = wrap?.querySelector("[data-cv-extract-status]");
      const name = wrap?.querySelector("[data-cv-extract-name]");
      const file = input.files?.[0];
      if (name) name.textContent = file?.name || "Chưa chọn CV";
      if (!file || !wrap?.dataset.cvExtractUrl) return;
      if (status) status.textContent = "Đang đọc CV và điền thông tin...";
      const data = new FormData();
      data.append("cv_file", file);
      try {
        const response = await fetch(wrap.dataset.cvExtractUrl, {
          method: "POST",
          headers: {
            "X-CSRFToken":
              form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || "",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: data,
          credentials: "same-origin",
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok)
          throw new Error(result.message || "Không thể đọc CV.");
        Object.entries(result.values || {}).forEach(([fieldName, value]) => {
          const field = form?.elements[fieldName];
          if (field && value !== "") field.value = value;
        });
        filterWards();
        if (status) status.textContent = result.message;
      } catch (error) {
        if (status)
          status.textContent =
            error.message || "Không thể đọc CV; vui lòng nhập thủ công.";
      }
    });
  });

  document.querySelectorAll("[data-resource-image-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const upload = input.closest(".administrator-upload-wrap");
      const preview = upload?.querySelector("[data-resource-image-preview]");
      const name = upload?.querySelector("[data-resource-image-name]");
      const file = input.files?.[0];
      if (name) name.textContent = file?.name || "Chưa chọn ảnh";
      if (!preview) return;
      preview.style.backgroundImage = "";
      preview.textContent = "+";
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        preview.style.backgroundImage = `url(${reader.result})`;
        preview.textContent = "";
      });
      reader.readAsDataURL(file);
    });
  });

  rows().forEach(attachRowMenu);
  updateStatusCounts();

  search?.addEventListener("input", () => {
    page = 1;
    render();
  });
  statusInputs.forEach((input) =>
    input.addEventListener("change", () => {
      page = 1;
      renderFilterChips();
      render();
    }),
  );
  pageSize?.addEventListener("change", () => {
    page = 1;
    render();
  });
  previousButton?.addEventListener("click", () => {
    page -= 1;
    render();
  });
  nextButton?.addEventListener("click", () => {
    page += 1;
    render();
  });

  selectAll?.addEventListener("change", () => {
    matchedRows()
      .filter((row) => !row.hidden)
      .forEach((row) => {
        row.querySelector("[data-resource-select]").checked = selectAll.checked;
      });
    updateBulkBar();
  });
  body.addEventListener("change", (event) => {
    if (event.target.matches("[data-resource-select]")) updateBulkBar();
  });

  const clearButton = document.querySelector("[data-resource-clear]");
  if (clearButton)
    clearButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
  const bulkDelete = document.querySelector("[data-resource-delete-selected]");
  if (bulkDelete)
    bulkDelete.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  clearButton?.addEventListener("click", () => {
    rows().forEach((row) => {
      row.querySelector("[data-resource-select]").checked = false;
    });
    updateBulkBar();
  });
  bulkDelete?.addEventListener("click", () =>
    confirmDelete(
      rows().filter(
        (row) => row.querySelector("[data-resource-select]")?.checked,
      ),
    ),
  );

  document
    .querySelector("[data-resource-add]")
    ?.addEventListener("click", () => openModal());
  document
    .querySelectorAll("[data-resource-modal-close]")
    .forEach((button) => button.addEventListener("click", closeModal));
  document
    .querySelectorAll("[data-resource-notice-close]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        button.closest(".resource-notice")?.remove(),
      ),
    );
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  body.addEventListener("click", (event) => {
    const bannerStatusButton = event.target.closest(
      "[data-banner-status-toggle]",
    );
    if (bannerStatusButton) {
      const row = bannerStatusButton.closest("tr[data-record-id]");
      if (!row?.dataset.statusToggleUrl) return;
      bannerStatusButton.disabled = true;
      const csrfToken =
        form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
      fetch(row.dataset.statusToggleUrl, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      })
        .then(async (response) => ({
          response,
          result: await response.json().catch(() => ({})),
        }))
        .then(({ response, result }) => {
          if (!response.ok || !result.ok)
            throw new Error(
              result.message || "Không thể đổi trạng thái banner.",
            );
          const active = result.status_code === "active";
          const cell = bannerStatusButton.closest("td");
          cell.dataset.value = result.status;
          bannerStatusButton.textContent = result.status;
          bannerStatusButton.className = `users-status users-status--${active ? "success" : "danger"} banner-status-toggle`;
          bannerStatusButton.setAttribute(
            "aria-label",
            `Đổi trạng thái ${result.status}`,
          );
          showResourceNotice(result.message);
        })
        .catch((error) => showResourceNotice(error.message, true))
        .finally(() => {
          bannerStatusButton.disabled = false;
        });
      return;
    }
    const statusButton = event.target.closest(
      "[data-administrator-status-toggle]",
    );
    if (statusButton) {
      const row = statusButton.closest("tr[data-record-id]");
      if (!row?.dataset.statusToggleUrl) return;

      statusButton.disabled = true;
      const csrfToken =
        form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
      fetch(row.dataset.statusToggleUrl, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      })
        .then(async (response) => ({
          response,
          result: await response.json().catch(() => ({})),
        }))
        .then(({ response, result }) => {
          if (!response.ok || !result.ok)
            throw new Error(
              result.message || "Không thể đổi trạng thái quản trị viên.",
            );
          const active = String(result.status_code) === "1";
          row.dataset.statusCode = String(result.status_code);
          const cell = statusButton.closest("td");
          cell.dataset.value = result.status;
          statusButton.textContent = result.status;
          statusButton.className = `users-status users-status--${active ? "success" : "danger"} administrator-status-toggle`;
          statusButton.setAttribute(
            "aria-label",
            `Đổi trạng thái ${result.status}`,
          );
          updateStatusCounts();
          showAdministratorMessage(result.message);
        })
        .catch((error) => showAdministratorMessage(error.message, true))
        .finally(() => {
          statusButton.disabled = false;
        });
      return;
    }
    const blogCategoryStatusButton = event.target.closest(
      "[data-blog-category-status-toggle]",
    );
    if (blogCategoryStatusButton) {
      const row = blogCategoryStatusButton.closest("tr[data-record-id]");
      if (!row?.dataset.statusToggleUrl) return;
      blogCategoryStatusButton.disabled = true;
      const csrfToken =
        form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
      fetch(row.dataset.statusToggleUrl, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      })
        .then(async (response) => ({
          response,
          result: await response.json().catch(() => ({})),
        }))
        .then(({ response, result }) => {
          if (!response.ok || !result.ok)
            throw new Error(
              result.message || "Không thể đổi trạng thái danh mục.",
            );
          const statusCell = blogCategoryStatusButton.closest("td");
          statusCell.dataset.value = result.status;
          statusCell.title = result.status;
          blogCategoryStatusButton.textContent = result.status;
          blogCategoryStatusButton.className = `users-status users-status--${toneFor(result.status)} blog-category-status-toggle`;
          blogCategoryStatusButton.setAttribute(
            "aria-label",
            `Đổi trạng thái ${result.status}`,
          );
          const formValues = JSON.parse(row.dataset.formValues || "{}");
          formValues.status = String(result.status_code);
          row.dataset.formValues = JSON.stringify(formValues);
          updateStatusCounts();
          showResourceNotice(result.message);
        })
        .catch((error) => showResourceNotice(error.message, true))
        .finally(() => {
          blogCategoryStatusButton.disabled = false;
        });
      return;
    }
    const blogStatusButton = event.target.closest("[data-blog-status-toggle]");
    if (blogStatusButton) {
      const row = blogStatusButton.closest("tr[data-record-id]");
      if (!row?.dataset.statusToggleUrl) return;
      blogStatusButton.disabled = true;
      const csrfToken =
        form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
      fetch(row.dataset.statusToggleUrl, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      })
        .then(async (response) => ({
          response,
          result: await response.json().catch(() => ({})),
        }))
        .then(({ response, result }) => {
          if (!response.ok || !result.ok)
            throw new Error(
              result.message || "Không thể đổi trạng thái bài viết.",
            );
          const statusCell = blogStatusButton.closest("td");
          statusCell.dataset.value = result.status;
          blogStatusButton.textContent = result.status;
          blogStatusButton.className = `users-status users-status--${toneFor(result.status)} blog-status-toggle`;
          blogStatusButton.setAttribute(
            "aria-label",
            `Đổi trạng thái ${result.status}`,
          );
          const publishedCell = row.querySelector('[data-field="published"]');
          if (publishedCell) {
            publishedCell.dataset.value = result.published_at;
            publishedCell.textContent = result.published_at;
            publishedCell.title = result.published_at;
          }
          updateStatusCounts();
          showResourceNotice(result.message);
        })
        .catch((error) => showResourceNotice(error.message, true))
        .finally(() => {
          blogStatusButton.disabled = false;
        });
      return;
    }
    const tutorJobStatusButton = event.target.closest(
      "[data-tutor-job-status-toggle]",
    );
    if (tutorJobStatusButton) {
      const row = tutorJobStatusButton.closest("tr[data-record-id]");
      if (!row?.dataset.statusToggleUrl) return;
      tutorJobStatusButton.disabled = true;
      const csrfToken =
        form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || "";
      fetch(row.dataset.statusToggleUrl, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      })
        .then(async (response) => ({
          response,
          result: await response.json().catch(() => ({})),
        }))
        .then(({ response, result }) => {
          if (!response.ok || !result.ok)
            throw new Error(
              result.message || "Không thể đổi trạng thái tin tuyển dụng.",
            );
          const statusCell = tutorJobStatusButton.closest("td");
          statusCell.dataset.value = result.status;
          tutorJobStatusButton.textContent = result.status;
          tutorJobStatusButton.className = `users-status users-status--${toneFor(result.status)} tutor-job-status-toggle`;
          tutorJobStatusButton.setAttribute(
            "aria-label",
            `Đổi trạng thái ${result.status}`,
          );
          updateStatusCounts();
          showResourceNotice(result.message);
        })
        .catch((error) => showResourceNotice(error.message, true))
        .finally(() => {
          tutorJobStatusButton.disabled = false;
        });
      return;
    }
    const row = event.target.closest("tr[data-record-id]");
    if (event.target.closest("[data-resource-edit]")) openModal(row);
    if (event.target.closest("[data-resource-delete]")) confirmDelete([row]);
  });
  document.addEventListener("click", () =>
    document.querySelectorAll(".users-row-actions").forEach((menu) => {
      menu.hidden = true;
    }),
  );
  window.addEventListener("resize", () =>
    document
      .querySelectorAll(".resource-row-actions-portal")
      .forEach((menu) => {
        menu.hidden = true;
      }),
  );
  window.addEventListener(
    "scroll",
    () =>
      document
        .querySelectorAll(".resource-row-actions-portal")
        .forEach((menu) => {
          menu.hidden = true;
        }),
    { passive: true },
  );
  document.querySelector(".users-table-scroll")?.addEventListener(
    "scroll",
    () =>
      document
        .querySelectorAll(".resource-row-actions-portal")
        .forEach((menu) => {
          menu.hidden = true;
        }),
    { passive: true },
  );

  form?.addEventListener("submit", (event) => {
    if (serverSubmit) return;
    event.preventDefault();
    const data = new FormData(form);
    let row = data.get("record_id")
      ? body.querySelector(
          `tr[data-record-id="${CSS.escape(data.get("record_id"))}"]`,
        )
      : null;
    if (!row) {
      row = document.createElement("tr");
      row.dataset.recordId = `new-${Date.now()}`;
      const check = document.createElement("td");
      check.innerHTML =
        '<input type="checkbox" data-resource-select aria-label="Chọn mục" />';
      row.appendChild(check);
      columns.forEach(({ key }) => {
        const cell = document.createElement("td");
        cell.dataset.field = key;
        setCell(cell, String(data.get(key) || ""), key);
        row.appendChild(cell);
      });
      const action = document.createElement("td");
      action.innerHTML =
        '<button class="users-row-menu" type="button" aria-label="Thao tác">&hellip;</button>';
      row.appendChild(action);
      body.prepend(row);
      attachRowMenu(row);
    } else {
      columns.forEach(({ key }) => {
        const cell = row.querySelector(`[data-field="${CSS.escape(key)}"]`);
        if (cell && data.has(key)) setCell(cell, String(data.get(key)), key);
      });
    }
    closeModal();
    updateStatusCounts();
    page = 1;
    render();
  });

  table.querySelectorAll("th[data-resource-sort]").forEach((head) =>
    head.addEventListener("click", () => {
      const field = head.dataset.field;
      sortDirection = sortField === field ? sortDirection * -1 : 1;
      sortField = field;
      table
        .querySelectorAll("th[data-resource-sort]")
        .forEach((item) => item.removeAttribute("data-sort-direction"));
      head.dataset.sortDirection = sortDirection === 1 ? "asc" : "desc";
      rows()
        .sort((a, b) => {
          const first =
            a.querySelector(`[data-field="${CSS.escape(field)}"]`)?.dataset
              .value || "";
          const second =
            b.querySelector(`[data-field="${CSS.escape(field)}"]`)?.dataset
              .value || "";
          return (
            first.localeCompare(second, "vi", { numeric: true }) * sortDirection
          );
        })
        .forEach((row) => body.appendChild(row));
      page = 1;
      render();
    }),
  );

  const viewButton = document.querySelector("[data-resource-view]");
  const viewMenu = document.querySelector(".users-view-popover");
  viewButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    viewMenu.hidden = !viewMenu.hidden;
  });
  viewMenu?.querySelectorAll("[data-column-toggle]").forEach((label) =>
    label.addEventListener("click", () => {
      const field = label.dataset.columnToggle;
      const hidden = !label.classList.contains("is-hidden");
      label.classList.toggle("is-hidden", hidden);
      const index = [...table.querySelectorAll("thead th")].findIndex(
        (head) => head.dataset.field === field,
      );
      table.querySelectorAll("tr").forEach((row) => {
        if (row.children[index]) row.children[index].hidden = hidden;
      });
    }),
  );

  document
    .querySelector("[data-resource-export]")
    ?.addEventListener("click", () => {
      const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
      const csv = [columns.map(({ label }) => quote(label)).join(",")];
      matchedRows().forEach((row) =>
        csv.push(
          columns
            .map(({ key }) =>
              quote(
                row.querySelector(`[data-field="${CSS.escape(key)}"]`)?.dataset
                  .value || "",
              ),
            )
            .join(","),
        ),
      );
      const url = URL.createObjectURL(
        new Blob([`\uFEFF${csv.join("\n")}`], {
          type: "text/csv;charset=utf-8",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${document.body.dataset.resourceKey || "data"}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    });

  document
    .querySelector("[data-tutor-send-credentials]")
    ?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const selected = rows().filter(
        (row) => row.querySelector("[data-resource-select]")?.checked,
      );
      if (!selected.length) {
        showResourceNotice(
          "Vui lòng chọn ít nhất một gia sư để gửi thông tin đăng nhập.",
          true,
        );
        return;
      }
      if (
        !window.confirm(
          `Gửi thông tin đăng nhập cho ${selected.length} gia sư đã chọn? Mật khẩu hiện tại của họ sẽ được thay bằng mật khẩu tạm mới.`,
        )
      )
        return;
      const originalContent = button.innerHTML;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.innerHTML = "<span>Đang gửi...</span>";
      showResourceNotice(
        `Đang gửi thông tin đăng nhập cho ${selected.length} gia sư. Vui lòng không tải lại trang.`,
      );
      try {
        const response = await fetch(button.dataset.sendCredentialsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken":
              form?.querySelector('[name="csrfmiddlewaretoken"]')?.value || "",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            slugs: selected
              .map((row) => row.dataset.recordSlug)
              .filter(Boolean),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok)
          throw new Error(
            result.message || "Không thể gửi thông tin đăng nhập.",
          );
        showResourceNotice(result.message);
      } catch (error) {
        showResourceNotice(
          error.message || "Không thể gửi thông tin đăng nhập.",
          true,
        );
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        button.innerHTML = originalContent;
      }
    });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modal && !modal.hidden) closeModal();
    else clearButton?.click();
  });

  const updateHeaderShadow = () =>
    header?.classList.toggle("is-scrolled", window.scrollY > 1);
  updateHeaderShadow();
  window.addEventListener("scroll", updateHeaderShadow, { passive: true });
  render();
});

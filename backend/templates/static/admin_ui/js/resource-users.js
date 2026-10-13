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
  const scheduleRecurrenceDays = [
    ...(form?.querySelectorAll("[data-schedule-recurrence-day]") || []),
  ];
  const scheduleRecurrenceEnd = form?.querySelector(
    "[data-schedule-recurrence-end]",
  );
  const scheduleSessionDate = form?.querySelector('[name="session_date"]');
  const scheduleStatus = form?.elements.status;
  const scheduleStatusNote = form?.querySelector("[data-schedule-status-note]");
  const tutorRequestSubject = form?.elements.subject_id;
  const tutorRequestTutor = form?.elements.tutor_id;
  const scheduleTutorSearch = form?.querySelector("[data-schedule-tutor-search]");
  const scheduleTutorSelect = form?.elements.tutor_id;
  const feedbackStatus = form?.elements.status;
  const scheduleMode = form?.querySelector("[data-schedule-mode]");
  const scheduleWeekdayModes = [
    ...(form?.querySelectorAll("[data-schedule-weekday-mode]") || []),
  ];
  const scheduleWeekdayModeRows = [
    ...(form?.querySelectorAll("[data-schedule-weekday-mode-row]") || []),
  ];
  const scheduleLocationFields = [
    ...(form?.querySelectorAll("[data-schedule-location-field]") || []),
  ];
  const locationDetailInput = form?.querySelector('[name="location_detail"]');
  const scheduleOnlineField = form?.querySelector("[data-schedule-online-field]");
  const meetingUrlInput = form?.querySelector('[name="meeting_url"]');
  const scheduleCreateOnly = [
    ...(form?.querySelectorAll("[data-schedule-create-only]") || []),
  ];
  const scheduleEditScopeField = form?.querySelector("[data-schedule-edit-scope]");
  const scheduleEditScope = form?.querySelector("[data-schedule-edit-scope-select]");
  let page = 1;
  let sortDirection = 1;
  let sortField = "";

  const toDateTimeLocalValue = (value) => {
    const pad = (part) => String(part).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  };

  const bindRecruitmentDecisionValidation = (candidate) => {
    const decision = candidate.querySelector('input[name="decision"]')?.value;
    const note = candidate.querySelector('[name="note"]');
    note?.addEventListener("invalid", () => {
      if (decision === "rejected" && !note.value.trim()) {
        note.setCustomValidity("Vui lòng nhập lý do không đạt trước khi gửi email.");
      }
    });
    note?.addEventListener("input", () => note.setCustomValidity(""));
    candidate.addEventListener("submit", (event) => {
      if (note) {
        note.setCustomValidity("");
      }
      if (note && note.value.trim().length > 2000) {
        event.preventDefault();
        note.setCustomValidity("Ghi chú không được vượt quá 2.000 ký tự.");
        note.reportValidity();
        return;
      }
      if (decision === "rejected" && note && !note.value.trim()) {
        event.preventDefault();
        note.setCustomValidity("Vui lòng nhập lý do không đạt trước khi gửi email.");
        note.reportValidity();
        return;
      }
      const submit = candidate.querySelector('button[type="submit"]');
      if (!submit) return;
      submit.disabled = true;
      submit.textContent = "Đang gửi...";
    });
  };

  document
    .querySelectorAll(
      '.recruitment-actions input[name="note"], .recruitment-actions textarea[name="note"]',
    )
    .forEach((field) => {
      field.setAttribute("autocomplete", "off");
      field.setAttribute("spellcheck", "true");
    });

  document.querySelectorAll(".recruitment-actions").forEach((details) => {
    const summary = details.querySelector(":scope > summary");
    if (!summary || !details.parentElement) return;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "recruitment-action-trigger";
    trigger.innerHTML = summary.innerHTML;
    trigger.setAttribute("aria-expanded", "false");
    details.classList.add("recruitment-actions--external-trigger");
    summary.hidden = true;
    details.parentElement.insertBefore(trigger, details);
    const isScheduleActions = Boolean(
      details.closest(
        ".resource-list--tutor-interviews, .resource-list--tutor-trials",
      ),
    );
    if (isScheduleActions) {
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "recruitment-actions-close";
      closeButton.setAttribute("aria-label", "Đóng thao tác");
      closeButton.textContent = "×";
      closeButton.addEventListener("click", () => {
        details.open = false;
      });
      details.insertBefore(closeButton, details.firstChild);
    }
    const closeWhenOutside = (event) => {
      if (!details.open || details.contains(event.target) || trigger.contains(event.target)) {
        return;
      }
      details.open = false;
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && details.open) {
        details.open = false;
        trigger.focus();
      }
    });
    const renderScheduleContext = () => {
      if (!isScheduleActions || details.querySelector(".recruitment-schedule-context")) {
        return;
      }
      const row = details.closest("tr[data-form-values]");
      if (!row) return;
      let values;
      try {
        values = JSON.parse(row.dataset.formValues || "{}").recruitment_recipient;
      } catch {
        return;
      }
      if (!values) return;
      const context = document.createElement("section");
      context.className = "recruitment-schedule-context";
      const title = document.createElement("strong");
      title.textContent = details.closest(".resource-list--tutor-trials")
        ? "Ứng viên dạy thử"
        : "Ứng viên phỏng vấn";
      const identity = document.createElement("p");
      identity.className = "recruitment-schedule-context__identity";
      identity.textContent = `${values.name || "-"} · ${values.email || "-"}`;
      const job = document.createElement("p");
      job.className = "recruitment-schedule-context__job";
      job.textContent = `${values.job || "Đăng ký chung"} · ${values.subject || "Chưa rõ môn"}${values.grade && values.grade !== "-" ? ` · ${values.grade}` : ""}`;
      const meta = document.createElement("p");
      meta.className = "recruitment-schedule-context__meta";
      meta.textContent = `SĐT: ${values.phone || "-"} · Khu vực: ${values.area || "-"}`;
      context.append(title, identity, job, meta);
      details.insertBefore(context, details.querySelector(":scope > form"));
    };
    const positionPanel = () => {
      if (!details.open) return;
      const triggerRect = trigger.getBoundingClientRect();
      const isCentered = details.classList.contains(
        "recruitment-actions--centered",
      );
      const panelWidth = isCentered
        ? Math.min(isScheduleActions ? 560 : 420, window.innerWidth - 32)
        : Math.min(160, Math.max(150, window.innerWidth - 32));
      if (isCentered) {
        details.style.position = "fixed";
        details.style.left = "50%";
        details.style.right = "auto";
        details.style.top = "50%";
        details.style.width = `${panelWidth}px`;
        details.style.transform = "translate(-50%, -50%)";
        return;
      }
      const centeredLeft = triggerRect.left + (triggerRect.width - panelWidth) / 2;
      const left = Math.max(
        12,
        Math.min(centeredLeft, window.innerWidth - panelWidth - 12),
      );
      details.style.position = "fixed";
      details.style.left = `${left}px`;
      details.style.right = "auto";
      details.style.top = `${triggerRect.bottom + 4}px`;
      details.style.width = `${panelWidth}px`;
      details.style.transform = "none";
    };
    trigger.addEventListener("click", () => {
      details.open = !details.open;
    });
    details.addEventListener("toggle", () => {
      trigger.setAttribute("aria-expanded", details.open ? "true" : "false");
      if (details.open) {
        if (isScheduleActions) {
          details.classList.add("recruitment-actions--centered");
        }
        renderScheduleContext();
        positionPanel();
      } else {
        if (
          details.classList.contains("recruitment-actions--choice-first") ||
          details.classList.contains("recruitment-actions--scheduled-flow")
        ) {
          details.removeAttribute("data-active-form");
          details.classList.remove("is-configuring", "recruitment-actions--centered");
          details
            .querySelectorAll('[data-recruitment-form]')
            .forEach((entry) => entry.classList.remove("is-active"));
          details
            .querySelectorAll(".recruitment-decision-form")
            .forEach((entry) => entry.classList.remove("is-active"));
        }
        details.style.removeProperty("position");
        details.style.removeProperty("left");
        details.style.removeProperty("right");
        details.style.removeProperty("top");
        details.style.removeProperty("width");
        details.style.removeProperty("transform");
      }
    });
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);

    const forms = [...details.querySelectorAll(":scope > form")];
    const decisionForms = forms.filter((candidate) =>
      candidate.querySelector('input[name="decision"]'),
    );
    if (isScheduleActions && decisionForms.length === 2 && forms.length === 3) {
      details.classList.add("recruitment-actions--scheduled-flow");
      const isTrialActions = Boolean(
        details.closest(".resource-list--tutor-trials"),
      );
      const scheduleForm = forms.find((candidate) =>
        candidate.querySelector('[name="scheduled_at"]'),
      );
      const scheduleInput = scheduleForm?.querySelector('[name="scheduled_at"]');
      const modeInput = scheduleForm?.querySelector('[name="mode"]');
      const locationInput = scheduleForm?.querySelector('[name="location"]');
      const noteInput = scheduleForm?.querySelector('[name="note"]');
      if (scheduleForm && scheduleInput) {
        const minimum = new Date(Date.now() + 60 * 1000);
        scheduleInput.min = toDateTimeLocalValue(minimum);
        scheduleInput.addEventListener("invalid", () => {
          if (!scheduleInput.value) {
            scheduleInput.setCustomValidity("Vui lòng chọn ngày giờ hợp lệ.");
          } else if (scheduleInput.validity.rangeUnderflow) {
            scheduleInput.setCustomValidity("Thời gian phải lớn hơn thời điểm hiện tại.");
          }
        });
        [scheduleInput, locationInput, noteInput].forEach((field) => {
          field?.addEventListener("input", () => field.setCustomValidity(""));
        });
        scheduleForm.addEventListener("submit", (event) => {
          [scheduleInput, modeInput, locationInput, noteInput].forEach((field) => {
            field?.setCustomValidity("");
          });
          const selectedAt = scheduleInput.value ? new Date(scheduleInput.value) : null;
          if (!scheduleInput.value || !selectedAt || Number.isNaN(selectedAt.getTime())) {
            event.preventDefault();
            scheduleInput.setCustomValidity("Vui lòng chọn ngày giờ hợp lệ.");
            scheduleInput.reportValidity();
            return;
          }
          if (selectedAt.getTime() <= Date.now()) {
            event.preventDefault();
            scheduleInput.setCustomValidity("Thời gian phải lớn hơn thời điểm hiện tại.");
            scheduleInput.reportValidity();
            return;
          }
          if (!modeInput?.value) {
            event.preventDefault();
            modeInput?.setCustomValidity("Vui lòng chọn hình thức.");
            modeInput?.reportValidity();
            return;
          }
          if (!locationInput?.value.trim()) {
            event.preventDefault();
            locationInput?.setCustomValidity("Vui lòng nhập đường dẫn trực tuyến hoặc địa điểm.");
            locationInput?.reportValidity();
            return;
          }
          if ((noteInput?.value || "").trim().length > 2000) {
            event.preventDefault();
            noteInput?.setCustomValidity("Ghi chú không được vượt quá 2.000 ký tự.");
            noteInput?.reportValidity();
            return;
          }
          const submit = scheduleForm.querySelector('button[type="submit"]');
          if (submit) {
            submit.disabled = true;
            submit.textContent = "Đang gửi...";
          }
        });
      }
      const workflowStage = isTrialActions ? "trial" : "interview";
      decisionForms.forEach((candidate) => {
        if (!candidate.querySelector('input[name="stage"]')) {
          const stageInput = document.createElement("input");
          stageInput.type = "hidden";
          stageInput.name = "stage";
          stageInput.value = workflowStage;
          candidate.appendChild(stageInput);
        }
        bindRecruitmentDecisionValidation(candidate);
      });
      const choices = document.createElement("div");
      choices.className = "recruitment-action-choices";
      const choiceDefinitions = [
        [
          "approved",
          isTrialActions ? "Đạt dạy thử → Tiếp nhận" : "Đạt phỏng vấn → Dạy thử",
          "",
        ],
        [
          "rejected",
          isTrialActions ? "Không đạt dạy thử" : "Không đạt phỏng vấn",
          "recruitment-action-choice--danger",
        ],
      ];
      choiceDefinitions.forEach(([value, label, variant]) => {
        const choice = document.createElement("button");
        choice.type = "button";
        choice.className = `recruitment-action-choice ${variant}`.trim();
        choice.textContent = label;
        choice.addEventListener("click", () => {
          details.dataset.activeForm = value;
          details.classList.add("is-configuring");
          decisionForms.forEach((candidate) => {
            candidate.classList.toggle(
              "is-active",
              candidate.querySelector('input[name="decision"]')?.value === value,
            );
          });
          const activeForm = decisionForms.find(
            (candidate) => candidate.querySelector('input[name="decision"]')?.value === value,
          );
          if (activeForm && !activeForm.querySelector(".recruitment-action-back")) {
            const backButton = document.createElement("button");
            backButton.type = "button";
            backButton.className = "recruitment-action-back";
            backButton.textContent = "← Chọn lại";
            backButton.addEventListener("click", () => {
              details.removeAttribute("data-active-form");
              details.classList.remove("is-configuring");
              decisionForms.forEach((entry) => entry.classList.remove("is-active"));
              positionPanel();
            });
            activeForm.insertBefore(backButton, activeForm.firstChild);
          }
          positionPanel();
        });
        choices.appendChild(choice);
      });
      forms[0].after(choices);
      return;
    }
    // The approval menu has exactly two decisions. Keep the schedule/result
    // menu on the interview page unchanged; it needs all four operations.
    if (decisionForms.length !== 2 || forms.length !== 2) return;

    details.classList.add("recruitment-actions--choice-first");
    decisionForms.forEach((candidate) => {
      const decision = candidate.querySelector('input[name="decision"]')?.value;
      candidate.dataset.recruitmentForm = decision || "";
      if (decision === "reviewing") {
        const submit = candidate.querySelector('button[type="submit"]');
        if (submit) submit.textContent = "Duyệt hồ sơ & gửi email";
      }
      const backButton = document.createElement("button");
      backButton.type = "button";
      backButton.className = "recruitment-action-back";
      backButton.textContent = "← Chọn lại";
      backButton.addEventListener("click", () => {
        details.removeAttribute("data-active-form");
        details.classList.remove("is-configuring", "recruitment-actions--centered");
        decisionForms.forEach((entry) => entry.classList.remove("is-active"));
        positionPanel();
      });
      candidate.insertBefore(backButton, candidate.firstChild);
      bindRecruitmentDecisionValidation(candidate);
    });

    const choices = document.createElement("div");
    choices.className = "recruitment-action-choices";
    const choiceDefinitions = [
      ["reviewing", "Duyệt hồ sơ", "recruitment-action-choice--primary"],
      ["rejected", "Từ chối hồ sơ", "recruitment-action-choice--danger"],
    ];
    choiceDefinitions.forEach(([value, label, variant]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `recruitment-action-choice ${variant}`;
      button.textContent = label;
      button.addEventListener("click", () => {
        details.dataset.activeForm = value;
        details.classList.add("is-configuring");
        details.classList.add("recruitment-actions--centered");
        decisionForms.forEach((candidate) => {
          candidate.classList.toggle(
            "is-active",
            candidate.dataset.recruitmentForm === value,
          );
        });
        const activeForm = details.querySelector(
          `[data-recruitment-form="${value}"]`,
        );
        const row = details.closest("tr[data-form-values]");
        if (activeForm && row && !activeForm.querySelector(".recruitment-recipient-summary")) {
          try {
            const values = JSON.parse(row.dataset.formValues || "{}").recruitment_recipient;
            if (values) {
              const summary = document.createElement("section");
              summary.className = "recruitment-recipient-summary";
              const title = document.createElement("strong");
              title.textContent = "Email sẽ gửi tới ứng viên";
              summary.appendChild(title);
              const fields = [
                ["Họ tên", values.name],
                ["Email", values.email],
                ["Môn dạy", values.subject],
                ["Lớp", values.grade],
                ["Số điện thoại", values.phone],
                ["Khu vực", values.area],
                ["Hình thức", values.mode],
              ];
              const list = document.createElement("dl");
              fields.forEach(([label, text]) => {
                const item = document.createElement("div");
                const key = document.createElement("dt");
                key.textContent = label;
                const content = document.createElement("dd");
                content.textContent = text || "-";
                item.append(key, content);
                list.appendChild(item);
              });
              summary.appendChild(list);
              activeForm.querySelector(".recruitment-action-back")?.after(summary);
            }
          } catch (_) {
            // Keep the decision form usable if an old row has no detail payload.
          }
        }
        const noteInput = activeForm?.querySelector('input[name="note"]');
        if (noteInput) {
          const noteArea = document.createElement("textarea");
          ["name", "maxlength", "placeholder", "required", "autocomplete", "spellcheck"].forEach(
            (attribute) => {
              if (noteInput.hasAttribute(attribute)) {
                noteArea.setAttribute(attribute, noteInput.getAttribute(attribute) || "");
              }
            },
          );
          noteArea.rows = 4;
          noteArea.value = noteInput.value;
          noteInput.replaceWith(noteArea);
        }
        details
          .querySelector(`[data-recruitment-form="${value}"] [name="note"]`)
          ?.focus();
        positionPanel();
      });
      choices.appendChild(button);
    });
    details.insertBefore(choices, forms[0]);
  });

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

  const filterScheduleTutors = () => {
    if (resourceKey !== "schedules" || !scheduleTutorSearch || !scheduleTutorSelect)
      return;
    const query = normalize(scheduleTutorSearch.value);
    [...scheduleTutorSelect.options].forEach((option) => {
      if (!option.value) return;
      const matches = !query || normalize(option.textContent).includes(query);
      option.hidden = !matches;
      option.disabled = !matches;
    });
    if (scheduleTutorSelect.selectedOptions[0]?.disabled)
      scheduleTutorSelect.value = "";
  };
  scheduleTutorSearch?.addEventListener("input", filterScheduleTutors);

  const selectedScheduleModes = () => {
    const recurrenceModes = scheduleRecurrenceDays
      .filter((input) => input.checked)
      .map((input) =>
        form?.querySelector(
          `[data-schedule-weekday-mode="${input.value}"]`,
        )?.value,
      )
      .filter(Boolean);
    return recurrenceModes.length ? recurrenceModes : [scheduleMode?.value];
  };

  const syncScheduleDayModes = () => {
    if (resourceKey !== "schedules") return;
    const selectedDays = new Set(
      scheduleRecurrenceDays.filter((input) => input.checked).map((input) => input.value),
    );
    scheduleWeekdayModeRows.forEach((row) => {
      const select = row.querySelector("[data-schedule-weekday-mode]");
      const isSelected = selectedDays.has(row.dataset.scheduleWeekdayModeRow);
      row.hidden = !isSelected;
      if (!select) return;
      select.disabled = !isSelected;
      if (!isSelected) {
        delete select.dataset.modeChosen;
      } else if (!select.dataset.modeChosen) {
        select.value = scheduleMode?.value || "online";
      }
    });
    const modes = form?.querySelector("[data-schedule-weekday-modes]");
    if (modes) modes.hidden = selectedDays.size === 0;
  };

  const syncScheduleRecurrence = () => {
    if (resourceKey !== "schedules" || !scheduleRecurrenceEnd) return;
    const isRecurring = scheduleRecurrenceDays.some((input) => input.checked);
    scheduleRecurrenceEnd.disabled = !isRecurring;
    scheduleRecurrenceEnd.required = isRecurring;
    scheduleRecurrenceEnd
      .closest(".schedule-recurrence-end")
      ?.classList.toggle("is-disabled", !isRecurring);
    // Keep the browser's date picker consistent with the server validator:
    // a recurring schedule may end on the start date or any later date, never
    // before it. This also prevents a confusing submit-and-reload cycle.
    if (scheduleSessionDate?.value) {
      scheduleRecurrenceEnd.min = scheduleSessionDate.value;
    } else {
      scheduleRecurrenceEnd.removeAttribute("min");
    }
    if (!isRecurring) scheduleRecurrenceEnd.value = "";
  };
  scheduleSessionDate?.addEventListener("change", syncScheduleRecurrence);
  scheduleRecurrenceDays.forEach((input) =>
    input.addEventListener("change", () => {
      syncScheduleDayModes();
      syncScheduleRecurrence();
      syncScheduleLocation();
    }),
  );
  scheduleWeekdayModes.forEach((input) =>
    input.addEventListener("change", () => {
      input.dataset.modeChosen = "true";
      syncScheduleLocation();
    }),
  );

  const syncScheduleLocation = () => {
    if (resourceKey !== "schedules" || !scheduleMode) return;
    const modes = selectedScheduleModes();
    const isOffline = modes.includes("offline");
    const isOnline = modes.includes("online");
    [provinceSelect, wardSelect, locationDetailInput].filter(Boolean).forEach((field) => {
      field.disabled = !isOffline;
      field.required = isOffline;
    });
    scheduleLocationFields.forEach((field) =>
      field.classList.toggle("is-disabled", !isOffline),
    );
    if (!isOffline) {
      if (provinceSelect) provinceSelect.value = "";
      if (wardSelect) wardSelect.value = "";
      if (locationDetailInput) locationDetailInput.value = "";
    }
    if (meetingUrlInput) {
      meetingUrlInput.disabled = !isOnline;
      meetingUrlInput.required = isOnline;
    }
    scheduleOnlineField?.classList.toggle("is-disabled", !isOnline);
    filterWards();
  };
  scheduleMode?.addEventListener("change", () => {
    syncScheduleDayModes();
    syncScheduleLocation();
  });

  const syncScheduleEditScope = (row) => {
    if (resourceKey !== "schedules" || !scheduleEditScopeField || !scheduleEditScope)
      return;
    const hasSeries = Boolean(row?.dataset.seriesId);
    scheduleEditScopeField.hidden = !hasSeries;
    scheduleEditScope.disabled = !hasSeries;
    if (!hasSeries) scheduleEditScope.value = "one";
    scheduleCreateOnly.forEach((field) => {
      field.hidden = Boolean(row);
    });
  };

  const syncScheduleStatusAuthority = (row, savedValues = {}) => {
    if (resourceKey !== "schedules" || !scheduleStatus) return;
    const tutorManaged =
      Boolean(row) &&
      Boolean(savedValues.status) &&
      savedValues.status !== "scheduled";
    const tutorOnlyOption = scheduleStatus.querySelector(
      '[data-schedule-tutor-confirmed]',
    );
    if (tutorManaged) {
      const option = tutorOnlyOption || document.createElement("option");
      const tutorStatusLabels = {
        completed: "Đã hoàn thành",
        cancelled: "Đã hủy",
        no_show: "Vắng mặt",
      };
      option.value = savedValues.status;
      option.textContent = `${tutorStatusLabels[savedValues.status] || savedValues.status} — gia sư cập nhật`;
      option.dataset.scheduleTutorConfirmed = "true";
      if (!tutorOnlyOption) scheduleStatus.appendChild(option);
      scheduleStatus.value = savedValues.status;
      scheduleStatus.disabled = true;
    } else {
      tutorOnlyOption?.remove();
      scheduleStatus.disabled = false;
    }
    if (scheduleStatusNote) scheduleStatusNote.hidden = !tutorManaged;
  };

  const filterTutorRequestCandidates = () => {
    if (
      resourceKey !== "tutor-requests" ||
      !tutorRequestSubject ||
      !tutorRequestTutor
    )
      return;
    const subjectId = tutorRequestSubject.value;
    [...tutorRequestTutor.options].forEach((option) => {
      if (!option.value) return;
      const subjectIds = (option.dataset.subjectIds || "").split(",");
      const matches = !subjectId || subjectIds.includes(subjectId);
      option.hidden = !matches;
      option.disabled = !matches;
    });
    if (tutorRequestTutor.selectedOptions[0]?.disabled)
      tutorRequestTutor.value = "";
  };
  tutorRequestSubject?.addEventListener("change", filterTutorRequestCandidates);

  const filterFeedbackStatusOptions = (row) => {
    if (resourceKey !== "reviews-complaints" || !feedbackStatus) return;
    const allowed = row?.dataset.role === "review"
      ? new Set(["visible", "hidden"])
      : new Set(["new", "processing", "resolved", "rejected"]);
    [...feedbackStatus.options].forEach((option) => {
      option.hidden = !allowed.has(option.value);
      option.disabled = !allowed.has(option.value);
    });
  };

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
    if (/inactive|rejected|cancelled|failed|blocked|locked|đã hủy|vắng mặt/.test(status))
      return "danger";
    if (
      /active|approved|completed|published|sent|paid|passed|resolved|matched|available|đã hoàn thành/.test(
        status,
      )
    )
      return "success";
    if (
      /pending|processing|scheduled|draft|review|screening|interview|đã lên lịch/.test(
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
    const canEdit =
      row.dataset.canEdit !== "false" &&
      (!isAdministrator || row.dataset.canEdit === "true");
    const canDelete =
      row.dataset.canDelete !== "false" &&
      (!isAdministrator || row.dataset.canDelete === "true");
    const actions = [];
    const editLabel = resourceKey === "reviews-complaints" ? "Xử lý" : "Chỉnh sửa";
    if (canEdit)
      actions.push(
        `<button type="button" data-resource-edit>${editLabel} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.5 15H7a4 4 0 0 0-4 4v2"></path><path d="m14.4 17.6 4-4a2 2 0 0 1 3 3l-4 4-4 1z"></path><circle cx="10" cy="7" r="4"></circle></svg></button>`,
      );
    if (canDelete)
      actions.push(
        '<button type="button" class="is-delete" data-resource-delete>Xóa <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>',
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
          : resourceKey === "students"
            ? "Cập nhật thông tin học viên"
          : resourceKey === "tutors"
            ? `${row ? "Cập nhật" : "Tạo"} hồ sơ gia sư`
            : resourceKey === "tutor-jobs"
              ? `${row ? "Cập nhật" : "Đăng"} tin tuyển dụng`
              : resourceKey === "notifications"
                ? `${row ? "Cập nhật" : "Tạo"} thông báo`
                : resourceKey === "subjects"
                  ? `${row ? "Cập nhật" : "Thêm"} môn học`
                    : resourceKey === "reviews-complaints"
                      ? "Xử lý đánh giá hoặc khiếu nại"
                  : resourceKey === "schedules"
                    ? `${row ? "Cập nhật" : "Tạo"} lịch học`
                    : resourceKey === "payments"
                      ? "Lập hóa đơn học phí"
                    : `${row ? "Edit" : "Add"} ${entity}`;
    if (row) {
      [...form.elements].forEach((field) => {
        if (!field.name || field.name === "record_id") return;
        if (field.type === "file") return;
        if (field.name === "availability_slots") {
          field.checked = Array.isArray(savedValues.availability_slots)
            && savedValues.availability_slots.includes(field.value);
          return;
        }
        const cell = row.querySelector(
          `[data-field="${CSS.escape(field.name)}"]`,
        );
        if (Object.prototype.hasOwnProperty.call(savedValues, field.name))
          field.value = savedValues[field.name];
        else if (cell)
          field.value = cell.dataset.value || cell.textContent.trim();
      });
    }
    if (!row) {
      form.querySelectorAll('input[name="availability_slots"]').forEach((field) => {
        field.checked = false;
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
    syncScheduleDayModes();
    syncScheduleRecurrence();
    syncScheduleLocation();
    syncScheduleEditScope(row);
    syncScheduleStatusAuthority(row, savedValues);
    filterTutorRequestCandidates();
    filterFeedbackStatusOptions(row);
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
    const isAccountCascade = resourceKey === "students" || resourceKey === "tutors";
    const warning = isAccountCascade
      ? "Tài khoản, hồ sơ và toàn bộ dữ liệu liên quan (lịch học, lớp, tin nhắn, thanh toán...) sẽ bị xóa vĩnh viễn."
      : "Bạn có chắc muốn xóa dữ liệu đã chọn?";
    overlay.innerHTML = `<div class="delete-dialog"><h2>&#9888; Xóa ${targets.length > 1 ? `${targets.length} mục đã chọn` : entity}</h2><p>${warning}<br>Thao tác này không thể hoàn tác.</p><aside><b>Lưu ý:</b><br>Hãy kiểm tra kỹ trước khi xóa.</aside><footer><button type="button">Hủy</button><button type="button">Xóa</button></footer></div>`;
    document.body.appendChild(overlay);
    const [cancel, remove] = overlay.querySelectorAll("footer button");
    cancel.addEventListener("click", () => overlay.remove());
    remove.addEventListener("click", async () => {
      const persistedTargets = targets.filter((row) => row.dataset.deleteUrl);
      if (persistedTargets.length !== targets.length) {
        overlay.remove();
        showResourceNotice("Mục đã chọn không hỗ trợ xóa trực tiếp.", true);
        return;
      }
      remove.disabled = true;
      const csrfToken =
        form?.querySelector('[name="csrfmiddlewaretoken"]')?.value ||
        decodeURIComponent(
          document.cookie
            .split("; ")
            .find((item) => item.startsWith("csrftoken="))
            ?.split("=")[1] || "",
        );
      const outcomes = [];
      const applyOutcome = ({ row, result }) => {
        if (result.deleted === false) {
          const statusCell = row.querySelector('[data-field="status"]');
          const status = result.status || "Inactive";
          if (statusCell) {
            statusCell.dataset.value = status;
            const statusButton = statusCell.querySelector(
              ".student-status-toggle",
            );
            if (statusButton) {
              statusButton.textContent = status;
              statusButton.className = `users-status users-status--${toneFor(status)} student-status-toggle`;
            }
          }
          row.dataset.statusCode = result.status_code || "inactive";
          row.querySelector('[data-resource-select]')?.click();
        } else {
          row.remove();
        }
      };
      let successMessage = "";
      try {
        for (const row of persistedTargets) {
          const response = await fetch(row.dataset.deleteUrl, {
            method: "POST",
            headers: {
              "X-CSRFToken": csrfToken,
              "X-Requested-With": "XMLHttpRequest",
              Accept: "application/json",
            },
            credentials: "same-origin",
          });
          const result = await response.json().catch(() => null);
          if (!response.ok || result?.ok !== true) {
            throw new Error(result?.message || "Không thể xóa dữ liệu.");
          }
          outcomes.push({ row, result });
          successMessage = result.message || successMessage;
        }
      } catch (error) {
        outcomes.forEach(applyOutcome);
        updateStatusCounts();
        render();
        overlay.remove();
        showResourceNotice(
          error instanceof Error ? error.message : "Không thể xóa dữ liệu.",
          true,
        );
        return;
      }
      outcomes.forEach(applyOutcome);
      updateStatusCounts();
      render();
      overlay.remove();
      showResourceNotice(successMessage || "Đã xóa dữ liệu.");
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
  let bulkDelete = document.querySelector("[data-resource-delete-selected]");
  if (
    !bulkDelete &&
    bulkBar &&
    [
      "tutor-candidates",
      "tutor-approvals",
      "tutor-interviews",
      "tutor-trials",
      "tutor-onboarding",
    ].includes(resourceKey)
  ) {
    const separator = document.createElement("i");
    bulkDelete = document.createElement("button");
    bulkDelete.type = "button";
    bulkDelete.className = "users-bulk-actions__delete";
    bulkDelete.dataset.resourceDeleteSelected = "";
    bulkDelete.setAttribute("aria-label", "Xóa mục đã chọn");
    bulkBar.append(separator, bulkDelete);
  }
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
    const subjectStatusButton = event.target.closest(
      "[data-subject-status-toggle]",
    );
    if (subjectStatusButton) {
      const row = subjectStatusButton.closest("tr[data-record-id]");
      if (!row?.dataset.statusToggleUrl) return;
      subjectStatusButton.disabled = true;
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
              result.message || "Không thể đổi trạng thái môn học.",
            );
          row.dataset.statusCode = String(result.status_code);
          const cell = subjectStatusButton.closest("td");
          cell.dataset.value = result.status;
          cell.title = result.status;
          subjectStatusButton.textContent = result.status;
          subjectStatusButton.className = `users-status users-status--${String(result.status_code) === "1" ? "success" : "danger"} subject-status-toggle`;
          subjectStatusButton.setAttribute(
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
          subjectStatusButton.disabled = false;
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
    const studentStatusButton = event.target.closest(
      "[data-student-status-toggle]",
    );
    if (studentStatusButton) {
      const row = studentStatusButton.closest("tr[data-record-id]");
      if (!row?.dataset.statusToggleUrl) return;
      studentStatusButton.disabled = true;
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
              result.message || "Không thể đổi trạng thái học viên.",
            );
          const statusCell = studentStatusButton.closest("td");
          statusCell.dataset.value = result.status;
          studentStatusButton.textContent = result.status;
          studentStatusButton.className = `users-status users-status--${result.status_code === "active" ? "success" : "neutral"} student-status-toggle`;
          studentStatusButton.setAttribute(
            "aria-label",
            `Đổi trạng thái ${result.status}`,
          );
          const formValues = JSON.parse(row.dataset.formValues || "{}");
          formValues.status = result.status_code;
          row.dataset.formValues = JSON.stringify(formValues);
          updateStatusCounts();
          showResourceNotice(result.message);
        })
        .catch((error) => showResourceNotice(error.message, true))
        .finally(() => {
          studentStatusButton.disabled = false;
        });
      return;
    }
    const tutorStatusButton = event.target.closest(
      "[data-tutor-status-toggle]",
    );
    if (tutorStatusButton) {
      const row = tutorStatusButton.closest("tr[data-record-id]");
      if (!row?.dataset.statusToggleUrl) return;
      tutorStatusButton.disabled = true;
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
              result.message || "Không thể đổi trạng thái gia sư.",
            );
          const statusCell = tutorStatusButton.closest("td");
          statusCell.dataset.value = result.status;
          tutorStatusButton.textContent = result.status;
          tutorStatusButton.className = `users-status users-status--${toneFor(result.status)} tutor-status-toggle`;
          tutorStatusButton.setAttribute(
            "aria-label",
            `Đổi trạng thái ${result.status}`,
          );
          const formValues = JSON.parse(row.dataset.formValues || "{}");
          formValues.status = result.status_code;
          row.dataset.formValues = JSON.stringify(formValues);
          updateStatusCounts();
          showResourceNotice(result.message);
        })
        .catch((error) => showResourceNotice(error.message, true))
        .finally(() => {
          tutorStatusButton.disabled = false;
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

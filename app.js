// --- State + storage helpers ------------------------------------

const STORAGE_KEY = "college_pal_state_v2";

const defaultState = {
  notes: [],
  tasks: [],
  plannerBlocks: [],
  databaseRows: [],
  profile: {
    name: "Student",
    tagline: "Grinding XP every semester.",
    major: "Undeclared",
    year: "1st",
    goal: "Stay consistent"
  },
  stats: {
    xp: 0,
    level: 1,
    sessions: 0,
    streakDays: 0,
    lastActiveDate: null,
    grind: 0,
    focus: 0,
    planning: 0,
    execution: 0,
    consistency: 0,
    recovery: 0,
    focusSessionsCompleted: 0
  },
  pomodoro: {
    mode: "focus", // "focus" | "break"
    remainingSeconds: 25 * 60,
    focusLength: 25,
    breakLength: 5,
    running: false
  }
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// global state
let state = loadState();
let currentView = "notes";

// --- DOM refs ---------------------------------------------------

const navButtons = document.querySelectorAll(".nav-item");
const viewTitle = document.getElementById("view-title");
const addBtn = document.getElementById("add-btn");
const globalSearch = document.getElementById("global-search");

// views
const notesList = document.getElementById("notes-list");
const notesEmpty = document.getElementById("notes-empty");
const tasksEmpty = document.getElementById("tasks-empty");
const plannerEmpty = document.getElementById("planner-empty");
const databaseEmpty = document.getElementById("database-empty");

const tasksToday = document.getElementById("tasks-today");
const tasksUpcoming = document.getElementById("tasks-upcoming");
const tasksDone = document.getElementById("tasks-done");

const plannerDateInput = document.getElementById("planner-date");
const plannerLabel = document.getElementById("planner-label");
const plannerItems = document.getElementById("planner-items");

const databaseRows = document.getElementById("database-rows");

// profile view
const profileInitials = document.getElementById("profile-initials");
const profileNameDisplay = document.getElementById("profile-name-display");
const profileTaglineDisplay = document.getElementById("profile-tagline-display");
const profileMajorDisplay = document.getElementById("profile-major-display");
const profileYearDisplay = document.getElementById("profile-year-display");
const profileGoalDisplay = document.getElementById("profile-goal-display");
const editProfileBtn = document.getElementById("edit-profile-btn");

const radarPolygon = document.getElementById("radar-polygon");
const profileLevelBadge = document.getElementById("profile-level-badge");
const xpBar = document.getElementById("xp-bar");
const xpLabel = document.getElementById("xp-label");
const sessionsLabel = document.getElementById("sessions-label");
const streakLabel = document.getElementById("streak-label");

// modal
const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalForm = document.getElementById("modal-form");
const modalClose = document.getElementById("modal-close");
const modalCancel = document.getElementById("modal-cancel");

// pomodoro
const pomodoroModeLabel = document.getElementById("pomodoro-mode-label");
const pomodoroTimeDisplay = document.getElementById("pomodoro-time-display");
const pomodoroStartBtn = document.getElementById("pomodoro-start");
const pomodoroPauseBtn = document.getElementById("pomodoro-pause");
const pomodoroResetBtn = document.getElementById("pomodoro-reset");
const pomodoroFocusInput = document.getElementById("pomodoro-focus-length");
const pomodoroBreakInput = document.getElementById("pomodoro-break-length");
const pomodoroAutoSwitch = document.getElementById("pomodoro-auto-switch");

let pomodoroInterval = null;

// --- View switching ---------------------------------------------

function setView(view) {
  currentView = view;

  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active-view", v.id === `view-${view}`);
  });

  const titles = {
    notes: "Notes",
    tasks: "Tasks",
    planner: "Planner",
    database: "Study Database",
    profile: "Profile"
  };

  viewTitle.textContent = titles[view] || "College Pal";
  render();
}

// --- Render helpers ---------------------------------------------

function renderNotes(filter = "") {
  const items = state.notes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((note) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q)
      );
    });

  notesList.innerHTML = "";
  if (!items.length) {
    notesEmpty.style.display = "block";
    return;
  }
  notesEmpty.style.display = "none";

  for (const note of items) {
    const card = document.createElement("article");
    card.className = "note-card";
    card.dataset.id = note.id;

    const title = document.createElement("div");
    title.className = "note-title";
    title.textContent = note.title || "Untitled";

    const body = document.createElement("div");
    body.className = "note-body-preview";
    body.textContent = note.body || "No content yet.";

    const meta = document.createElement("div");
    meta.className = "note-meta";
    const updated = new Date(note.updatedAt).toLocaleDateString();
    meta.textContent = `Updated ${updated}`;

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(meta);

    card.addEventListener("click", () => openNoteModal(note));
    notesList.appendChild(card);
  }
}

function renderTasks(filter = "") {
  const q = filter.toLowerCase();
  const tasks = state.tasks.filter((t) => {
    if (!filter) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.course && t.course.toLowerCase().includes(q))
    );
  });

  tasksToday.innerHTML = "";
  tasksUpcoming.innerHTML = "";
  tasksDone.innerHTML = "";

  tasksEmpty.style.display = tasks.length ? "none" : "block";

  const todayStr = todayISO();

  for (const task of tasks) {
    const cell = document.createElement("div");
    cell.className = "task-item";
    if (task.done) cell.classList.add("done");
    cell.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.className = "task-checkbox";
    checkbox.addEventListener("change", (e) => {
      task.done = e.target.checked;
      task.updatedAt = Date.now();
      saveState();
      renderTasks(globalSearch.value.trim());
      renderProfile(); // reflect execution gains via addProgress when created
    });

    const main = document.createElement("div");
    main.className = "task-main";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    const parts = [];
    if (task.course) parts.push(task.course);
    if (task.dueDate) parts.push(`due ${task.dueDate}`);
    meta.textContent = parts.join(" • ");

    main.appendChild(title);
    main.appendChild(meta);

    cell.appendChild(checkbox);
    cell.appendChild(main);

    cell.addEventListener("dblclick", () => openTaskModal(task));

    if (task.done) {
      tasksDone.appendChild(cell);
    } else if (task.dueDate && task.dueDate <= todayStr) {
      tasksToday.appendChild(cell);
    } else {
      tasksUpcoming.appendChild(cell);
    }
  }
}

function renderPlanner(filter = "") {
  const selectedDate = plannerDateInput.value || todayISO();
  const label = new Date(selectedDate).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
  plannerLabel.textContent = label;

  const blocks = state.plannerBlocks
    .filter((b) => b.date === selectedDate)
    .filter((b) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        (b.note && b.note.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  plannerItems.innerHTML = "";
  if (!blocks.length) {
    plannerEmpty.style.display = "block";
    return;
  }
  plannerEmpty.style.display = "none";

  for (const block of blocks) {
    const el = document.createElement("div");
    el.className = "planner-item";
    el.dataset.id = block.id;

    const time = document.createElement("div");
    time.className = "planner-time";
    time.textContent = block.time || "Anytime";

    const title = document.createElement("div");
    title.className = "planner-title";
    title.textContent = block.title;

    const note = document.createElement("div");
    note.style.fontSize = "0.75rem";
    note.style.color = "var(--text-dim)";
    note.textContent = block.note || "";

    el.appendChild(time);
    el.appendChild(title);
    if (block.note) el.appendChild(note);

    el.addEventListener("click", () => openPlannerModal(block));

    plannerItems.appendChild(el);
  }
}

function renderDatabase(filter = "") {
  const q = filter.toLowerCase();
  const rows = state.databaseRows.filter((row) => {
    if (!filter) return true;
    return (
      row.course.toLowerCase().includes(q) ||
      row.title.toLowerCase().includes(q) ||
      row.type.toLowerCase().includes(q)
    );
  });

  databaseRows.innerHTML = "";
  if (!rows.length) {
    databaseEmpty.style.display = "block";
    return;
  }
  databaseEmpty.style.display = "none";

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.dataset.id = row.id;

    tr.innerHTML = `
      <td>${row.course}</td>
      <td>${row.type}</td>
      <td>${row.title}</td>
      <td>${row.dueDate || "-"}</td>
      <td>
        <span class="badge ${statusBadgeClass(row.status)}">
          ${row.status}
        </span>
      </td>
    `;

    tr.addEventListener("click", () => openDatabaseModal(row));
    databaseRows.appendChild(tr);
  }
}

function statusBadgeClass(status) {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("complete")) return "badge-success";
  if (s.includes("urgent") || s.includes("late")) return "badge-danger";
  return "badge-warning";
}

// profile view
function renderProfile() {
  const p = state.profile;
  const s = state.stats;

  profileNameDisplay.textContent = p.name || "Student";
  profileTaglineDisplay.textContent =
    p.tagline || "Grinding XP every semester.";
  profileMajorDisplay.textContent = p.major || "Undeclared";
  profileYearDisplay.textContent = p.year || "1st";
  profileGoalDisplay.textContent = p.goal || "Stay consistent";

  const initials = (p.name || "CP")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  profileInitials.textContent = initials || "CP";

  const label =
    s.level >= 5
      ? `LV ${s.level} • Pro`
      : s.level >= 3
      ? `LV ${s.level} • Grinder`
      : `LV ${s.level} • Rookie`;
  profileLevelBadge.textContent = label;

  const xpInLevel = s.xp % 100;
  xpBar.style.width = `${Math.min(100, xpInLevel)}%`;
  xpLabel.textContent = `${xpInLevel} / 100`;

  sessionsLabel.textContent = String(s.sessions);
  streakLabel.textContent = `${s.streakDays} day${s.streakDays === 1 ? "" : "s"}`;

  renderRadarChart();
}

function renderRadarChart() {
  const s = state.stats;
  const centerX = 100;
  const centerY = 100;
  const maxRadius = 70;

  const values = [
    s.grind || 0,
    s.focus || 0,
    s.planning || 0,
    s.execution || 0,
    s.consistency || 0,
    s.recovery || 0
  ];

  const points = values.map((value, i) => {
    const ratio = Math.max(0, Math.min(1, value / 100));
    const angle = ((-90 + i * 60) * Math.PI) / 180;
    const r = maxRadius * ratio;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return `${x},${y}`;
  });

  radarPolygon.setAttribute("points", points.join(" "));
}

// pomodoro
function renderPomodoro() {
  const p = state.pomodoro;
  const mins = Math.floor(p.remainingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (p.remainingSeconds % 60).toString().padStart(2, "0");
  pomodoroTimeDisplay.textContent = `${mins}:${secs}`;

  pomodoroModeLabel.textContent =
    p.mode === "focus" ? "Focus" : "Break";
  pomodoroModeLabel.className =
    "badge " + (p.mode === "focus" ? "badge-warning" : "badge-success");

  pomodoroFocusInput.value = p.focusLength;
  pomodoroBreakInput.value = p.breakLength;
}

// master render
function render() {
  const filter = globalSearch.value.trim();

  if (currentView === "notes") renderNotes(filter);
  if (currentView === "tasks") renderTasks(filter);
  if (currentView === "planner") renderPlanner(filter);
  if (currentView === "database") renderDatabase(filter);
  if (currentView === "profile") renderProfile();

  renderPomodoro();
}

// --- Gamified progress ------------------------------------------

function addProgress(kind) {
  const s = state.stats;
  let xpGain = 3;

  switch (kind) {
    case "note":
      s.grind += 2;
      s.planning += 2;
      xpGain = 4;
      break;
    case "task":
      s.execution += 3;
      s.focus += 2;
      xpGain = 5;
      break;
    case "planner":
      s.planning += 4;
      s.consistency += 2;
      xpGain = 4;
      break;
    case "database":
      s.focus += 3;
      s.grind += 1;
      xpGain = 4;
      break;
    case "focusSession":
      s.grind += 4;
      s.focus += 4;
      s.execution += 3;
      s.consistency += 2;
      s.focusSessionsCompleted += 1;
      xpGain = 8;
      break;
  }

  s.grind = Math.min(100, s.grind);
  s.focus = Math.min(100, s.focus);
  s.planning = Math.min(100, s.planning);
  s.execution = Math.min(100, s.execution);
  s.consistency = Math.min(100, s.consistency);
  s.recovery = Math.min(100, s.recovery);

  const today = todayISO();
  if (s.lastActiveDate !== today) {
    s.sessions += 1;
    if (!s.lastActiveDate) {
      s.streakDays = 1;
    } else {
      const diff =
        (new Date(today) - new Date(s.lastActiveDate)) /
        (1000 * 60 * 60 * 24);
      if (diff === 1) {
        s.streakDays += 1;
      } else if (diff > 1) {
        s.streakDays = 1;
      }
    }
    s.lastActiveDate = today;
  }

  s.xp += xpGain;
  s.level = 1 + Math.floor(s.xp / 100);

  saveState();
}

// --- Modal logic ------------------------------------------------

function openModal(config) {
  modalTitle.textContent = config.title;
  modalForm.innerHTML = "";

  for (const field of config.fields) {
    const wrapper = document.createElement("div");

    const label = document.createElement("label");
    label.textContent = field.label;
    wrapper.appendChild(label);

    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
    } else if (field.type === "select") {
      input = document.createElement("select");
      for (const opt of field.options) {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        input.appendChild(o);
      }
    } else {
      input = document.createElement("input");
      input.type = field.type;
    }
    input.name = field.name;
    if (field.value != null) input.value = field.value;

    wrapper.appendChild(input);
    modalForm.appendChild(wrapper);
  }

  modalBackdrop.classList.remove("hidden");

  const submitHandler = (e) => {
    e.preventDefault();
    config.onSubmit(getFormData());
    modalForm.removeEventListener("submit", submitHandler);
  };

  modalForm.addEventListener("submit", submitHandler);
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
}

function getFormData() {
  const data = {};
  new FormData(modalForm).forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

// specific modals
function openNoteModal(note) {
  openModal({
    title: note ? "Edit Note" : "New Note",
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        value: note?.title || ""
      },
      {
        name: "body",
        label: "Body",
        type: "textarea",
        value: note?.body || ""
      }
    ],
    onSubmit: (values) => {
      if (note) {
        note.title = values.title;
        note.body = values.body;
        note.updatedAt = Date.now();
      } else {
        state.notes.push({
          id: crypto.randomUUID(),
          title: values.title || "Untitled",
          body: values.body || "",
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        addProgress("note");
      }
      saveState();
      closeModal();
      renderNotes(globalSearch.value.trim());
      renderProfile();
    }
  });
}

function openTaskModal(task) {
  openModal({
    title: task ? "Edit Task" : "New Task",
    fields: [
      {
        name: "title",
        label: "Task title",
        type: "text",
        value: task?.title || ""
      },
      {
        name: "course",
        label: "Course / context",
        type: "text",
        value: task?.course || ""
      },
      {
        name: "dueDate",
        label: "Due date",
        type: "date",
        value: task?.dueDate || ""
      }
    ],
    onSubmit: (values) => {
      if (task) {
        task.title = values.title;
        task.course = values.course;
        task.dueDate = values.dueDate;
        task.updatedAt = Date.now();
      } else {
        state.tasks.push({
          id: crypto.randomUUID(),
          title: values.title || "Task",
          course: values.course || "",
          dueDate: values.dueDate || "",
          done: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        addProgress("task");
      }
      saveState();
      closeModal();
      renderTasks(globalSearch.value.trim());
      renderProfile();
    }
  });
}

function openPlannerModal(block) {
  const date = plannerDateInput.value || todayISO();

  openModal({
    title: block ? "Edit Block" : "New Planner Block",
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        value: block?.title || ""
      },
      {
        name: "time",
        label: "Time (optional)",
        type: "time",
        value: block?.time || ""
      },
      {
        name: "note",
        label: "Details (optional)",
        type: "textarea",
        value: block?.note || ""
      }
    ],
    onSubmit: (values) => {
      if (block) {
        block.title = values.title;
        block.time = values.time;
        block.note = values.note;
        block.updatedAt = Date.now();
      } else {
        state.plannerBlocks.push({
          id: crypto.randomUUID(),
          date,
          title: values.title || "Block",
          time: values.time || "",
          note: values.note || "",
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        addProgress("planner");
      }
      saveState();
      closeModal();
      renderPlanner(globalSearch.value.trim());
      renderProfile();
    }
  });
}

function openDatabaseModal(row) {
  openModal({
    title: row ? "Edit Record" : "New Record",
    fields: [
      {
        name: "course",
        label: "Course",
        type: "text",
        value: row?.course || ""
      },
      {
        name: "type",
        label: "Type (Assignment, Exam, etc.)",
        type: "text",
        value: row?.type || ""
      },
      {
        name: "title",
        label: "Title",
        type: "text",
        value: row?.title || ""
      },
      {
        name: "dueDate",
        label: "Due date",
        type: "date",
        value: row?.dueDate || ""
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        value: row?.status || "Planned",
        options: ["Planned", "In progress", "Done", "Urgent"]
      }
    ],
    onSubmit: (values) => {
      if (row) {
        Object.assign(row, values);
        row.updatedAt = Date.now();
      } else {
        state.databaseRows.push({
          id: crypto.randomUUID(),
          course: values.course || "Course",
          type: values.type || "Assignment",
          title: values.title || "Title",
          dueDate: values.dueDate || "",
          status: values.status || "Planned",
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        addProgress("database");
      }
      saveState();
      closeModal();
      renderDatabase(globalSearch.value.trim());
      renderProfile();
    }
  });
}

function openProfileModal() {
  const p = state.profile;
  openModal({
    title: "Edit Profile",
    fields: [
      { name: "name", label: "Name", type: "text", value: p.name },
      { name: "tagline", label: "Tagline", type: "text", value: p.tagline },
      { name: "major", label: "Major", type: "text", value: p.major },
      { name: "year", label: "Year", type: "text", value: p.year },
      { name: "goal", label: "Main goal", type: "text", value: p.goal }
    ],
    onSubmit: (values) => {
      state.profile = { ...p, ...values };
      saveState();
      closeModal();
      renderProfile();
    }
  });
}

// --- Pomodoro logic ---------------------------------------------

function syncPomodoroFromState() {
  const p = state.pomodoro;
  p.focusLength = clampInt(p.focusLength, 1, 90) || 25;
  p.breakLength = clampInt(p.breakLength, 1, 60) || 5;
  pomodoroFocusInput.value = p.focusLength;
  pomodoroBreakInput.value = p.breakLength;

  if (!p.remainingSeconds) {
    p.remainingSeconds =
      (p.mode === "focus" ? p.focusLength : p.breakLength) * 60;
  }
  renderPomodoro();
}

function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function startPomodoro() {
  const p = state.pomodoro;
  if (p.running) return;
  p.running = true;
  saveState();

  pomodoroInterval = setInterval(() => {
    if (!state.pomodoro.running) return;
    state.pomodoro.remainingSeconds -= 1;
    if (state.pomodoro.remainingSeconds <= 0) {
      handlePomodoroComplete();
    }
    renderPomodoro();
    saveState();
  }, 1000);
}

function pausePomodoro() {
  state.pomodoro.running = false;
  clearInterval(pomodoroInterval);
  saveState();
}

function resetPomodoro() {
  const p = state.pomodoro;
  p.running = false;
  clearInterval(pomodoroInterval);
  p.remainingSeconds =
    (p.mode === "focus" ? p.focusLength : p.breakLength) * 60;
  saveState();
  renderPomodoro();
}

function handlePomodoroComplete() {
  const p = state.pomodoro;
  p.running = false;
  clearInterval(pomodoroInterval);

  if (p.mode === "focus") {
    addProgress("focusSession");
    renderProfile();
  }

  const auto = pomodoroAutoSwitch.checked;
  if (auto) {
    togglePomodoroMode();
    startPomodoro();
  } else {
    p.remainingSeconds =
      (p.mode === "focus" ? p.focusLength : p.breakLength) * 60;
  }
  saveState();
}

function togglePomodoroMode() {
  const p = state.pomodoro;
  p.mode = p.mode === "focus" ? "break" : "focus";
  p.remainingSeconds =
    (p.mode === "focus" ? p.focusLength : p.breakLength) * 60;
}

// --- Utils ------------------------------------------------------

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// --- Events -----------------------------------------------------

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

addBtn.addEventListener("click", () => {
  if (currentView === "notes") openNoteModal(null);
  if (currentView === "tasks") openTaskModal(null);
  if (currentView === "planner") openPlannerModal(null);
  if (currentView === "database") openDatabaseModal(null);
});

globalSearch.addEventListener("input", () => render());

plannerDateInput.addEventListener("change", () =>
  renderPlanner(globalSearch.value.trim())
);

modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// profile
editProfileBtn.addEventListener("click", openProfileModal);

// pomodoro events
pomodoroStartBtn.addEventListener("click", () => {
  startPomodoro();
});

pomodoroPauseBtn.addEventListener("click", () => {
  pausePomodoro();
});

pomodoroResetBtn.addEventListener("click", () => {
  resetPomodoro();
});

pomodoroFocusInput.addEventListener("change", () => {
  const p = state.pomodoro;
  p.focusLength = clampInt(pomodoroFocusInput.value, 1, 90);
  if (p.mode === "focus" && !p.running) {
    p.remainingSeconds = p.focusLength * 60;
  }
  saveState();
  renderPomodoro();
});

pomodoroBreakInput.addEventListener("change", () => {
  const p = state.pomodoro;
  p.breakLength = clampInt(pomodoroBreakInput.value, 1, 60);
  if (p.mode === "break" && !p.running) {
    p.remainingSeconds = p.breakLength * 60;
  }
  saveState();
  renderPomodoro();
});

// --- Init -------------------------------------------------------

if (!plannerDateInput.value) {
  plannerDateInput.value = todayISO();
}

syncPomodoroFromState();
render();

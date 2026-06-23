/* ============================================================
   My Budget — a private monthly budget tracker.
   Data is stored on the server (SQLite), scoped to the logged-in
   user, and synced across devices.
   ============================================================ */

/* ---------- Date helpers ---------- */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function monthKey(year, month) {
  // month is 0-indexed
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayKey() {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

/* Split a month into calendar weeks (Sun–Sat), keeping only the days
   that fall inside the month. Returns an array of weeks, where each week
   is an array of {day, dateKey, dow}. */
function getWeeksOfMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let current = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay(); // 0 = Sunday
    current.push({ day, dateKey: dateKey(year, month, day), dow });
    if (dow === 6 || day === daysInMonth) {
      weeks.push(current);
      current = [];
    }
  }
  return weeks;
}

/* ---------- State ---------- */
let state = { months: {} };

// View state (not persisted)
const now = new Date();
let viewYear = now.getFullYear();
let viewMonth = now.getMonth(); // 0-indexed
let activeWeekIndex = 0;

/* Fetch this user's data from the server. Redirects to login on 401. */
async function loadState() {
  const res = await fetch("/api/data");
  if (res.status === 401) {
    location.href = "/login.html";
    return { months: {} };
  }
  if (!res.ok) {
    console.warn("Could not load data:", res.status);
    return { months: {} };
  }
  return res.json();
}

/* Persist the whole state to the server, debounced so rapid changes
   (e.g. dragging a slider) collapse into a single request. */
let saveTimer = null;
let saveStatusEl = null;
function saveState() {
  if (saveStatusEl) saveStatusEl.textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (res.status === 401) { location.href = "/login.html"; return; }
      if (saveStatusEl) saveStatusEl.textContent = res.ok ? "Saved" : "Save failed";
    } catch (e) {
      if (saveStatusEl) saveStatusEl.textContent = "Offline — not saved";
    }
  }, 400);
}

/* Returns the data object for the currently viewed month, creating a
   sensible default if it does not exist yet. Defaults split the monthly
   budget evenly across weeks (by day count) and evenly across each
   week's days. */
function getMonthData() {
  const key = monthKey(viewYear, viewMonth);
  if (!state.months[key]) {
    state.months[key] = {
      monthlyTotal: 2000,
      weekBudgets: null, // array, lazily initialised
      dayBudgets: {},    // dateKey -> number
      spending: {},      // dateKey -> [ {amount, note, id} ]
    };
  }
  const data = state.months[key];
  ensureBudgets(data);
  return data;
}

/* Make sure week and day budgets exist and match the calendar shape. */
function ensureBudgets(data) {
  const weeks = getWeeksOfMonth(viewYear, viewMonth);
  const daysInMonth = weeks.reduce((n, w) => n + w.length, 0);

  // Weekly budgets: even split weighted by number of days in each week.
  if (!Array.isArray(data.weekBudgets) || data.weekBudgets.length !== weeks.length) {
    data.weekBudgets = weeks.map(w => round2(data.monthlyTotal * (w.length / daysInMonth)));
  }

  // Daily budgets: even split within each week.
  weeks.forEach((week, wi) => {
    const perDay = round2(data.weekBudgets[wi] / week.length);
    week.forEach(d => {
      if (typeof data.dayBudgets[d.dateKey] !== "number") {
        data.dayBudgets[d.dateKey] = perDay;
      }
    });
  });
}

/* ---------- Money helpers ---------- */
function round2(n) { return Math.round(n * 100) / 100; }

function formatMoney(n) {
  const neg = n < 0;
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (neg ? "-$" : "$") + abs;
}

/* Apply positive/negative styling and text to an element. */
function setMoney(el, n) {
  el.textContent = formatMoney(n);
  el.classList.toggle("negative", n < 0);
  el.classList.toggle("positive", n >= 0);
}

/* ---------- Spending math ---------- */
function spentOnDay(data, dk) {
  const entries = data.spending[dk] || [];
  return round2(entries.reduce((sum, e) => sum + e.amount, 0));
}

function spentInWeek(data, week) {
  return round2(week.reduce((sum, d) => sum + spentOnDay(data, d.dateKey), 0));
}

function spentInMonth(data) {
  return round2(Object.keys(data.spending)
    .reduce((sum, dk) => sum + spentOnDay(data, dk), 0));
}

/* ============================================================
   Rendering
   ============================================================ */
function render() {
  const data = getMonthData();
  const weeks = getWeeksOfMonth(viewYear, viewMonth);
  if (activeWeekIndex >= weeks.length) activeWeekIndex = 0;

  document.getElementById("monthTitle").textContent =
    `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  renderMonthSummary(data);
  renderWeekTabs(data, weeks);
  renderWeekSummary(data, weeks);
  renderDays(data, weeks);
  renderSettings(data, weeks);
}

function renderMonthSummary(data) {
  const budget = data.monthlyTotal;
  const spent = spentInMonth(data);
  const remaining = round2(budget - spent);

  setMoney(document.getElementById("monthRemaining"), remaining);
  document.getElementById("monthSpent").textContent = formatMoney(spent);
  document.getElementById("monthBudget").textContent = formatMoney(budget);
  updateBar("monthBar", spent, budget);
}

function renderWeekTabs(data, weeks) {
  const wrap = document.getElementById("weekTabs");
  wrap.innerHTML = "";
  weeks.forEach((week, i) => {
    const btn = document.createElement("button");
    btn.className = "week-tab" + (i === activeWeekIndex ? " active" : "");
    const first = week[0].day;
    const last = week[week.length - 1].day;
    btn.textContent = `Week ${i + 1} (${first}–${last})`;
    btn.addEventListener("click", () => { activeWeekIndex = i; render(); });
    wrap.appendChild(btn);
  });
}

function renderWeekSummary(data, weeks) {
  const week = weeks[activeWeekIndex];
  const budget = round2(data.weekBudgets[activeWeekIndex]);
  const spent = spentInWeek(data, week);
  const remaining = round2(budget - spent);

  document.getElementById("weekLabel").textContent = `Week ${activeWeekIndex + 1} remaining`;
  setMoney(document.getElementById("weekRemaining"), remaining);
  document.getElementById("weekSpent").textContent = formatMoney(spent);
  document.getElementById("weekBudget").textContent = formatMoney(budget);
  updateBar("weekBar", spent, budget);

  renderDailySliders(data, week);
}

function renderDailySliders(data, week) {
  const wrap = document.getElementById("dailySliders");
  wrap.innerHTML = "";
  week.forEach(d => {
    const dow = DAY_NAMES[d.dow];
    const value = data.dayBudgets[d.dateKey] || 0;
    const row = makeSlider(
      `${dow} ${d.day}`,
      value,
      Math.max(data.monthlyTotal, 100),
      (newVal) => {
        data.dayBudgets[d.dateKey] = newVal;
        saveState();
        // Re-render day cards + week summary amounts without rebuilding sliders.
        renderWeekSummaryAmounts(data, week);
        renderDays(data, getWeeksOfMonth(viewYear, viewMonth));
      }
    );
    wrap.appendChild(row);
  });
}

// Lightweight update of just the week summary numbers (used during slider drags).
function renderWeekSummaryAmounts(data, week) {
  const budget = round2(data.weekBudgets[activeWeekIndex]);
  const spent = spentInWeek(data, week);
  setMoney(document.getElementById("weekRemaining"), round2(budget - spent));
  document.getElementById("weekBudget").textContent = formatMoney(budget);
  updateBar("weekBar", spent, budget);
}

function renderDays(data, weeks) {
  const week = weeks[activeWeekIndex];
  const wrap = document.getElementById("days");
  wrap.innerHTML = "";
  const tk = todayKey();

  week.forEach(d => {
    const dayBudget = data.dayBudgets[d.dateKey] || 0;
    const spent = spentOnDay(data, d.dateKey);
    const remaining = round2(dayBudget - spent);

    const card = document.createElement("div");
    card.className = "day-card" + (d.dateKey === tk ? " today" : "");

    const head = document.createElement("div");
    head.className = "day-head";
    const remEl = document.createElement("span");
    remEl.className = "day-remaining";
    setMoney(remEl, remaining);
    head.innerHTML = `<span><span class="day-name">${DAY_NAMES[d.dow]}</span>` +
      `<span class="day-date">${MONTH_NAMES[viewMonth].slice(0, 3)} ${d.day}</span></span>`;
    head.appendChild(remEl);

    const row = document.createElement("div");
    row.className = "day-row";
    const input = document.createElement("input");
    input.type = "number";
    input.className = "day-spend-input";
    input.placeholder = "Amount spent";
    input.min = "0";
    input.step = "0.01";
    input.inputMode = "decimal";
    const addBtn = document.createElement("button");
    addBtn.className = "add-btn";
    addBtn.textContent = "Add";

    const addEntry = () => {
      const amount = parseFloat(input.value);
      if (!isNaN(amount) && amount !== 0) {
        if (!data.spending[d.dateKey]) data.spending[d.dateKey] = [];
        data.spending[d.dateKey].push({ amount: round2(amount), note: "", id: Date.now() });
        saveState();
        render();
      }
      input.value = "";
    };
    addBtn.addEventListener("click", addEntry);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") addEntry(); });

    row.appendChild(input);
    row.appendChild(addBtn);

    const meta = document.createElement("div");
    meta.className = "day-meta";
    meta.innerHTML = `<span>Spent: ${formatMoney(spent)}</span>` +
      `<span>Limit: ${formatMoney(dayBudget)}</span>`;

    card.appendChild(head);
    card.appendChild(row);
    card.appendChild(meta);

    // Entry list
    const entries = data.spending[d.dateKey] || [];
    if (entries.length) {
      const list = document.createElement("ul");
      list.className = "entries";
      entries.forEach(entry => {
        const li = document.createElement("li");
        li.className = "entry";
        const left = document.createElement("span");
        left.textContent = formatMoney(entry.amount);
        const del = document.createElement("button");
        del.className = "entry-del";
        del.textContent = "×";
        del.title = "Remove entry";
        del.addEventListener("click", () => {
          data.spending[d.dateKey] = entries.filter(e => e.id !== entry.id);
          if (!data.spending[d.dateKey].length) delete data.spending[d.dateKey];
          saveState();
          render();
        });
        li.appendChild(left);
        li.appendChild(del);
        list.appendChild(li);
      });
      card.appendChild(list);
    }

    wrap.appendChild(card);
  });
}

/* ---------- Settings drawer ---------- */
function renderSettings(data, weeks) {
  document.getElementById("monthlyTotal").value = data.monthlyTotal;

  const wrap = document.getElementById("weeklySliders");
  wrap.innerHTML = "";
  weeks.forEach((week, i) => {
    const first = week[0].day;
    const last = week[week.length - 1].day;
    const row = makeSlider(
      `Week ${i + 1} (${first}–${last})`,
      round2(data.weekBudgets[i]),
      Math.max(data.monthlyTotal, 100),
      (newVal) => {
        data.weekBudgets[i] = newVal;
        // Re-distribute this week's budget evenly across its days.
        const perDay = round2(newVal / week.length);
        week.forEach(d => { data.dayBudgets[d.dateKey] = perDay; });
        // Monthly total is the sum of the weekly allocations.
        data.monthlyTotal = round2(data.weekBudgets.reduce((sum, w) => sum + w, 0));
        saveState();
        render();
      }
    );
    wrap.appendChild(row);
  });
}

/* ---------- Reusable slider builder ---------- */
function makeSlider(label, value, max, onChange) {
  const row = document.createElement("div");
  row.className = "slider-row";

  const top = document.createElement("div");
  top.className = "slider-top";
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  const amountEl = document.createElement("span");
  amountEl.className = "slider-amount";
  amountEl.textContent = formatMoney(value);
  top.appendChild(labelEl);
  top.appendChild(amountEl);

  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = String(Math.ceil(max));
  input.step = "1";
  input.value = String(Math.min(value, max));

  input.addEventListener("input", () => {
    const v = round2(parseFloat(input.value));
    amountEl.textContent = formatMoney(v);
  });
  input.addEventListener("change", () => {
    onChange(round2(parseFloat(input.value)));
  });

  row.appendChild(top);
  row.appendChild(input);
  return row;
}

/* ---------- Progress bar ---------- */
function updateBar(id, spent, budget) {
  const el = document.getElementById(id);
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  el.style.width = pct + "%";
  const over = spent > budget;
  const warn = budget > 0 && spent / budget >= 0.8;
  el.style.background = over
    ? "var(--negative)"
    : warn ? "#f5c451" : "var(--positive)";
}

/* ============================================================
   Event wiring
   ============================================================ */
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");

function openDrawer() {
  drawer.classList.add("open");
  overlay.classList.remove("hidden");
}
function closeDrawer() {
  drawer.classList.remove("open");
  overlay.classList.add("hidden");
}

document.getElementById("menuBtn").addEventListener("click", openDrawer);
document.getElementById("closeDrawer").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);

document.getElementById("monthlyTotal").addEventListener("change", (e) => {
  const data = getMonthData();
  const val = round2(parseFloat(e.target.value));
  data.monthlyTotal = isNaN(val) ? 0 : Math.max(val, 0);
  // Re-derive week/day budgets from the new total (even split).
  data.weekBudgets = null;
  data.dayBudgets = {};
  ensureBudgets(data);
  saveState();
  render();
});

document.getElementById("resetWeekly").addEventListener("click", () => {
  const data = getMonthData();
  data.weekBudgets = null;
  data.dayBudgets = {};
  ensureBudgets(data);
  saveState();
  render();
});

document.getElementById("resetDaily").addEventListener("click", () => {
  const data = getMonthData();
  const weeks = getWeeksOfMonth(viewYear, viewMonth);
  const week = weeks[activeWeekIndex];
  const perDay = round2(data.weekBudgets[activeWeekIndex] / week.length);
  week.forEach(d => { data.dayBudgets[d.dateKey] = perDay; });
  saveState();
  render();
});

document.getElementById("clearMonth").addEventListener("click", () => {
  if (confirm("Clear all spending entries for this month? Budgets will be kept.")) {
    const data = getMonthData();
    data.spending = {};
    saveState();
    render();
  }
});

document.getElementById("prevMonth").addEventListener("click", () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  activeWeekIndex = 0;
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  activeWeekIndex = 0;
  render();
});

/* Log out button (in the settings drawer). */
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await fetch("/api/logout", { method: "POST" }); } catch (e) { /* ignore */ }
  location.href = "/login.html";
});

/* On load: jump to the week containing today, if we're viewing this month. */
function initActiveWeek() {
  const weeks = getWeeksOfMonth(viewYear, viewMonth);
  const tk = todayKey();
  weeks.forEach((week, i) => {
    if (week.some(d => d.dateKey === tk)) activeWeekIndex = i;
  });
}

/* ---------- Startup: confirm auth, load data, then render ---------- */
async function init() {
  saveStatusEl = document.getElementById("saveStatus");

  const meRes = await fetch("/api/me");
  if (!meRes.ok) { location.href = "/login.html"; return; }
  const me = await meRes.json();
  document.getElementById("usernameLabel").textContent = me.username;

  state = await loadState();
  initActiveWeek();
  render();
}

init();

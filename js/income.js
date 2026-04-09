let incomeTransactions = [];
let incomeConnected = false;
let incomeUnsubscribe = null;

const INCOME_PRESETS = [
  { service: "Aadhaar Update", amount: 50, profit: 50, expense: 0, category: "Government ID" },
  { service: "PAN Card", amount: 107, profit: 107, expense: 0, category: "Government ID" },
  { service: "Income Certificate", amount: 30, profit: 30, expense: 0, category: "eDistrict" },
  { service: "Community Certificate", amount: 30, profit: 30, expense: 0, category: "eDistrict" },
  { service: "Passport", amount: 200, profit: 200, expense: 0, category: "Government ID" },
  { service: "KSEB Bill", amount: 20, profit: 20, expense: 0, category: "Bill Payment" },
  { service: "Printout B&W", amount: 2, profit: 2, expense: 0, category: "Printing" },
  { service: "Photocopy", amount: 2, profit: 2, expense: 0, category: "Printing" },
  { service: "Lamination", amount: 10, profit: 10, expense: 0, category: "Printing" },
  { service: "Vehicle RC", amount: 150, profit: 150, expense: 0, category: "Parivahan" }
];

function initIncomeView() {
  renderIncomePresetChips();
  setIncomeFormDefaults();
  renderIncomeView();

  if (window.firebaseServices) {
    loadFromFirebase();
  } else {
    window.addEventListener("firebase-ready", loadFromFirebase, { once: true });
    window.addEventListener("firebase-missing-config", () => {
      renderIncomeSyncMeta("Firebase config missing");
      toast("Add your Firebase config to enable Daily Income", "warn");
    }, { once: true });
  }
}

function setIncomeFormDefaults() {
  const now = new Date();
  const dateInput = qs("#income-date");
  const timeInput = qs("#income-time");
  const categoryInput = qs("#income-category");
  const expenseInput = qs("#income-expense");
  if (dateInput && !dateInput.value) dateInput.value = toDateInputValue(now);
  if (timeInput && !timeInput.value) timeInput.value = toTimeInputValue(now);
  if (categoryInput && !categoryInput.value) categoryInput.value = "Government ID";
  if (expenseInput && !expenseInput.value) expenseInput.value = "0";
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatStorageDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseStorageDate(dateString) {
  if (!dateString) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split("/").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTransactionDateTime(item) {
  const date = parseStorageDate(item.date) || new Date();
  const [hours, minutes] = String(item.time || "00:00").split(":").map(part => parseInt(part, 10) || 0);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function sortIncomeTransactions(a, b) {
  return parseTransactionDateTime(b).getTime() - parseTransactionDateTime(a).getTime();
}

function normalizeIncomeTransaction(item) {
  const amount = Number(item.amount) || 0;
  const profit = item.profit === undefined || item.profit === null || item.profit === ""
    ? amount
    : Number(item.profit);
  const expense = item.expense === undefined || item.expense === null || item.expense === ""
    ? 0
    : Number(item.expense);
  const date = parseStorageDate(item.date) || new Date();
  const time = /^\d{2}:\d{2}$/.test(String(item.time || "")) ? item.time : toTimeInputValue(date);

  return {
    id: String(item.id || createSyntheticIncomeId(item)),
    date: formatStorageDate(date),
    time,
    service: String(item.service || "").trim(),
    category: String(item.category || "Other").trim() || "Other",
    amount,
    profit: Number.isNaN(profit) ? amount : profit,
    expense: Number.isNaN(expense) ? 0 : expense,
    note: String(item.note || "").trim(),
    _firebaseKey: item._firebaseKey || ""
  };
}

function createSyntheticIncomeId(item) {
  return [
    item.date || "",
    item.time || "",
    item.service || "",
    item.category || "",
    Number(item.amount) || 0
  ].join("|");
}

function formatInr(amount) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(amount) % 1 ? 2 : 0
  }).format(Number(amount) || 0);
}

function renderIncomePresetChips() {
  const wrap = qs("#income-preset-chips");
  if (!wrap) return;
  wrap.innerHTML = INCOME_PRESETS.map((preset, index) => (
    `<button class="btn btn-ghost btn-sm" onclick="applyIncomePreset(${index})">${escapeIncomeHtml(preset.service)} ₹${formatInr(preset.amount)}</button>`
  )).join("");
}

function applyIncomePreset(index) {
  const preset = INCOME_PRESETS[index];
  if (!preset) return;
  qs("#income-service").value = preset.service;
  qs("#income-amount").value = preset.amount;
  qs("#income-profit").value = preset.profit;
  qs("#income-expense").value = preset.expense;
  qs("#income-category").value = preset.category;
  qs("#income-service")?.focus();
}

function getIncomeRangeFilter() {
  return qs("#income-range-filter")?.value || "today";
}

function getTransactionsForRange(range) {
  const now = new Date();
  const todayKey = formatStorageDate(now);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return incomeTransactions.filter(item => {
    const date = parseStorageDate(item.date);
    if (!date) return false;
    if (range === "today") return item.date === todayKey;
    if (range === "month") return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    if (range === "year") return date.getFullYear() === currentYear;
    return true;
  });
}

function summariseTransactions(items) {
  return items.reduce((summary, item) => {
    summary.amount += Number(item.amount) || 0;
    summary.profit += Number(item.profit) || 0;
    summary.expense += Number(item.expense) || 0;
    summary.count += 1;
    return summary;
  }, { amount: 0, profit: 0, expense: 0, count: 0 });
}

function renderIncomeView() {
  renderIncomeStats();
  renderIncomeTable();
  if (incomeConnected) renderIncomeSyncMeta("Live from Firebase");
}

function renderIncomeStats() {
  const now = new Date();
  const todaySummary = summariseTransactions(getTransactionsForRange("today"));
  const monthSummary = summariseTransactions(getTransactionsForRange("month"));
  const yearSummary = summariseTransactions(getTransactionsForRange("year"));
  const allSummary = summariseTransactions(getTransactionsForRange("all"));

  setText("#income-stat-received", `₹${formatInr(todaySummary.amount)}`);
  setText("#income-stat-profit", `₹${formatInr(todaySummary.profit)}`);
  setText("#income-stat-expense", `₹${formatInr(todaySummary.expense)}`);
  setText("#income-stat-net", `₹${formatInr(todaySummary.profit - todaySummary.expense)}`);
  setText("#income-stat-month-profit", `₹${formatInr(monthSummary.profit)}`);
  setText("#income-stat-month-net", `₹${formatInr(monthSummary.profit - monthSummary.expense)}`);
  setText("#income-stat-year-profit", `₹${formatInr(yearSummary.profit)}`);
  setText("#income-stat-all-profit", `₹${formatInr(allSummary.profit)}`);
  setText("#income-stat-month-meta", now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
  setText("#income-stat-year-meta", String(now.getFullYear()));
  setText("#income-stat-pending", `${allSummary.count} transactions`);
}

function renderIncomeTable() {
  const tbody = qs("#income-tbody");
  if (!tbody) return;
  const rows = getTransactionsForRange(getIncomeRangeFilter()).sort(sortIncomeTransactions);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-row">No transactions found for this period</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(item => `
    <tr>
      <td>${escapeIncomeHtml(item.date)}</td>
      <td>${escapeIncomeHtml(item.time)}</td>
      <td style="font-weight:600">${escapeIncomeHtml(item.service)}</td>
      <td><span class="income-category-pill ${incomeCategoryClass(item.category)}">${escapeIncomeHtml(item.category)}</span></td>
      <td style="font-family:var(--mono);font-weight:700">₹${formatInr(item.amount)}</td>
      <td style="font-family:var(--mono);font-weight:700">₹${formatInr(item.profit)}</td>
      <td style="font-family:var(--mono);font-weight:700">₹${formatInr(item.expense)}</td>
      <td><span class="income-status-ok">Live</span></td>
      <td><button class="mini-icon-btn" onclick="deleteIncomeTransaction('${escapeJs(item._firebaseKey)}')">Delete</button></td>
    </tr>
  `).join("");
}

function renderIncomeSyncMeta(message) {
  const el = qs("#income-sync-meta");
  if (el) el.textContent = `· ${message}`;
}

function incomeCategoryClass(category) {
  if (category === "eDistrict") return "income-category-edistrict";
  if (category === "Bill Payment") return "income-category-bill";
  if (category === "Printing") return "income-category-printing";
  if (category === "Other") return "income-category-other";
  return "";
}

async function addIncomeTransaction() {
  const service = qs("#income-service").value.trim();
  const amount = Number(qs("#income-amount").value);
  const profitRaw = qs("#income-profit").value.trim();
  const expenseRaw = qs("#income-expense").value.trim();
  const category = qs("#income-category").value;
  const note = qs("#income-note").value.trim();
  const dateInput = qs("#income-date").value;
  const timeInput = qs("#income-time").value || "00:00";

  if (!service) {
    toast("Enter a service description", "warn");
    qs("#income-service").focus();
    return;
  }
  if (!amount || amount <= 0) {
    toast("Enter a valid amount", "warn");
    qs("#income-amount").focus();
    return;
  }
  if (!dateInput) {
    toast("Select the transaction date", "warn");
    qs("#income-date").focus();
    return;
  }

  const profit = profitRaw === "" ? amount : Number(profitRaw);
  const expense = expenseRaw === "" ? 0 : Number(expenseRaw);

  if (Number.isNaN(profit) || profit < 0) {
    toast("Enter a valid profit", "warn");
    qs("#income-profit").focus();
    return;
  }
  if (Number.isNaN(expense) || expense < 0) {
    toast("Enter a valid expense", "warn");
    qs("#income-expense").focus();
    return;
  }

  const date = formatStorageDate(parseStorageDate(dateInput));
  const transaction = normalizeIncomeTransaction({
    id: String(Date.now()),
    date,
    time: timeInput,
    service,
    category,
    amount,
    profit,
    expense,
    note
  });

  try {
    await saveToFirebase(transaction);
    clearIncomeForm();
    toast("Transaction saved", "ok");
  } catch (error) {
    toast(`Firebase save failed: ${error.message}`, "err");
  }
}

function clearIncomeForm() {
  qs("#income-service").value = "";
  qs("#income-amount").value = "";
  qs("#income-profit").value = "";
  qs("#income-expense").value = "0";
  qs("#income-category").value = "Government ID";
  qs("#income-note").value = "";
  setIncomeFormDefaults();
}

async function saveToFirebase(transaction) {
  const services = getFirebaseServices();
  const incomeRef = services.ref(services.db, "income");
  await services.push(incomeRef, {
    id: transaction.id,
    date: transaction.date,
    time: transaction.time,
    service: transaction.service,
    category: transaction.category,
    amount: transaction.amount,
    profit: transaction.profit,
    expense: transaction.expense,
    note: transaction.note
  });
}

function loadFromFirebase() {
  const services = getFirebaseServices();
  const incomeRef = services.ref(services.db, "income");
  if (typeof incomeUnsubscribe === "function") {
    incomeUnsubscribe();
    incomeUnsubscribe = null;
  }

  incomeUnsubscribe = services.onValue(incomeRef, snapshot => {
    const data = snapshot.val();
    if (!data) {
      incomeTransactions = [];
    } else {
      incomeTransactions = Object.entries(data)
        .map(([key, value]) => normalizeIncomeTransaction({ ...value, _firebaseKey: key }))
        .sort(sortIncomeTransactions);
    }

    incomeConnected = true;
    renderIncomeView();
  }, error => {
    incomeConnected = false;
    renderIncomeSyncMeta("Firebase connection error");
    toast(`Firebase load failed: ${error.message}`, "err");
  });
}

async function deleteIncomeTransaction(firebaseKey) {
  if (!firebaseKey) return;
  const services = getFirebaseServices();
  try {
    await services.remove(services.ref(services.db, `income/${firebaseKey}`));
    toast("Transaction deleted", "info");
  } catch (error) {
    toast(`Delete failed: ${error.message}`, "err");
  }
}

function refreshIncomeData() {
  renderIncomeSyncMeta("Refreshing Firebase data...");
  loadFromFirebase();
}

function getFirebaseServices() {
  if (!window.firebaseServices) {
    throw new Error("Firebase is not initialized");
  }
  return window.firebaseServices;
}

function escapeIncomeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setText(selector, value) {
  const el = qs(selector);
  
  if (el) el.textContent = value;
}

document.addEventListener("DOMContentLoaded", initIncomeView);

const SHEETS_URL = "https://script.google.com/macros/s/AKfycbwU_jm94mUJS8Sx6K_KLkVPQZ7qBl_GiiWSnWVOuuWWstUVTiT3_ESeHmX4-3r9TDeMcQ/exec";
const INCOME_STORAGE_KEY = "csc_income";

let incomeTransactions = [];

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
  loadIncomeState();
  renderIncomePresetChips();
  renderIncomeView();
  retryPendingIncomeTransactions();
}

function loadIncomeState() {
  try {
    incomeTransactions = (JSON.parse(localStorage.getItem(INCOME_STORAGE_KEY)) || []).map(normalizeIncomeTransaction);
  } catch {
    incomeTransactions = [];
  }
}

function saveIncomeState() {
  localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(incomeTransactions));
}

function getNowParts() {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB");
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return { now, date, time };
}

function getTodayIncomeTransactions() {
  const { date } = getNowParts();
  return incomeTransactions
    .filter(item => item.date === date)
    .sort((a, b) => Number(b.id) - Number(a.id));
}

function formatInr(amount) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(amount) % 1 ? 2 : 0
  }).format(Number(amount) || 0);
}

function renderIncomeView() {
  renderIncomeStats();
  renderIncomeTable();
  renderIncomeSyncMeta();
}

function renderIncomeStats() {
  const { date } = getNowParts();
  let totalReceived = 0;
  let totalProfit = 0;
  let totalExpense = 0;

  incomeTransactions.forEach(item => {
    if (item.date !== date) return;
    totalReceived += Number(item.amount) || 0;
    totalProfit += Number(item.profit) || 0;
    totalExpense += Number(item.expense) || 0;
  });

  const receivedEl = qs("#income-stat-received");
  const profitEl = qs("#income-stat-profit");
  const expenseEl = qs("#income-stat-expense");
  const netEl = qs("#income-stat-net");
  if (receivedEl) receivedEl.textContent = `₹${formatInr(totalReceived)}`;
  if (profitEl) profitEl.textContent = `₹${formatInr(totalProfit)}`;
  if (expenseEl) expenseEl.textContent = `₹${formatInr(totalExpense)}`;
  if (netEl) netEl.textContent = `₹${formatInr(totalProfit - totalExpense)}`;
}

function renderIncomePresetChips() {
  const wrap = qs("#income-preset-chips");
  if (!wrap) return;
  wrap.innerHTML = INCOME_PRESETS.map((preset, index) => (
    `<button class="btn btn-ghost btn-sm" onclick="applyIncomePreset(${index})">${preset.service} ₹${preset.amount}</button>`
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
}

async function addIncomeTransaction() {
  const service = qs("#income-service").value.trim();
  const amount = Number(qs("#income-amount").value);
  const profitRaw = qs("#income-profit").value.trim();
  const expenseRaw = qs("#income-expense").value.trim();
  const category = qs("#income-category").value;
  const note = qs("#income-note").value.trim();

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

  const { date, time } = getNowParts();
  const transaction = normalizeIncomeTransaction({
    id: String(Date.now()),
    date,
    time,
    service,
    category,
    amount,
    profit,
    expense,
    note,
    synced: false
  });

  incomeTransactions.unshift(transaction);
  saveIncomeState();
  renderIncomeView();
  clearIncomeForm();

  const synced = await syncIncomeTransaction(transaction);
  transaction.synced = synced;
  saveIncomeState();
  renderIncomeView();
  toast(synced ? "Transaction added and synced" : "Saved locally. Sync pending.", synced ? "ok" : "warn");
}

function clearIncomeForm() {
  qs("#income-service").value = "";
  qs("#income-amount").value = "";
  qs("#income-profit").value = "";
  qs("#income-expense").value = "0";
  qs("#income-category").value = "Government ID";
  qs("#income-note").value = "";
}

async function syncIncomeTransaction(transaction) {
  if (!SHEETS_URL || SHEETS_URL === "PASTE_YOUR_WEB_APP_URL_HERE") return false;
  try {
    const response = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: transaction.date,
        time: transaction.time,
        service: transaction.service,
        category: transaction.category,
        amount: transaction.amount,
        profit: transaction.profit,
        expense: transaction.expense,
        note: transaction.note
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function retryPendingIncomeTransactions() {
  const pending = incomeTransactions.filter(item => !item.synced);
  if (!pending.length) {
    renderIncomeSyncMeta();
    return;
  }

  let syncedCount = 0;
  for (const item of pending) {
    const ok = await syncIncomeTransaction(item);
    if (ok) {
      item.synced = true;
      syncedCount += 1;
    }
  }
  saveIncomeState();
  renderIncomeView();
  if (syncedCount) toast(`${syncedCount} pending transaction(s) synced`, "ok");
}

function retryOneIncomeTransaction(id) {
  const item = incomeTransactions.find(entry => entry.id === id);
  if (!item) return;
  syncIncomeTransaction(item).then(ok => {
    item.synced = ok;
    saveIncomeState();
    renderIncomeView();
    toast(ok ? "Transaction synced" : "Still pending", ok ? "ok" : "warn");
  });
}

function deleteIncomeTransaction(id) {
  incomeTransactions = incomeTransactions.filter(item => item.id !== id);
  saveIncomeState();
  renderIncomeView();
  toast("Transaction deleted locally", "info");
}

function renderIncomeTable() {
  const tbody = qs("#income-tbody");
  if (!tbody) return;
  const rows = getTodayIncomeTransactions();
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No transactions added today</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(item => `
    <tr>
      <td>${item.time}</td>
      <td style="font-weight:600">${escapeIncomeHtml(item.service)}</td>
      <td><span class="income-category-pill ${incomeCategoryClass(item.category)}">${escapeIncomeHtml(item.category)}</span></td>
      <td style="font-family:var(--mono);font-weight:700">₹${formatInr(item.amount)}</td>
      <td style="font-family:var(--mono);font-weight:700">₹${formatInr(item.profit)}</td>
      <td style="font-family:var(--mono);font-weight:700">₹${formatInr(item.expense)}</td>
      <td>
        ${item.synced
          ? '<span class="income-status-ok">✓ synced</span>'
          : `<span class="income-status-pending">⟳ pending</span> <button class="mini-icon-btn" onclick="retryOneIncomeTransaction('${item.id}')">Retry</button>`}
      </td>
      <td><button class="mini-icon-btn" onclick="deleteIncomeTransaction('${item.id}')">Delete</button></td>
    </tr>
  `).join("");
}

function incomeCategoryClass(category) {
  if (category === "eDistrict") return "income-category-edistrict";
  if (category === "Bill Payment") return "income-category-bill";
  if (category === "Printing") return "income-category-printing";
  if (category === "Other") return "income-category-other";
  return "";
}

function renderIncomeSyncMeta() {
  const el = qs("#income-sync-meta");
  if (!el) return;
  const pending = incomeTransactions.filter(item => !item.synced).length;
  if (!incomeTransactions.length) {
    el.textContent = "· ready to sync";
    return;
  }
  if (pending) {
    el.textContent = `· ${pending} pending sync`;
    return;
  }
  el.textContent = "· all transactions synced";
}

function normalizeIncomeTransaction(item) {
  const amount = Number(item.amount) || 0;
  const profit = item.profit === undefined || item.profit === null || item.profit === ""
    ? amount
    : Number(item.profit);
  const expense = item.expense === undefined || item.expense === null || item.expense === ""
    ? 0
    : Number(item.expense);

  return {
    ...item,
    amount,
    profit: Number.isNaN(profit) ? amount : profit,
    expense: Number.isNaN(expense) ? 0 : expense,
    note: item.note || "",
    synced: !!item.synced
  };
}

function escapeIncomeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

document.addEventListener("DOMContentLoaded", initIncomeView);

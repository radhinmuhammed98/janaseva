let incomeTransactions = [];
let incomeConnected = false;
let incomeUnsubscribe = null;
let incomeResizeBound = false;
let incomeAnalyticsOpen = false;

const RUPEE = "\u20B9";
const MIDDLE_DOT = "\u00B7";
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
  bindIncomeEvents();
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

function bindIncomeEvents() {
  if (incomeResizeBound) return;
  incomeResizeBound = true;
  window.addEventListener("resize", debounceIncomeRender);
}

function debounceIncomeRender() {
  clearTimeout(window.__incomeResizeTimer);
  window.__incomeResizeTimer = setTimeout(() => {
    if (qs("#view-income.active") && incomeAnalyticsOpen) renderIncomeCharts();
  }, 120);
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatStorageDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
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
  const profit = item.profit === undefined || item.profit === null || item.profit === "" ? amount : Number(item.profit);
  const expense = item.expense === undefined || item.expense === null || item.expense === "" ? 0 : Number(item.expense);
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
  return [item.date || "", item.time || "", item.service || "", item.category || "", Number(item.amount) || 0].join("|");
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
    `<button class="btn btn-ghost btn-sm" onclick="applyIncomePreset(${index})">${escapeIncomeHtml(preset.service)} ${RUPEE}${formatInr(preset.amount)}</button>`
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
  renderIncomeAnalyticsPanel();
  renderIncomeTable();
  if (incomeConnected) renderIncomeSyncMeta("Live from Firebase");
}

function toggleIncomeAnalytics(forceState) {
  incomeAnalyticsOpen = typeof forceState === "boolean" ? forceState : !incomeAnalyticsOpen;
  renderIncomeAnalyticsPanel();
}

function renderIncomeAnalyticsPanel() {
  const panel = qs("#income-analytics-panel");
  if (!panel) return;
  panel.classList.toggle("hidden", !incomeAnalyticsOpen);
  if (!incomeAnalyticsOpen) return;
  renderIncomeCharts();
  renderIncomeBreakdowns();
}

function renderIncomeStats() {
  const now = new Date();
  const todaySummary = summariseTransactions(getTransactionsForRange("today"));
  const monthSummary = summariseTransactions(getTransactionsForRange("month"));
  const yearSummary = summariseTransactions(getTransactionsForRange("year"));
  const allSummary = summariseTransactions(getTransactionsForRange("all"));

  setText("#income-stat-received", `${RUPEE}${formatInr(todaySummary.amount)}`);
  setText("#income-stat-profit", `${RUPEE}${formatInr(todaySummary.profit)}`);
  setText("#income-stat-expense", `${RUPEE}${formatInr(todaySummary.expense)}`);
  setText("#income-stat-net", `${RUPEE}${formatInr(todaySummary.profit - todaySummary.expense)}`);
  setText("#income-stat-month-profit", `${RUPEE}${formatInr(monthSummary.profit)}`);
  setText("#income-stat-month-net", `${RUPEE}${formatInr(monthSummary.profit - monthSummary.expense)}`);
  setText("#income-stat-year-profit", `${RUPEE}${formatInr(yearSummary.profit)}`);
  setText("#income-stat-all-profit", `${RUPEE}${formatInr(allSummary.profit)}`);
  setText("#income-stat-month-meta", now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
  setText("#income-stat-year-meta", String(now.getFullYear()));
  setText("#income-stat-pending", `${allSummary.count} records`);
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
      <td style="font-family:var(--mono);font-weight:700">${RUPEE}${formatInr(item.amount)}</td>
      <td style="font-family:var(--mono);font-weight:700">${RUPEE}${formatInr(item.profit)}</td>
      <td style="font-family:var(--mono);font-weight:700">${RUPEE}${formatInr(item.expense)}</td>
      <td><span class="income-status-ok">Live</span></td>
      <td><button class="mini-icon-btn" onclick="deleteIncomeTransaction('${escapeJs(item._firebaseKey)}')">Delete</button></td>
    </tr>
  `).join("");
}

function renderIncomeCharts() {
  drawIncomeTrendChart(qs("#income-trend-chart"), getRecentDailySeries(7));
  drawIncomeMonthlyChart(qs("#income-monthly-chart"), getMonthlySeries(6));
}

function renderIncomeBreakdowns() {
  renderIncomeCategoryBreakdown();
  renderIncomeHighlights();
}

function renderIncomeCategoryBreakdown() {
  const wrap = qs("#income-category-breakdown");
  if (!wrap) return;
  const items = getCategoryBreakdown(getIncomeRangeFilter());
  if (!items.length) {
    wrap.innerHTML = '<div class="service-empty">No category activity for this period yet.</div>';
    return;
  }
  const maxValue = Math.max(...items.map(item => item.profit), 1);
  wrap.innerHTML = items.map(item => `
    <div class="income-breakdown-row">
      <div class="income-breakdown-label">${escapeIncomeHtml(item.category)}</div>
      <div class="income-breakdown-track">
        <div class="income-breakdown-fill" style="width:${Math.max(8, Math.round((item.profit / maxValue) * 100))}%;background:${item.color}"></div>
      </div>
      <div class="income-breakdown-value">${RUPEE}${formatInr(item.profit)}</div>
    </div>
  `).join("");
}

function renderIncomeHighlights() {
  const wrap = qs("#income-highlights-grid");
  if (!wrap) return;
  const allRows = incomeTransactions.slice().sort(sortIncomeTransactions);
  if (!allRows.length) {
    wrap.innerHTML = '<div class="service-empty">Add transactions to see highlights.</div>';
    return;
  }
  const topService = getTopServiceByProfit();
  const bestDay = getBestDayByProfit();
  const monthSummary = summariseTransactions(getTransactionsForRange("month"));
  const yearSummary = summariseTransactions(getTransactionsForRange("year"));

  wrap.innerHTML = [
    makeHighlightCard("Top Service", topService?.label || "-", topService ? `${RUPEE}${formatInr(topService.profit)} profit` : "No data yet"),
    makeHighlightCard("Best Day", bestDay?.label || "-", bestDay ? `${RUPEE}${formatInr(bestDay.profit)} profit` : "No data yet"),
    makeHighlightCard("Month Received", `${RUPEE}${formatInr(monthSummary.amount)}`, `${monthSummary.count} transaction(s)`),
    makeHighlightCard("Year Expenses", `${RUPEE}${formatInr(yearSummary.expense)}`, `${new Date().getFullYear()} total`)
  ].join("");
}

function makeHighlightCard(label, value, subtitle) {
  return `
    <div class="income-highlight">
      <div class="income-highlight-label">${escapeIncomeHtml(label)}</div>
      <div class="income-highlight-value">${escapeIncomeHtml(value)}</div>
      <div class="income-highlight-sub">${escapeIncomeHtml(subtitle)}</div>
    </div>
  `;
}

function getTopServiceByProfit() {
  const totals = new Map();
  incomeTransactions.forEach(item => {
    const key = item.service || "Untitled";
    totals.set(key, (totals.get(key) || 0) + (Number(item.profit) || 0));
  });
  const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? { label: best[0], profit: best[1] } : null;
}

function getBestDayByProfit() {
  const totals = new Map();
  incomeTransactions.forEach(item => {
    totals.set(item.date, (totals.get(item.date) || 0) + (Number(item.profit) || 0));
  });
  const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? { label: best[0], profit: best[1] } : null;
}

function getRecentDailySeries(days) {
  const buckets = [];
  const today = new Date();
  for (let index = days - 1; index >= 0; index--) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    const key = formatStorageDate(day);
    const summary = summariseTransactions(incomeTransactions.filter(item => item.date === key));
    buckets.push({
      label: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      amount: summary.amount,
      profit: summary.profit,
      net: summary.profit - summary.expense
    });
  }
  return buckets;
}

function getMonthlySeries(months) {
  const now = new Date();
  const buckets = [];
  for (let index = months - 1; index >= 0; index--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const rows = incomeTransactions.filter(item => {
      const date = parseStorageDate(item.date);
      return date && date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
    });
    const summary = summariseTransactions(rows);
    buckets.push({
      label: monthDate.toLocaleDateString("en-IN", { month: "short" }),
      profit: summary.profit,
      expense: summary.expense
    });
  }
  return buckets;
}

function getCategoryBreakdown(range) {
  const colorMap = {
    "Government ID": "#60a5fa",
    "eDistrict": "#4ade80",
    "Ration Card": "#f97316",
    "Parivahan": "#fbbf24",
    "Taxes": "#38bdf8",
    "Bill Payment": "#fb923c",
    "Printing": "#c084fc",
    Other: "#94a3b8"
  };
  const totals = new Map();
  getTransactionsForRange(range).forEach(item => {
    const key = item.category || "Other";
    totals.set(key, (totals.get(key) || 0) + (Number(item.profit) || 0));
  });
  return [...totals.entries()]
    .map(([category, profit]) => ({ category, profit, color: colorMap[category] || "#94a3b8" }))
    .sort((a, b) => b.profit - a.profit);
}

function prepareCanvas(canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(280, Math.floor(rect.width || canvas.parentElement.clientWidth || 320));
  const height = Math.max(220, Math.floor(rect.height || canvas.parentElement.clientHeight || 240));
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

function drawIncomeTrendChart(canvas, rows) {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  ctx.clearRect(0, 0, width, height);
  drawChartBackground(ctx, width, height);

  const left = 42;
  const right = width - 16;
  const top = 16;
  const bottom = height - 34;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const maxValue = Math.max(...rows.flatMap(row => [row.amount, row.profit, row.net]), 1);

  drawYAxisGrid(ctx, left, right, top, bottom, maxValue);
  drawLineSeries(ctx, rows.map(row => row.amount), left, top, chartWidth, chartHeight, maxValue, "#60a5fa");
  drawLineSeries(ctx, rows.map(row => row.profit), left, top, chartWidth, chartHeight, maxValue, "#4ade80");
  drawLineSeries(ctx, rows.map(row => row.net), left, top, chartWidth, chartHeight, maxValue, "#fbbf24");
  drawXAxisLabels(ctx, rows.map(row => row.label), left, bottom, chartWidth, "#7a8fa6");
}

function drawIncomeMonthlyChart(canvas, rows) {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  ctx.clearRect(0, 0, width, height);
  drawChartBackground(ctx, width, height);

  const left = 40;
  const right = width - 12;
  const top = 16;
  const bottom = height - 34;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const maxValue = Math.max(...rows.flatMap(row => [row.profit, row.expense]), 1);

  drawYAxisGrid(ctx, left, right, top, bottom, maxValue);
  const groupWidth = chartWidth / Math.max(rows.length, 1);
  const barWidth = Math.min(18, groupWidth * 0.28);

  rows.forEach((row, index) => {
    const center = left + groupWidth * index + groupWidth / 2;
    const profitHeight = (row.profit / maxValue) * chartHeight;
    const expenseHeight = (row.expense / maxValue) * chartHeight;
    drawBar(ctx, center - barWidth - 2, bottom - profitHeight, barWidth, profitHeight, "#4ade80");
    drawBar(ctx, center + 2, bottom - expenseHeight, barWidth, expenseHeight, "#fb923c");
    ctx.fillStyle = "#7a8fa6";
    ctx.font = "11px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(row.label, center, height - 12);
  });
}

function drawChartBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255,255,255,0.03)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawYAxisGrid(ctx, left, right, top, bottom, maxValue) {
  ctx.strokeStyle = "rgba(122,143,166,0.18)";
  ctx.fillStyle = "#7a8fa6";
  ctx.font = "11px Segoe UI";
  ctx.textAlign = "right";
  for (let step = 0; step <= 4; step++) {
    const y = top + ((bottom - top) / 4) * step;
    const value = maxValue - (maxValue / 4) * step;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillText(`${RUPEE}${formatInr(value)}`, left - 8, y + 4);
  }
}

function drawLineSeries(ctx, values, left, top, chartWidth, chartHeight, maxValue, color) {
  if (!values.length) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = left + (chartWidth / Math.max(values.length - 1, 1)) * index;
    const y = top + chartHeight - ((value / maxValue) * chartHeight);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  values.forEach((value, index) => {
    const x = left + (chartWidth / Math.max(values.length - 1, 1)) * index;
    const y = top + chartHeight - ((value / maxValue) * chartHeight);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawXAxisLabels(ctx, labels, left, baseline, chartWidth, color) {
  ctx.fillStyle = color;
  ctx.font = "11px Segoe UI";
  ctx.textAlign = "center";
  labels.forEach((label, index) => {
    const x = left + (chartWidth / Math.max(labels.length - 1, 1)) * index;
    ctx.fillText(label, x, baseline + 18);
  });
}

function drawBar(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

async function exportIncomeExcel() {
  if (!incomeTransactions.length) {
    toast("No income data to export", "warn");
    return;
  }
  try {
    if (!window.XLSX) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    }
    const workbook = XLSX.utils.book_new();
    const rows = incomeTransactions.slice().sort(sortIncomeTransactions).map(item => ({
      Date: item.date,
      Time: item.time,
      Service: item.service,
      Category: item.category,
      Amount: Number(item.amount) || 0,
      Profit: Number(item.profit) || 0,
      Expense: Number(item.expense) || 0,
      Net: (Number(item.profit) || 0) - (Number(item.expense) || 0),
      Note: item.note || ""
    }));
    const summaryRows = buildIncomeSummaryRows();
    const monthlyRows = buildMonthlyExportRows();
    const dailyRows = buildDailyExportRows();
    const categoryRows = getCategoryBreakdown("all").map(item => ({ Category: item.category, Profit: Number(item.profit) || 0 }));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Transactions");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyRows), "Monthly Report");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyRows), "Daily Report");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryRows), "Categories");
    XLSX.writeFile(workbook, `csc-income-${toDateInputValue(new Date())}.xlsx`);
    toast("Excel export ready", "ok");
  } catch (error) {
    toast(`Excel export failed: ${error.message}`, "err");
  }
}

function buildIncomeSummaryRows() {
  const today = summariseTransactions(getTransactionsForRange("today"));
  const month = summariseTransactions(getTransactionsForRange("month"));
  const year = summariseTransactions(getTransactionsForRange("year"));
  const all = summariseTransactions(getTransactionsForRange("all"));
  return [
    { Metric: "Total Received Today", Value: today.amount },
    { Metric: "Profit Today", Value: today.profit },
    { Metric: "Expenses Today", Value: today.expense },
    { Metric: "Net Today", Value: today.profit - today.expense },
    { Metric: "Profit This Month", Value: month.profit },
    { Metric: "Net This Month", Value: month.profit - month.expense },
    { Metric: "Profit This Year", Value: year.profit },
    { Metric: "Total Profit", Value: all.profit }
  ];
}

function buildMonthlyExportRows() {
  const byMonth = new Map();
  incomeTransactions.forEach(item => {
    const date = parseStorageDate(item.date);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(key)) {
      byMonth.set(key, { Month: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), Received: 0, Profit: 0, Expense: 0, Net: 0, Transactions: 0 });
    }
    const row = byMonth.get(key);
    row.Received += Number(item.amount) || 0;
    row.Profit += Number(item.profit) || 0;
    row.Expense += Number(item.expense) || 0;
    row.Net = row.Profit - row.Expense;
    row.Transactions += 1;
  });
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);
}

function buildDailyExportRows() {
  const byDay = new Map();
  incomeTransactions.forEach(item => {
    const key = item.date;
    if (!byDay.has(key)) {
      byDay.set(key, { Date: key, Received: 0, Profit: 0, Expense: 0, Net: 0, Transactions: 0 });
    }
    const row = byDay.get(key);
    row.Received += Number(item.amount) || 0;
    row.Profit += Number(item.profit) || 0;
    row.Expense += Number(item.expense) || 0;
    row.Net = row.Profit - row.Expense;
    row.Transactions += 1;
  });
  return [...byDay.entries()]
    .sort((a, b) => parseStorageDate(a[0]) - parseStorageDate(b[0]))
    .map(([, value]) => value);
}

function renderIncomeSyncMeta(message) {
  const el = qs("#income-sync-meta");
  if (el) el.textContent = `${MIDDLE_DOT} ${message}`;
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

  const transaction = normalizeIncomeTransaction({
    id: String(Date.now()),
    date: formatStorageDate(parseStorageDate(dateInput)),
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
  await services.push(services.ref(services.db, "income"), {
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
    incomeTransactions = data
      ? Object.entries(data).map(([key, value]) => normalizeIncomeTransaction({ ...value, _firebaseKey: key })).sort(sortIncomeTransactions)
      : [];
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
  if (!window.firebaseServices) throw new Error("Firebase is not initialized");
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

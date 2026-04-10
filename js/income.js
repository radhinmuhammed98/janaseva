let incomeTransactions = [];
let incomeConnected = false;
let incomeUnsubscribe = null;

const RUPEE = "\u20B9";
const MIDDLE_DOT = "\u00B7";

function initIncomeView() {
  setModalDefaults();
  renderIncomeView();
  bindIncomeEvents();

  if (window.firebaseServices) {
    loadFromFirebase();
  } else {
    window.addEventListener("firebase-ready", loadFromFirebase, { once: true });
    window.addEventListener("firebase-missing-config", () => {
      renderIncomeSyncMeta("Firebase config missing");
      toast("Add your Firebase config to enable income tracking", "warn");
    }, { once: true });
  }
}

function renderIncomeView() {
  renderIncomeSummary();
  renderIncomeTable();
}

function bindIncomeEvents() {
  const start = qs("#report-start");
  const end = qs("#report-end");
  if (start) start.addEventListener("change", renderReports);
  if (end) end.addEventListener("change", renderReports);
  window.addEventListener("resize", () => {
    if (qs("#reports-ov.on")) renderReportsCharts();
    if (qs("#view-analytics.active")) renderAnalyticsView();
  });
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

function formatInr(amount) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(amount) % 1 ? 2 : 0
  }).format(Number(amount) || 0);
}

function normalizeEntry(item) {
  const amount = Number(item.amount) || 0;
  const type = item.type === "expense" ? "expense" : "income";
  const profit = type === "expense"
    ? 0
    : (item.profit === undefined || item.profit === null || item.profit === "" ? amount : Number(item.profit));
  const expense = type === "expense"
    ? (item.expense === undefined || item.expense === null || item.expense === "" ? amount : Number(item.expense))
    : 0;
  const date = parseStorageDate(item.date) || new Date();
  const time = /^\d{2}:\d{2}$/.test(String(item.time || "")) ? item.time : toTimeInputValue(date);

  return {
    id: String(item.id || `${item.date || ""}|${item.name || ""}|${item.amount || 0}`),
    type,
    date: formatStorageDate(date),
    time,
    name: String(item.name || item.service || "").trim(),
    category: String(item.category || (type === "expense" ? "Misc" : "Other")).trim() || "Other",
    amount,
    profit: Number.isNaN(profit) ? amount : profit,
    expense: Number.isNaN(expense) ? (type === "expense" ? amount : 0) : expense,
    note: String(item.note || "").trim(),
    _firebaseKey: item._firebaseKey || ""
  };
}

function setModalDefaults() {
  const now = new Date();
  const incomeDate = qs("#income-modal-date");
  const expenseDate = qs("#expense-modal-date");
  if (incomeDate && !incomeDate.value) incomeDate.value = toDateInputValue(now);
  if (expenseDate && !expenseDate.value) expenseDate.value = toDateInputValue(now);
}

function openIncomeModal() {
  setModalDefaults();
  showOv("income-ov");
}

function openExpenseModal() {
  setModalDefaults();
  showOv("expense-ov");
}

function saveIncomeModal() {
  const name = qs("#income-modal-name").value.trim();
  const amount = Number(qs("#income-modal-amount").value);
  const profitRaw = qs("#income-modal-profit").value.trim();
  const category = qs("#income-modal-category").value;
  const dateInput = qs("#income-modal-date").value;
  const note = qs("#income-modal-note").value.trim();
  if (!name) return toast("Enter a service name", "warn");
  if (!amount || amount <= 0) return toast("Enter a valid amount", "warn");
  if (!dateInput) return toast("Select a date", "warn");
  const profit = profitRaw === "" ? amount : Number(profitRaw);
  if (Number.isNaN(profit) || profit < 0) return toast("Enter a valid profit", "warn");

  const entry = normalizeEntry({
    id: String(Date.now()),
    type: "income",
    date: formatStorageDate(parseStorageDate(dateInput)),
    time: toTimeInputValue(new Date()),
    name,
    category,
    amount,
    profit,
    expense: 0,
    note
  });
  saveEntry(entry);
}

function saveExpenseModal() {
  const name = qs("#expense-modal-name").value.trim();
  const amount = Number(qs("#expense-modal-amount").value);
  const category = qs("#expense-modal-category").value;
  const dateInput = qs("#expense-modal-date").value;
  const note = qs("#expense-modal-note").value.trim();
  if (!name) return toast("Enter an expense name", "warn");
  if (!amount || amount <= 0) return toast("Enter a valid amount", "warn");
  if (!dateInput) return toast("Select a date", "warn");

  const entry = normalizeEntry({
    id: String(Date.now()),
    type: "expense",
    date: formatStorageDate(parseStorageDate(dateInput)),
    time: toTimeInputValue(new Date()),
    name,
    category,
    amount,
    profit: 0,
    expense: amount,
    note
  });
  saveEntry(entry);
}

async function saveEntry(entry) {
  try {
    await saveToFirebase(entry);
    closeOv("income-ov");
    closeOv("expense-ov");
    clearIncomeModals();
    toast("Entry saved", "ok");
  } catch (error) {
    toast(`Firebase save failed: ${error.message}`, "err");
  }
}

function clearIncomeModals() {
  ["#income-modal-name", "#income-modal-amount", "#income-modal-profit", "#income-modal-note",
    "#expense-modal-name", "#expense-modal-amount", "#expense-modal-note"].forEach(id => {
    const el = qs(id);
    if (el) el.value = "";
  });
  setModalDefaults();
}

function openReportsPanel() {
  setReportDefaults();
  showOv("reports-ov");
  renderReports();
}

function setReportDefaults() {
  const range = qs("#report-range");
  const start = qs("#report-start");
  const end = qs("#report-end");
  const now = new Date();
  if (range && !range.value) range.value = "month";
  if (start && !start.value) start.value = toDateInputValue(now);
  if (end && !end.value) end.value = toDateInputValue(now);
}

function renderReports() {
  renderReportSummary();
  renderReportsCharts();
  renderReportBreakdowns();
}

function renderReportSummary() {
  const rows = getReportFilteredRows();
  const summary = summariseRows(rows);
  setText("#report-total-income", `${RUPEE}${formatInr(summary.income)}`);
  setText("#report-total-expense", `${RUPEE}${formatInr(summary.expense)}`);
  setText("#report-net-profit", `${RUPEE}${formatInr(summary.net)}`);
  setText("#report-count", String(summary.count));
}

function renderReportsCharts() {
  const rows = getReportFilteredRows();
  const daily = groupByDay(rows);
  drawIncomeExpenseChart(qs("#report-income-expense"), daily);
  drawNetTrendChart(qs("#report-net-trend"), daily);
}

function renderReportBreakdowns() {
  const rows = getReportFilteredRows();
  renderReportList("#report-daily-totals", groupByDay(rows));
  renderReportList("#report-monthly-totals", groupByMonth(rows));
}

function renderReportList(selector, rows) {
  const wrap = qs(selector);
  if (!wrap) return;
  if (!rows.length) {
    wrap.innerHTML = '<div class="service-empty">No data for this range.</div>';
    return;
  }
  const maxValue = Math.max(...rows.map(row => row.net), 1);
  wrap.innerHTML = rows.map(row => `
    <div class="income-breakdown-row">
      <div class="income-breakdown-label">${escapeHtml(row.label)}</div>
      <div class="income-breakdown-track">
        <div class="income-breakdown-fill" style="width:${Math.max(8, Math.round((row.net / maxValue) * 100))}%;background:#4ade80"></div>
      </div>
      <div class="income-breakdown-value">${RUPEE}${formatInr(row.net)}</div>
    </div>
  `).join("");
}

function renderIncomeSummary() {
  const today = summariseRows(getRowsForPeriod("today"));
  const month = summariseRows(getRowsForPeriod("month"));
  setText("#sum-net-today", `${RUPEE}${formatInr(today.net)}`);
  setText("#sum-income-today", `${RUPEE}${formatInr(today.income)}`);
  setText("#sum-expense-today", `${RUPEE}${formatInr(today.expense)}`);
  setText("#sum-net-month", `${RUPEE}${formatInr(month.net)}`);
  setText("#sum-net-month-meta", new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
}

function renderIncomeTable() {
  const tbody = qs("#income-tbody");
  if (!tbody) return;
  const rows = applyTableFilters(incomeTransactions.slice().sort(sortIncomeTransactions));
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No transactions found</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(item => `
    <tr>
      <td>${escapeHtml(item.date)}</td>
      <td>${item.type === "expense" ? "Expense" : "Income"}</td>
      <td style="font-weight:600">${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td style="font-family:var(--mono);font-weight:700">${RUPEE}${formatInr(item.amount)}</td>
      <td style="font-family:var(--mono);font-weight:700">${item.type === "expense" ? "-" : `${RUPEE}${formatInr(item.profit)}`}</td>
      <td style="font-family:var(--mono);font-weight:700">${RUPEE}${formatInr(item.profit - item.expense)}</td>
      <td><button class="mini-icon-btn" onclick="deleteIncomeTransaction('${escapeJs(item._firebaseKey)}')">Delete</button></td>
    </tr>
  `).join("");
  renderIncomeSummary();
}

function applyTableFilters(rows) {
  const timeFilter = qs("#income-time-filter")?.value || "all";
  const typeFilter = qs("#income-type-filter")?.value || "all";
  const byPeriod = rows.filter(item => inPeriod(item, timeFilter));
  if (typeFilter === "all") return byPeriod;
  return byPeriod.filter(item => item.type === typeFilter);
}

function inPeriod(item, range) {
  if (range === "all") return true;
  const date = parseStorageDate(item.date);
  if (!date) return false;
  const now = new Date();
  if (range === "today") return formatStorageDate(date) === formatStorageDate(now);
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return date >= start && date <= end;
  }
  if (range === "year") return date.getFullYear() === now.getFullYear();
  if (range === "month") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  return true;
}

function getRowsForPeriod(range) {
  return incomeTransactions.filter(item => inPeriod(item, range));
}

function getReportFilteredRows() {
  const range = qs("#report-range")?.value || "month";
  if (range !== "custom") return getRowsForPeriod(range);
  const start = parseStorageDate(qs("#report-start")?.value);
  const end = parseStorageDate(qs("#report-end")?.value);
  if (!start || !end) return [];
  return incomeTransactions.filter(item => {
    const date = parseStorageDate(item.date);
    return date && date >= start && date <= end;
  });
}

function summariseRows(rows) {
  return rows.reduce((summary, item) => {
    if (item.type === "expense") summary.expense += Number(item.expense) || 0;
    else summary.income += Number(item.amount) || 0;
    summary.net += (Number(item.profit) || 0) - (Number(item.expense) || 0);
    summary.count += 1;
    return summary;
  }, { income: 0, expense: 0, net: 0, count: 0 });
}

function groupByDay(rows) {
  const map = new Map();
  rows.forEach(item => {
    const key = item.date;
    if (!map.has(key)) map.set(key, { label: key, income: 0, expense: 0, net: 0 });
    const row = map.get(key);
    if (item.type === "expense") row.expense += Number(item.expense) || 0;
    else row.income += Number(item.amount) || 0;
    row.net = row.income - row.expense;
  });
  return [...map.values()].sort((a, b) => parseStorageDate(a.label) - parseStorageDate(b.label));
}

function groupByMonth(rows) {
  const map = new Map();
  rows.forEach(item => {
    const date = parseStorageDate(item.date);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { label: date.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), income: 0, expense: 0, net: 0 });
    const row = map.get(key);
    if (item.type === "expense") row.expense += Number(item.expense) || 0;
    else row.income += Number(item.amount) || 0;
    row.net = row.income - row.expense;
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => value);
}

function renderAnalyticsView() {
  const monthly = groupByMonth(incomeTransactions);
  drawSimpleLine(qs("#analytics-income-trend"), monthly.map(row => row.income), monthly.map(row => row.label), "#60a5fa");
  drawSimpleBar(qs("#analytics-expense-trend"), monthly.map(row => row.expense), monthly.map(row => row.label), "#fb923c");
  renderAnalyticsLists();
}

function renderAnalyticsLists() {
  const monthlyWrap = qs("#analytics-monthly-summary");
  const expenseWrap = qs("#analytics-expense-breakdown");
  const monthly = groupByMonth(incomeTransactions);
  if (monthlyWrap) {
    const maxValue = Math.max(...monthly.map(row => row.net), 1);
    monthlyWrap.innerHTML = monthly.map(row => `
      <div class="income-breakdown-row">
        <div class="income-breakdown-label">${escapeHtml(row.label)}</div>
        <div class="income-breakdown-track">
          <div class="income-breakdown-fill" style="width:${Math.max(8, Math.round((row.net / maxValue) * 100))}%;background:#4ade80"></div>
        </div>
        <div class="income-breakdown-value">${RUPEE}${formatInr(row.net)}</div>
      </div>
    `).join("") || '<div class="service-empty">No monthly data yet.</div>';
  }
  if (expenseWrap) {
    const expenseMap = new Map();
    incomeTransactions.filter(row => row.type === "expense").forEach(row => {
      expenseMap.set(row.category, (expenseMap.get(row.category) || 0) + (Number(row.expense) || 0));
    });
    const items = [...expenseMap.entries()].map(([category, value]) => ({ category, value }));
    const maxValue = Math.max(...items.map(item => item.value), 1);
    expenseWrap.innerHTML = items.map(item => `
      <div class="income-breakdown-row">
        <div class="income-breakdown-label">${escapeHtml(item.category)}</div>
        <div class="income-breakdown-track">
          <div class="income-breakdown-fill" style="width:${Math.max(8, Math.round((item.value / maxValue) * 100))}%;background:#fb923c"></div>
        </div>
        <div class="income-breakdown-value">${RUPEE}${formatInr(item.value)}</div>
      </div>
    `).join("") || '<div class="service-empty">No expense data yet.</div>';
  }
}

function drawIncomeExpenseChart(canvas, rows) {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const left = 42;
  const right = width - 16;
  const top = 16;
  const bottom = height - 34;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const maxValue = Math.max(...rows.flatMap(row => [row.income, row.expense]), 1);
  drawChartBackground(ctx, width, height);
  drawYAxisGrid(ctx, left, right, top, bottom, maxValue);
  drawLineSeries(ctx, rows.map(row => row.income), left, top, chartWidth, chartHeight, maxValue, "#4ade80");
  drawLineSeries(ctx, rows.map(row => row.expense), left, top, chartWidth, chartHeight, maxValue, "#fb923c");
  drawXAxisLabels(ctx, rows.map(row => row.label), left, bottom, chartWidth, "#7a8fa6");
}

function drawNetTrendChart(canvas, rows) {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const left = 42;
  const right = width - 16;
  const top = 16;
  const bottom = height - 34;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const maxValue = Math.max(...rows.map(row => row.net), 1);
  drawChartBackground(ctx, width, height);
  drawYAxisGrid(ctx, left, right, top, bottom, maxValue);
  drawLineSeries(ctx, rows.map(row => row.net), left, top, chartWidth, chartHeight, maxValue, "#60a5fa");
  drawXAxisLabels(ctx, rows.map(row => row.label), left, bottom, chartWidth, "#7a8fa6");
}

function drawSimpleLine(canvas, values, labels, color) {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const left = 42;
  const right = width - 16;
  const top = 16;
  const bottom = height - 34;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const maxValue = Math.max(...values, 1);
  drawChartBackground(ctx, width, height);
  drawYAxisGrid(ctx, left, right, top, bottom, maxValue);
  drawLineSeries(ctx, values, left, top, chartWidth, chartHeight, maxValue, color);
  drawXAxisLabels(ctx, labels, left, bottom, chartWidth, "#7a8fa6");
}

function drawSimpleBar(canvas, values, labels, color) {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const left = 40;
  const right = width - 12;
  const top = 16;
  const bottom = height - 34;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const maxValue = Math.max(...values, 1);
  drawChartBackground(ctx, width, height);
  drawYAxisGrid(ctx, left, right, top, bottom, maxValue);
  const groupWidth = chartWidth / Math.max(values.length, 1);
  const barWidth = Math.min(20, groupWidth * 0.5);
  values.forEach((value, index) => {
    const x = left + groupWidth * index + (groupWidth - barWidth) / 2;
    const heightValue = (value / maxValue) * chartHeight;
    drawBar(ctx, x, bottom - heightValue, barWidth, heightValue, color);
    ctx.fillStyle = "#7a8fa6";
    ctx.font = "11px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(labels[index], x + barWidth / 2, height - 12);
  });
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
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
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

async function exportIncomeCsv() {
  const rows = applyTableFilters(incomeTransactions.slice().sort(sortIncomeTransactions));
  if (!rows.length) {
    toast("No data to export", "warn");
    return;
  }
  const header = ["Date", "Time", "Type", "Name", "Category", "Amount", "Profit", "Expense", "Net", "Note"];
  const lines = [header.join(",")];
  rows.forEach(item => {
    const net = (Number(item.profit) || 0) - (Number(item.expense) || 0);
    lines.push([
      item.date,
      item.time,
      item.type,
      escapeCsv(item.name),
      escapeCsv(item.category),
      item.amount,
      item.profit,
      item.expense,
      net,
      escapeCsv(item.note || "")
    ].join(","));
  });
  const summary = buildExportSummary();
  lines.push("", "SUMMARY,,,,,,,,");
  summary.forEach(row => lines.push([row.label, "", "", "", "", row.income, row.profit, row.expense, row.net, ""].join(",")));
  downloadCsv(lines.join("\n"), `csc-income-${toDateInputValue(new Date())}.csv`);
  toast("CSV exported", "ok");
}

function buildExportSummary() {
  const today = summariseRows(getRowsForPeriod("today"));
  const month = summariseRows(getRowsForPeriod("month"));
  const year = summariseRows(getRowsForPeriod("year"));
  const all = summariseRows(getRowsForPeriod("all"));
  return [
    { label: "Today", ...today },
    { label: "This Month", ...month },
    { label: "This Year", ...year },
    { label: "All Time", ...all }
  ];
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const v = String(value ?? "");
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function renderIncomeSyncMeta(message) {
  const el = qs("#income-sync-meta");
  if (el) el.textContent = `${MIDDLE_DOT} ${message}`;
}

async function saveToFirebase(entry) {
  const services = getFirebaseServices();
  await services.push(services.ref(services.db, "income"), {
    type: entry.type,
    date: entry.date,
    time: entry.time,
    name: entry.name,
    category: entry.category,
    amount: entry.amount,
    profit: entry.profit,
    expense: entry.expense,
    note: entry.note
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
      ? Object.entries(data).map(([key, value]) => normalizeEntry({ ...value, _firebaseKey: key })).sort(sortIncomeTransactions)
      : [];
    incomeConnected = true;
    renderIncomeSummary();
    renderIncomeTable();
    renderAnalyticsView();
    if (qs("#reports-ov.on")) renderReports();
    renderIncomeSyncMeta("Live from Firebase");
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
    toast("Entry deleted", "info");
  } catch (error) {
    toast(`Delete failed: ${error.message}`, "err");
  }
}

function getFirebaseServices() {
  if (!window.firebaseServices) throw new Error("Firebase is not initialized");
  return window.firebaseServices;
}

function setText(selector, value) {
  const el = qs(selector);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

document.addEventListener("DOMContentLoaded", initIncomeView);


// tes

let DATA = {};
let EDIT_MODE = false;
let billItems = [];
let billCounter = 1;
let savedBills = [];
let pdfFiles = [];
let i2pFiles = [];
let resizeOrigImg = null;
let compressOrigImg = null;
let idPhotoDataUrl = null;
let resizeAspect = 1;
let catTreeVisible = false;
let searchTimer;

const PRESETS = [
  { name: "Aadhaar Update", price: 50 },
  { name: "PAN Card Apply", price: 107 },
  { name: "Passport Form", price: 200 },
  { name: "Income Certificate", price: 30 },
  { name: "Community Certificate", price: 30 },
  { name: "KSEB Bill Pay", price: 20 },
  { name: "Vehicle RC Renewal", price: 150 },
  { name: "Voter ID", price: 50 },
  { name: "Lamination", price: 10 },
  { name: "Printout (B&W)", price: 2 },
  { name: "Printout (Colour)", price: 10 },
  { name: "Scan", price: 5 },
  { name: "Photocopy", price: 2 },
  { name: "DigiLocker Help", price: 50 }
];

function boot() {
  loadLogo();
  loadState();
  applyTheme();
  renderServices();
  renderBillingPresets();
  renderSavedBills();
  bindGlobal();
  qs("#resize-w").addEventListener("input", onResizeWChange);
  qs("#resize-h").addEventListener("input", onResizeHChange);
  qs("#resize-quality").addEventListener("input", () => {
    qs("#resize-quality-val").textContent = `${qs("#resize-quality").value}%`;
  });
}

function loadLogo() {
  if (!LOGO_DATA_URL) return;
  const img = document.getElementById("logo-img");
  img.src = LOGO_DATA_URL;
  img.style.display = "block";
}

function loadState() {
  try {
    DATA = JSON.parse(localStorage.getItem("csc_data")) || DEFAULT_DATA;
  } catch {
    DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  try {
    const bills = localStorage.getItem("csc_bills");
    if (bills) savedBills = JSON.parse(bills);
  } catch {}
  try {
    const count = localStorage.getItem("csc_bill_counter");
    if (count) billCounter = parseInt(count, 10);
  } catch {}
}

function saveState() {
  localStorage.setItem("csc_data", JSON.stringify(DATA));
  localStorage.setItem("csc_bills", JSON.stringify(savedBills));
  localStorage.setItem("csc_bill_counter", billCounter);
}

function applyTheme() {
  const theme = localStorage.getItem("csc_theme") || "dark";
  if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  updateThemeBtn(theme);
}

function toggleTheme() {
  const current = localStorage.getItem("csc_theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("csc_theme", next);
  applyTheme();
  toast(next === "dark" ? "?? Dark mode" : "?? Light mode", "info");
}

function updateThemeBtn(theme) {
  const btn = qs("#theme-btn");
  btn.innerHTML = theme === "dark" ? "?? <span>Light</span>" : "?? <span>Dark</span>";
}

function toggleEdit() {
  EDIT_MODE = !EDIT_MODE;
  document.body.classList.toggle("edit-mode", EDIT_MODE);
  qs("#edit-btn").classList.toggle("on", EDIT_MODE);
  qs("#edit-btn").innerHTML = EDIT_MODE ? "?? <span>Lock</span>" : "?? <span>Edit</span>";
  toast(EDIT_MODE ? "?? Edit mode ON" : "?? Edit mode OFF", EDIT_MODE ? "warn" : "info");
}

function showView(id) {
  qsa(".tool-view").forEach(view => view.classList.remove("active"));
  qsa(".sb-item").forEach(item => item.classList.remove("active"));
  const view = qs(`#view-${id}`);
  if (view) view.classList.add("active");
  qsa(`.sb-item[data-view="${id}"]`).forEach(item => item.classList.add("active"));
}

function renderServices() {
  const quickGrid = qs("#quick-grid");
  let quickHtml = "";

  Object.entries(DATA).forEach(([cat, obj]) => {
    const color = obj._color || "#3b82f6";
    Object.entries(obj).forEach(([sub, links]) => {
      if (sub.startsWith("_") || !Array.isArray(links)) return;
      links.forEach(link => {
        quickHtml += `<a class="qbtn" href="${link.url}" target="_blank" rel="noopener"><span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>${link.name}</a>`;
      });
    });
  });

  quickGrid.innerHTML = quickHtml || '<span style="color:var(--mu)">No services loaded</span>';

  const tree = qs("#cat-tree");
  tree.innerHTML = Object.entries(DATA).map(([cat, obj]) => {
    const color = obj._color || "#3b82f6";
    const icon = obj._icon || "??";
    const subs = Object.entries(obj).filter(([key]) => !key.startsWith("_"));
    const subsHtml = subs.map(([sub, links]) => {
      if (!Array.isArray(links)) return "";
      const linksHtml = links.map(link => `<a class="link-btn" href="${link.url}" target="_blank" rel="noopener"><span class="larr">?</span><span><span>${link.name}</span>${link.desc ? `<span class="link-desc-txt">${link.desc}</span>` : ""}</span></a>`).join("");
      return `<div class="sub-section"><div class="sub-h" onclick="toggleSubSection(this)"><span class="sub-pip" style="color:${color}"></span><span class="sub-h-name">${sub}</span><span class="sbc" style="font-size:10px;color:var(--mu2);font-family:var(--mono)">${links.length}</span><span class="sub-h-arrow">?</span></div><div class="sub-links-wrap">${linksHtml}</div></div>`;
    }).join("");
    return `<div class="cat-section"><div class="cat-h" onclick="toggleCatSection(this)"><div class="cat-h-bar" style="background:${color}"></div><span style="font-size:17px">${icon}</span><span class="cat-h-name">${cat}</span><span class="cat-h-cnt">${subs.length} subs</span><span class="cat-h-arrow">?</span></div><div class="cat-subs">${subsHtml}</div></div>`;
  }).join("");
}

function toggleCatSection(header) {
  header.parentElement.classList.toggle("open");
}

function toggleSubSection(header) {
  header.parentElement.classList.toggle("open");
}

function toggleCatTree() {
  catTreeVisible = !catTreeVisible;
  qs("#cat-tree").classList.toggle("visible", catTreeVisible);
  qs(".cat-toggle-btn").innerHTML = catTreeVisible ? "?? Hide Category Tree ?" : "?? Browse by Category ?";
}

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function triSim(a, b) {
  const s1 = ` ${a.toLowerCase()} `;
  const s2 = ` ${b.toLowerCase()} `;
  const t1 = new Set();
  const t2 = new Set();
  for (let i = 0; i < s1.length - 2; i++) t1.add(s1.slice(i, i + 3));
  for (let i = 0; i < s2.length - 2; i++) t2.add(s2.slice(i, i + 3));
  let common = 0;
  t1.forEach(token => {
    if (t2.has(token)) common++;
  });
  return (2 * common) / (t1.size + t2.size + 0.001);
}

function scoreL(link, cat, sub, query) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const fields = [link.name.toLowerCase(), sub.toLowerCase(), cat.toLowerCase(), (link.desc || "").toLowerCase(), ...(link.keywords || []).map(k => k.toLowerCase())];
  for (const field of fields) {
    if (field.includes(q)) return 100;
  }
  const allText = fields.join(" ");
  if (q.split(/\s+/).every(word => allText.includes(word))) return 70;
  let maxT = 0;
  for (const field of fields) {
    const score = triSim(q, field);
    if (score > maxT) maxT = score;
  }
  if (maxT > 0.42) return Math.round(maxT * 55);
  let bestL = Infinity;
  for (const field of [link.name.toLowerCase(), sub.toLowerCase()]) {
    const distance = lev(q, field.slice(0, q.length + 3));
    if (distance < bestL) bestL = distance;
  }
  const maxDistance = Math.max(2, Math.floor(q.length / 3));
  if (bestL <= maxDistance) return Math.max(5, 35 - bestL * 10);
  return 0;
}

function onGlobalSearch(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const query = value.trim();
    if (!query) {
      showView("services");
      renderServices();
      return;
    }

    showView("services");
    const qg = qs("#quick-grid");
    const results = [];
    Object.entries(DATA).forEach(([cat, obj]) => {
      Object.entries(obj).forEach(([sub, links]) => {
        if (sub.startsWith("_") || !Array.isArray(links)) return;
        links.forEach(link => {
          const score = scoreL(link, cat, sub, query);
          if (score > 0) results.push({ cat, link, score });
        });
      });
    });

    results.sort((a, b) => b.score - a.score);
    if (!results.length) {
      qg.innerHTML = `<span style="color:var(--mu)">No results for "${query}"</span>`;
      return;
    }

    qg.innerHTML = `<div style="font-size:11px;color:var(--mu);width:100%;margin-bottom:4px">${results.length} results for "<strong style="color:var(--tx)">${query}</strong>"</div>` + results.slice(0, 30).map(({ cat, link }) => `<a class="qbtn" href="${link.url}" target="_blank" rel="noopener" title="${link.desc || ""}"><span style="width:6px;height:6px;border-radius:50%;background:${DATA[cat]?._color || "#3b82f6"};display:inline-block;flex-shrink:0"></span>${link.name}<span class="qcat">${cat}</span></a>`).join("");
  }, 100);
}

function renderBillingPresets() {
  qs("#preset-chips").innerHTML = PRESETS.map(preset => `<button class="btn btn-ghost btn-sm" style="font-size:11px" onclick='addPreset(${JSON.stringify(preset)})'>${preset.name} ?${preset.price}</button>`).join("");
}

function addPreset(preset) {
  qs("#bill-item-name").value = preset.name;
  qs("#bill-item-price").value = preset.price;
  qs("#bill-item-qty").value = 1;
  addBillItem();
}

function addBillItem() {
  const name = qs("#bill-item-name").value.trim();
  const qty = parseFloat(qs("#bill-item-qty").value) || 1;
  const price = parseFloat(qs("#bill-item-price").value);
  if (!name) {
    toast("Enter item name", "warn");
    qs("#bill-item-name").focus();
    return;
  }
  if (!price || price <= 0) {
    toast("Enter valid price", "warn");
    qs("#bill-item-price").focus();
    return;
  }
  billItems.push({ id: Date.now(), name, qty, price });
  qs("#bill-item-name").value = "";
  qs("#bill-item-price").value = "";
  qs("#bill-item-qty").value = 1;
  renderBillTable();
  qs("#bill-item-name").focus();
}

function removeBillItem(id) {
  billItems = billItems.filter(item => item.id !== id);
  renderBillTable();
}

function renderBillTable() {
  const tbody = qs("#bill-tbody");
  if (!billItems.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No items added yet</td></tr>';
    renderBillTotals();
    renderReceipt();
    return;
  }
  tbody.innerHTML = billItems.map((item, idx) => `<tr><td style="color:var(--mu2)">${idx + 1}</td><td style="font-weight:500">${item.name}</td><td style="text-align:center">${item.qty}</td><td style="font-family:var(--mono)">?${item.price.toFixed(2)}</td><td style="font-family:var(--mono);font-weight:600">?${(item.qty * item.price).toFixed(2)}</td><td><button class="fi-del" onclick="removeBillItem(${item.id})">??</button></td></tr>`).join("");
  renderBillTotals();
  renderReceipt();
}

function renderBillTotals() {
  const subtotal = billItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  const gst = parseFloat(qs("#bill-gst").value) || 0;
  const gstAmount = subtotal * (gst / 100);
  const grand = subtotal + gstAmount;
  qs("#bill-subtotal").textContent = `?${subtotal.toFixed(2)}`;
  qs("#bill-gst-amt").textContent = `?${gstAmount.toFixed(2)}`;
  qs("#bill-grand").textContent = `?${grand.toFixed(2)}`;
  renderReceipt();
}

function renderReceipt() {
  const customer = qs("#bill-cust").value || "Customer";
  const number = qs("#bill-no").value || `BILL-${String(billCounter).padStart(4, "0")}`;
  const now = new Date();
  const dt = `${now.toLocaleDateString("en-IN")} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  const subtotal = billItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  const gst = parseFloat(qs("#bill-gst").value) || 0;
  const gstAmount = subtotal * (gst / 100);
  const grand = subtotal + gstAmount;
  const width = 38;
  const line = "-".repeat(width);
  const center = value => value.padStart(Math.floor((width + value.length) / 2)).padEnd(width);
  const lr = (left, right) => left + " ".repeat(Math.max(1, width - left.length - right.length)) + right;
  let text = "";
  text += `${center("JANASEVA KENDRAM")}\n`;
  text += `${center("Thennala Westbazar")}\n`;
  text += `${center("Ph: 9847816928")}\n`;
  text += `${line}\n`;
  text += `Bill No: ${number}\n`;
  text += `Date   : ${dt}\n`;
  text += `Name   : ${customer}\n`;
  text += `${line}\n`;
  text += "Item                Qty  Price   Amt\n";
  text += `${line}\n`;
  billItems.forEach(item => {
    const name = item.name.slice(0, 18).padEnd(18);
    const qty = String(item.qty).padStart(3);
    const price = (`?${item.price.toFixed(0)}`).padStart(7);
    const amount = (`?${(item.qty * item.price).toFixed(0)}`).padStart(7);
    text += `${name}${qty}${price}${amount}\n`;
  });
  text += `${line}\n`;
  text += `${lr("Subtotal:", `?${subtotal.toFixed(2)}`)}\n`;
  if (gst > 0) text += `${lr(`GST (${gst}%):`, `?${gstAmount.toFixed(2)}`)}\n`;
  text += `${line}\n`;
  text += `${lr("TOTAL:", `?${grand.toFixed(2)}`)}\n`;
  text += `${line}\n`;
  text += `${center("Thank you!")}\n`;
  text += center("Powered by Janaseva Kendram");
  qs("#receipt-preview").textContent = text;
}

function printReceipt() {
  const win = window.open("", "_blank");
  const subtotal = billItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  const gst = parseFloat(qs("#bill-gst").value) || 0;
  const grand = subtotal + subtotal * (gst / 100);
  const rows = billItems.map(item => `<tr><td>${item.name}</td><td style="text-align:center">${item.qty}</td><td style="text-align:right">?${item.price.toFixed(2)}</td><td style="text-align:right"><b>?${(item.qty * item.price).toFixed(2)}</b></td></tr>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><title>Bill</title><style>body{font-family:Arial,sans-serif;max-width:400px;margin:20px auto;font-size:13px}h2,h3{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse}th,td{padding:5px 8px;border-bottom:1px solid #ddd}th{background:#f5f5f5}.total-row td{font-size:15px;font-weight:bold;border-top:2px solid #333}.grand td{font-size:18px;color:#1a5c2e;border-top:3px double #333}.footer{text-align:center;margin-top:16px;font-size:11px;color:#666}@media print{button{display:none}}</style></head><body><h2>JANASEVA KENDRAM</h2><h3 style="font-weight:400;color:#666">Thennala Westbazar · 9847816928</h3><hr><p>Bill: ${qs("#bill-no").value || `BILL-${billCounter}`} &nbsp;&nbsp; Date: ${new Date().toLocaleDateString("en-IN")}</p><p>Customer: ${qs("#bill-cust").value || "—"}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><table style="margin-top:8px"><tr class="total-row"><td colspan="3">Subtotal</td><td style="text-align:right">?${subtotal.toFixed(2)}</td></tr>${gst > 0 ? `<tr><td colspan="3">GST (${gst}%)</td><td style="text-align:right">?${(subtotal * gst / 100).toFixed(2)}</td></tr>` : ""}<tr class="grand"><td colspan="3"><b>TOTAL</b></td><td style="text-align:right"><b>?${grand.toFixed(2)}</b></td></tr></table><div class="footer"><p>Thank you for choosing Janaseva Kendram</p></div><script>window.print();window.close();<\/script></body></html>`);
  win.document.close();
  billCounter++;
  saveState();
}

function copyReceipt() {
  navigator.clipboard.writeText(qs("#receipt-preview").textContent).then(() => toast("?? Receipt copied", "ok"));
}

function clearBill() {
  if (billItems.length && !confirm("Clear all items?")) return;
  billItems = [];
  renderBillTable();
}

function saveBill() {
  if (!billItems.length) {
    toast("No items to save", "warn");
    return;
  }
  const total = billItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  savedBills.unshift({ id: Date.now(), no: qs("#bill-no").value || `BILL-${billCounter}`, cust: qs("#bill-cust").value || "Customer", total, items: [...billItems], date: new Date().toLocaleDateString("en-IN") });
  if (savedBills.length > 20) savedBills.pop();
  billCounter++;
  saveState();
  renderSavedBills();
  toast("?? Bill saved", "ok");
}

function renderSavedBills() {
  const el = qs("#saved-bills-list");
  if (!savedBills.length) {
    el.innerHTML = '<span style="color:var(--mu2)">No saved bills</span>';
    return;
  }
  el.innerHTML = savedBills.slice(0, 8).map(bill => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--bdr);font-size:12px"><span style="color:var(--tx2)">${bill.no} · ${bill.cust}</span><span style="font-family:var(--mono);color:var(--g)">?${bill.total.toFixed(0)}</span></div>`).join("");
}

function dzOver(event, id) { event.preventDefault(); qs(`#${id}`).classList.add("drag"); }
function dzLeave(id) { qs(`#${id}`).classList.remove("drag"); }
function dzDrop(event, type) { event.preventDefault(); const files = [...event.dataTransfer.files]; if (type === "pdf") addPdfFiles(files); if (type === "i2p") addI2pFiles(files); }
function pdfFilesSelected(event) { addPdfFiles([...event.target.files]); }

function addPdfFiles(files) {
  files.filter(file => file.type === "application/pdf").forEach(file => pdfFiles.push(file));
  renderPdfList();
}

function renderPdfList() {
  qs("#pdf-file-list").innerHTML = pdfFiles.map((file, i) => `<div class="file-item"><span style="color:var(--err)">??</span><span class="fi-name">${file.name}</span><span class="fi-size">${(file.size / 1024).toFixed(1)}KB</span><button class="fi-del" onclick="pdfFiles.splice(${i},1);renderPdfList()">?</button></div>`).join("");
}

async function mergePDFs() {
  if (pdfFiles.length < 2) { toast("Add at least 2 PDF files", "warn"); return; }
  const btn = qs("#pdf-merge-btn");
  btn.disabled = true;
  btn.textContent = "Loading…";
  try {
    if (!window.PDFLib) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");
    btn.textContent = "Merging…";
    setPb("pdf-pb-fill", 30);
    const merged = await PDFLib.PDFDocument.create();
    for (let i = 0; i < pdfFiles.length; i++) {
      setPb("pdf-pb-fill", 30 + Math.round((i / pdfFiles.length) * 60));
      const bytes = await pdfFiles[i].arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => merged.addPage(page));
    }
    setPb("pdf-pb-fill", 95);
    const bytes = await merged.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const name = qs("#pdf-out-name").value || "merged.pdf";
    const url = URL.createObjectURL(blob);
    const result = qs("#pdf-result");
    result.style.display = "block";
    result.innerHTML = `? Merged ${pdfFiles.length} files! <a href="${url}" download="${name}">?? Download ${name}</a>`;
    setPb("pdf-pb-fill", 100);
    toast("? PDF merged successfully", "ok");
  } catch (error) {
    toast(`Error: ${error.message}`, "err");
  }
  btn.disabled = false;
  btn.textContent = "?? Merge PDFs";
}

function i2pFilesSelected(event) { addI2pFiles([...event.target.files]); }

function addI2pFiles(files) {
  files.filter(file => file.type.startsWith("image/")).forEach(file => i2pFiles.push(file));
  qs("#i2p-file-list").innerHTML = i2pFiles.map((file, i) => `<div class="file-item"><span>???</span><span class="fi-name">${file.name}</span><span class="fi-size">${(file.size / 1024).toFixed(1)}KB</span><button class="fi-del" onclick="i2pFiles.splice(${i},1);renderI2pList()">?</button></div>`).join("");
}

function renderI2pList() { addI2pFiles([]); }

async function imagesToPDF() {
  if (!i2pFiles.length) { toast("Add at least one image", "warn"); return; }
  try {
    if (!window.PDFLib) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");
    setPb("i2p-pb", 10);
    const doc = await PDFLib.PDFDocument.create();
    const size = qs("#i2p-size").value;
    const orient = qs("#i2p-orient").value;
    const sizes = { A4: [595, 842], A3: [842, 1191], LETTER: [612, 792] };
    for (let i = 0; i < i2pFiles.length; i++) {
      setPb("i2p-pb", 10 + Math.round((i / i2pFiles.length) * 80));
      const buf = await i2pFiles[i].arrayBuffer();
      const type = i2pFiles[i].type;
      let img;
      if (type === "image/jpeg" || type === "image/jpg") img = await doc.embedJpg(buf);
      else {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const bmp = await createImageBitmap(new Blob([buf], { type }));
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        ctx.drawImage(bmp, 0, 0);
        const jpgB64 = canvas.toDataURL("image/jpeg", 0.92);
        const jpgBuf = await fetch(jpgB64).then(response => response.arrayBuffer());
        img = await doc.embedJpg(jpgBuf);
      }
      let pw; let ph;
      if (size === "FIT") { pw = img.width; ph = img.height; }
      else { [pw, ph] = sizes[size] || sizes.A4; if (orient === "landscape") [pw, ph] = [ph, pw]; }
      const page = doc.addPage([pw, ph]);
      const scale = Math.min(pw / img.width, ph / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
    setPb("i2p-pb", 95);
    const bytes = await doc.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const name = qs("#i2p-name").value || "images.pdf";
    const url = URL.createObjectURL(blob);
    const result = qs("#i2p-result");
    result.style.display = "block";
    result.innerHTML = `? ${i2pFiles.length} image(s) converted! <a href="${url}" download="${name}">?? Download ${name}</a>`;
    setPb("i2p-pb", 100);
    toast("? Images converted to PDF", "ok");
  } catch (error) {
    toast(`Error: ${error.message}`, "err");
  }
}

function loadResizeImage(event) {
  const file = event.target.files[0]; if (!file) return;
  const img = qs("#resize-orig");
  const url = URL.createObjectURL(file);
  img.onload = () => {
    resizeOrigImg = img;
    resizeAspect = img.naturalWidth / img.naturalHeight;
    qs("#resize-w").value = img.naturalWidth;
    qs("#resize-h").value = img.naturalHeight;
    qs("#resize-preview").style.display = "flex";
    qs("#resize-orig-info").textContent = `Original: ${img.naturalWidth}×${img.naturalHeight}px · ${(file.size / 1024).toFixed(1)}KB`;
  };
  img.src = url;
}

function onResizeWChange() {
  if (qs("#resize-lock").checked && resizeOrigImg) qs("#resize-h").value = Math.round(parseInt(qs("#resize-w").value, 10) / resizeAspect) || "";
}

function onResizeHChange() {
  if (qs("#resize-lock").checked && resizeOrigImg) qs("#resize-w").value = Math.round(parseInt(qs("#resize-h").value, 10) * resizeAspect) || "";
}

function doResize() {
  if (!resizeOrigImg) { toast("Load an image first", "warn"); return; }
  const width = parseInt(qs("#resize-w").value, 10);
  const height = parseInt(qs("#resize-h").value, 10);
  if (!width || !height) { toast("Enter valid dimensions", "warn"); return; }
  const canvas = qs("#resize-canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(resizeOrigImg, 0, 0, width, height);
  const format = qs("#resize-fmt").value;
  const quality = parseInt(qs("#resize-quality").value, 10) / 100;
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const ext = format.split("/")[1].replace("jpeg", "jpg");
    const result = qs("#resize-result");
    result.style.display = "block";
    result.innerHTML = `? Resized to ${width}×${height}px · ${(blob.size / 1024).toFixed(1)}KB <br><a href="${url}" download="resized.${ext}">?? Download</a>`;
    toast("? Image resized", "ok");
  }, format, quality);
}

function loadCompressImage(event) {
  const file = event.target.files[0]; if (!file) return;
  const img = qs("#compress-orig-img");
  img.onload = () => {
    compressOrigImg = img;
    qs("#compress-preview").style.display = "flex";
    qs("#compress-orig-info").textContent = `Original: ${img.naturalWidth}×${img.naturalHeight}px · ${(file.size / 1024).toFixed(1)}KB`;
  };
  img.src = URL.createObjectURL(file);
}

function doCompress() {
  if (!compressOrigImg) { toast("Load an image first", "warn"); return; }
  const canvas = qs("#compress-canvas");
  canvas.width = compressOrigImg.naturalWidth;
  canvas.height = compressOrigImg.naturalHeight;
  canvas.getContext("2d").drawImage(compressOrigImg, 0, 0);
  const format = qs("#compress-fmt").value;
  const quality = parseInt(qs("#compress-quality").value, 10) / 100;
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const ext = format.split("/")[1].replace("jpeg", "jpg");
    const result = qs("#compress-result");
    result.style.display = "block";
    result.innerHTML = `? Compressed: ${(blob.size / 1024).toFixed(1)}KB <a href="${url}" download="compressed.${ext}">?? Download</a>`;
    toast("? Image compressed", "ok");
  }, format, quality);
}

function loadIdPhoto(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { idPhotoDataUrl = e.target.result; updateIdCard(); };
  reader.readAsDataURL(file);
}

function updateIdCard() {
  qs("#idc-title-p").textContent = qs("#idc-title").value || "ID CARD";
  qs("#idc-name-p").textContent = qs("#idc-name").value || "Name";
  qs("#idc-dob-p").textContent = qs("#idc-dob").value || "—";
  qs("#idc-gender-p").textContent = qs("#idc-gender").value || "—";
  qs("#idc-addr-p").textContent = qs("#idc-addr").value || "";
  qs("#idc-num-p").textContent = qs("#idc-num").value || "XXXX XXXX XXXX";
  qs("#idc-footer-p").textContent = qs("#idc-footer").value || "";
  const photo = qs("#idc-photo-p");
  if (idPhotoDataUrl) photo.innerHTML = `<img src="${idPhotoDataUrl}" alt="Photo">`;
}

function printIdCard() {
  updateIdCard();
  const card = qs("#id-card-render").innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>ID Card</title><style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f0f0;font-family:Arial,sans-serif}.id-card-preview{background:#fff;border-radius:10px;overflow:hidden;max-width:340px;box-shadow:0 4px 20px rgba(0,0,0,.3)}.id-card-header{background:linear-gradient(135deg,#1a3a5c,#2563eb);padding:10px 14px;color:#fff;text-align:center}.id-card-body{padding:12px 14px;display:flex;gap:12px;align-items:flex-start}.id-photo{width:80px;height:96px;border:2px solid #ccc;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;flex-shrink:0}.id-photo img{width:100%;height:100%;object-fit:cover}.id-info{font-size:12px;color:#333;flex:1}.id-name{font-size:14px;font-weight:700;color:#111;margin-bottom:4px}.id-field{margin-bottom:3px;color:#555}.id-field strong{color:#222}.id-footer{background:#f0f4f8;padding:7px 14px;text-align:center;font-size:10px;color:#666;border-top:1px solid #ddd}@media print{body{background:#fff}}</style></head><body>${card}<script>setTimeout(()=>window.print(),300);<\/script></body></html>`);
  win.document.close();
}

function openJson() { qs("#json-ta").value = JSON.stringify(DATA, null, 2); showOv("json-ov"); }

function saveJson() {
  try {
    DATA = JSON.parse(qs("#json-ta").value);
    saveState();
    closeOv("json-ov");
    renderServices();
    toast("? Data saved", "ok");
  } catch (error) {
    toast(`? Invalid JSON: ${error.message}`, "err");
  }
}

function importJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = event => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        DATA = JSON.parse(e.target.result);
        saveState();
        renderServices();
        closeOv("json-ov");
        toast("? Imported", "ok");
      } catch {
        toast("? Invalid JSON", "err");
      }
    };
    reader.readAsText(event.target.files[0]);
  };
  input.click();
}

function resetDataConfirm() {
  if (!confirm("Reset all data to defaults?")) return;
  DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
  saveState();
  closeOv("json-ov");
  renderServices();
  toast("?? Reset to defaults", "warn");
}

function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return document.querySelectorAll(selector); }
function showOv(id) { qs(`#${id}`).classList.add("on"); }
function closeOv(id) { qs(`#${id}`).classList.remove("on"); }
function setPb(id, value) { const el = qs(`#${id}`); if (el) el.style.width = `${value}%`; }

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function toast(msg, type = "info") {
  const wrap = qs("#toast-wrap");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

function bindGlobal() {
  qs("#global-search").addEventListener("input", event => onGlobalSearch(event.target.value));
  qsa(".ov").forEach(overlay => overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.classList.remove("on");
  }));
  document.addEventListener("keydown", event => {
    const overlay = qs(".ov.on");
    if (event.key === "Escape") {
      if (overlay) {
        overlay.classList.remove("on");
        return;
      }
      if (qs("#global-search").value) {
        qs("#global-search").value = "";
        renderServices();
      }
    }
    if (event.key === "/" && document.activeElement !== qs("#global-search") && !overlay) {
      event.preventDefault();
      qs("#global-search").focus();
    }
  });
  ["#bill-cust", "#bill-no"].forEach(id => {
    const el = qs(id);
    if (el) el.addEventListener("input", () => { if (billItems.length) renderReceipt(); });
  });
}

document.addEventListener("DOMContentLoaded", boot);

function ensureMainCategoryLinks() {
  const target = DATA && DATA['eDistrict Kerala'];
  if (!target) return;
  if (!Array.isArray(target._links)) target._links = [];
  if (!target._links.some(link => link && link.url === 'https://edistrict.kerala.gov.in/')) {
    target._links.unshift({
      name: 'Open eDistrict Kerala',
      url: 'https://edistrict.kerala.gov.in/',
      desc: 'Open the main eDistrict Kerala portal directly.',
      keywords: ['edistrict', 'kerala edistrict', 'main portal', 'certificate portal']
    });
  }
}

function fixHeaderLabels() {
  const brandSub = document.querySelector('.brand-sub');
  if (brandSub) brandSub.textContent = 'Ismail KV · Thennala Westbazar · 📞 9847816928';

  const searchIcon = document.querySelector('.hsearch-ico');
  if (searchIcon) searchIcon.textContent = '⌕';

  const searchInput = document.querySelector('#global-search');
  if (searchInput) searchInput.placeholder = 'Search services… (press /)';

  const phoneLink = document.querySelector('.hinfo a');
  if (phoneLink) phoneLink.textContent = '📞 9847816928';

  const editBtn = document.querySelector('#edit-btn');
  if (editBtn) editBtn.innerHTML = EDIT_MODE ? '🔒 <span>Lock</span>' : '✏️ <span>Edit</span>';

  const themeBtn = document.querySelector('#theme-btn');
  if (themeBtn) {
    const theme = localStorage.getItem('csc_theme') || 'dark';
    themeBtn.innerHTML = theme === 'dark' ? '☀️ <span>Light</span>' : '🌙 <span>Dark</span>';
  }
}

function fixSidebarLabels() {
  const mapping = {
    services: ['🌐', 'Services'],
    billing: ['🧾', 'Billing'],
    'pdf-merge': ['📄', 'Merge PDF'],
    'img-to-pdf': ['🖼️', 'Image → PDF'],
    'img-resize': ['📐', 'Resize Image'],
    'img-compress': ['🗜️', 'Compress Image']
  };

  Object.entries(mapping).forEach(([view, parts]) => {
    const item = document.querySelector(`.sb-item[data-view="${view}"]`);
    if (!item) return;
    const spans = item.querySelectorAll('span');
    if (spans[0]) spans[0].textContent = parts[0];
    if (spans[1]) spans[1].textContent = parts[1];
  });

  const manage = document.querySelector('.sb-bottom .sb-item .sb-icon');
  if (manage) manage.textContent = '⚙️';
}

function fixToolHeadings() {
  const headings = [
    ['#view-billing .page-title', '🧾 Billing System'],
    ['#view-pdf-merge .page-title', '📄 Merge PDF'],
    ['#view-img-to-pdf .page-title', '🖼️ Image → PDF'],
    ['#view-img-resize .page-title', '📐 Resize Image'],
    ['#view-img-compress .page-title', '🗜️ Compress Image']
  ];

  headings.forEach(([selector, text]) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  });
}

function removeIdCardTool() {
  const navItem = document.querySelector('.sb-item[data-view="id-card"]');
  if (navItem) navItem.remove();
  const view = document.querySelector('#view-id-card');
  if (view) view.remove();
}

function ensureCompressionTargetControls() {
  if (document.querySelector('#compress-target-value')) return;
  const sliderGroup = document.querySelector('#view-img-compress .slider-group');
  if (!sliderGroup) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'grid2 margin-top-small';
  wrapper.innerHTML = `
    <div>
      <label class="label">Target Size</label>
      <input class="inp" id="compress-target-value" type="number" min="1" value="200">
    </div>
    <div>
      <label class="label">Unit</label>
      <select class="inp" id="compress-target-unit">
        <option value="KB">KB</option>
        <option value="MB">MB</option>
      </select>
    </div>
  `;
  sliderGroup.insertAdjacentElement('afterend', wrapper);
}

function getCompressTargetBytes() {
  const value = parseFloat(document.querySelector('#compress-target-value')?.value || '0');
  const unit = document.querySelector('#compress-target-unit')?.value || 'KB';
  if (!value || value <= 0) return 0;
  return unit === 'MB' ? value * 1024 * 1024 : value * 1024;
}

function updateCompressionInfo(resultBytes) {
  const info = document.querySelector('#compress-size-info');
  if (!info) return;
  const img = document.querySelector('#compress-orig-img');
  const originalBytes = Number(img?.dataset?.fileSize || 0);
  const targetBytes = getCompressTargetBytes();
  const parts = [];
  if (originalBytes) parts.push(`Original ${(originalBytes / 1024).toFixed(1)} KB`);
  if (targetBytes) {
    const targetText = targetBytes >= 1024 * 1024
      ? `${(targetBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(targetBytes / 1024)} KB`;
    parts.push(`Target ${targetText}`);
  }
  if (resultBytes) parts.push(`Result ${(resultBytes / 1024).toFixed(1)} KB`);
  info.textContent = parts.join(' · ');
}

const originalLoadCompressImageFix = loadCompressImage;
loadCompressImage = function (event) {
  originalLoadCompressImageFix(event);
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const img = document.querySelector('#compress-orig-img');
  if (img) img.dataset.fileSize = String(file.size);
  setTimeout(() => updateCompressionInfo(), 50);
};

const originalToggleThemeFix = toggleTheme;
toggleTheme = function () {
  originalToggleThemeFix();
  fixHeaderLabels();
};

const originalToggleEditFix = toggleEdit;
toggleEdit = function () {
  originalToggleEditFix();
  fixHeaderLabels();
};

doCompress = function () {
  if (!compressOrigImg) {
    toast('Load an image first', 'warn');
    return;
  }

  const canvas = qs('#compress-canvas');
  canvas.width = compressOrigImg.naturalWidth;
  canvas.height = compressOrigImg.naturalHeight;
  canvas.getContext('2d').drawImage(compressOrigImg, 0, 0);

  const fmt = qs('#compress-fmt').value;
  const manualQuality = parseInt(qs('#compress-quality').value, 10) / 100;
  const targetBytes = getCompressTargetBytes();

  const finish = blob => {
    const url = URL.createObjectURL(blob);
    const ext = fmt.split('/')[1].replace('jpeg', 'jpg');
    const res = qs('#compress-result');
    res.style.display = 'block';
    res.innerHTML = `✅ Compressed: ${(blob.size / 1024).toFixed(1)}KB <a href="${url}" download="compressed.${ext}">📥 Download</a>`;
    updateCompressionInfo(blob.size);
    toast('✅ Image compressed', 'ok');
  };

  if (!targetBytes || fmt === 'image/png') {
    canvas.toBlob(finish, fmt, manualQuality);
    return;
  }

  let low = 0.05;
  let high = 0.95;
  let bestBlob = null;
  let attempts = 0;

  const iterate = () => {
    const quality = (low + high) / 2;
    canvas.toBlob(blob => {
      attempts += 1;
      if (!bestBlob || Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes)) {
        bestBlob = blob;
      }
      if (attempts >= 7) {
        finish(bestBlob || blob);
        return;
      }
      if (blob.size > targetBytes) high = quality;
      else low = quality;
      iterate();
    }, fmt, quality);
  };

  iterate();
};

document.addEventListener('DOMContentLoaded', () => {
  ensureMainCategoryLinks();
  if (typeof saveState === 'function') saveState();
  fixHeaderLabels();
  fixSidebarLabels();
  fixToolHeadings();
  removeIdCardTool();
  ensureCompressionTargetControls();
  updateCompressionInfo();
  ['#compress-target-value', '#compress-target-unit'].forEach(selector => {
    const el = document.querySelector(selector);
    if (el) el.addEventListener('input', () => updateCompressionInfo());
  });
  if (typeof renderServices === 'function') renderServices();
});

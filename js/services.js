let recentLinks = [];
let favouriteLinks = [];
let activeCategoryKey = null;
let openSubcategoryKeys = {};

const originalLoadState = loadState;
const originalSaveState = saveState;

loadState = function () {
  originalLoadState();
  try {
    recentLinks = JSON.parse(localStorage.getItem("csc_recent_links")) || [];
  } catch {
    recentLinks = [];
  }
  try {
    favouriteLinks = JSON.parse(localStorage.getItem("csc_favourite_links")) || [];
  } catch {
    favouriteLinks = [];
  }
};

saveState = function () {
  originalSaveState();
  localStorage.setItem("csc_recent_links", JSON.stringify(recentLinks));
  localStorage.setItem("csc_favourite_links", JSON.stringify(favouriteLinks));
};

function collectServiceEntries() {
  const entries = [];
  Object.entries(DATA).forEach(([category, categoryObj]) => {
    const directLinks = Array.isArray(categoryObj._links) ? categoryObj._links : [];
    directLinks.forEach(link => {
      entries.push({
        category,
        subcategory: "",
        color: categoryObj._color || "#3b82f6",
        isDirect: true,
        ...link
      });
    });
    Object.entries(categoryObj).forEach(([subcategory, links]) => {
      if (subcategory.startsWith("_") || !Array.isArray(links)) return;
      links.forEach(link => {
        entries.push({
          category,
          subcategory,
          color: categoryObj._color || "#3b82f6",
          ...link
        });
      });
    });
  });
  return entries;
}

function categorySummaries() {
  return Object.entries(DATA).map(([category, categoryObj]) => {
    const directLinks = Array.isArray(categoryObj._links) ? categoryObj._links : [];
    const subcategories = Object.entries(categoryObj).filter(([key, value]) => !key.startsWith("_") && Array.isArray(value));
    const linkCount = directLinks.length + subcategories.reduce((sum, [, links]) => sum + links.length, 0);
    const isDirectCategory = directLinks.length === 1 && subcategories.length === 0;
    return {
      category,
      color: categoryObj._color || "#3b82f6",
      icon: categoryObj._icon || "",
      directLinks,
      subcategories,
      subcategoryCount: subcategories.length,
      linkCount,
      isDirectCategory
    };
  });
}

function makeServiceKey(item) {
  return `${item.category}|||${item.subcategory}|||${item.url}`;
}

function isFavourite(item) {
  return favouriteLinks.some(entry => entry.key === makeServiceKey(item));
}

function toggleFavouriteByKey(key) {
  const all = collectServiceEntries();
  const item = all.find(entry => makeServiceKey(entry) === key);
  if (!item) return;
  const existingIndex = favouriteLinks.findIndex(entry => entry.key === key);
  if (existingIndex >= 0) {
    favouriteLinks.splice(existingIndex, 1);
    toast("Removed from favourites", "info");
  } else {
    favouriteLinks.unshift({
      key,
      name: item.name,
      url: item.url,
      category: item.category,
      subcategory: item.subcategory,
      color: item.color
    });
    if (favouriteLinks.length > 24) favouriteLinks = favouriteLinks.slice(0, 24);
    toast("Added to favourites", "ok");
  }
  saveState();
  renderServices();
}

function openServiceLink(url, name, category, subcategory) {
  const key = `${category}|||${subcategory}|||${url}`;
  recentLinks = recentLinks.filter(entry => entry.key !== key);
  recentLinks.unshift({ key, url, name, category, subcategory });
  if (recentLinks.length > 12) recentLinks = recentLinks.slice(0, 12);
  saveState();
  renderRecentLinks();
  window.open(url, "_blank", "noopener");
}

function renderCategoryChips() {
  const wrap = qs("#category-chip-row");
  const summaries = categorySummaries();
  wrap.innerHTML = summaries.map(summary => `
    <button class="service-chip ${activeCategoryKey === summary.category ? "active" : ""}" onclick="${summary.isDirectCategory ? `openServiceLink('${escapeJs(summary.directLinks[0].url)}','${escapeJs(summary.directLinks[0].name)}','${escapeJs(summary.category)}','')` : `focusCategory('${escapeJs(summary.category)}')`}">
      ${summary.icon ? `<span>${escapeHtml(summary.icon)}</span>` : ""}
      <span class="service-chip-dot" style="background:${summary.color}"></span>
      <span>${escapeHtml(summary.category)}</span>
    </button>
  `).join("");
}

function renderRecentLinks() {
  const wrap = qs("#recent-links-row");
  if (!recentLinks.length) {
    wrap.innerHTML = '<span class="service-empty">Clicked links appear here</span>';
    return;
  }
  wrap.innerHTML = recentLinks.map(item => `
    <button class="service-chip" onclick="openServiceLink('${escapeJs(item.url)}','${escapeJs(item.name)}','${escapeJs(item.category)}','${escapeJs(item.subcategory)}')">
      <span>${escapeHtml(item.name)}</span>
    </button>
  `).join("");
}

function renderFavouriteLinks() {
  const wrap = qs("#favourite-links-row");
  if (!favouriteLinks.length) {
    wrap.innerHTML = '<span class="service-empty">Save links to keep them here</span>';
    return;
  }
  wrap.innerHTML = favouriteLinks.map(item => `
    <button class="service-chip" onclick="openServiceLink('${escapeJs(item.url)}','${escapeJs(item.name)}','${escapeJs(item.category)}','${escapeJs(item.subcategory)}')">
      <span class="service-chip-dot" style="background:${item.color || "#fbbf24"}"></span>
      <span>${escapeHtml(item.name)}</span>
    </button>
  `).join("");
}

function renderStats() {
  const summaries = categorySummaries();
  const subcategories = summaries.reduce((sum, item) => sum + item.subcategoryCount, 0);
  const links = summaries.reduce((sum, item) => sum + item.linkCount, 0);
  const statCategories = qs("#stat-categories");
  const statSubcategories = qs("#stat-subcategories");
  const statLinks = qs("#stat-links");
  const statFavourites = qs("#stat-favourites");
  if (statCategories) statCategories.textContent = summaries.length;
  if (statSubcategories) statSubcategories.textContent = subcategories;
  if (statLinks) statLinks.textContent = links;
  if (statFavourites) statFavourites.textContent = favouriteLinks.length;
}

function renderSearchResults(query = "") {
  const panel = qs("#search-results-panel");
  const count = qs("#search-results-count");
  const grid = qs("#search-results-grid");
  const value = query.trim();

  if (!value) {
    panel.classList.add("hidden");
    grid.innerHTML = "";
    count.textContent = "";
    return;
  }

  const results = [];
  collectServiceEntries().forEach(item => {
    const score = scoreL(item, item.category, item.subcategory, value);
    if (score > 0) results.push({ item, score });
  });
  results.sort((a, b) => b.score - a.score);

  panel.classList.remove("hidden");
  count.textContent = results.length ? `${results.length} matching services` : `No matches for "${value}"`;
  grid.innerHTML = results.length
    ? results.slice(0, 30).map(({ item }) => renderSearchCard(item)).join("")
    : '<div class="service-empty">Try a different keyword or spelling.</div>';
}

function renderSearchCard(item) {
  const key = makeServiceKey(item);
  return `<div class="search-result-card">
    <div class="search-result-meta">${escapeHtml(item.category)}${item.subcategory ? ` / ${escapeHtml(item.subcategory)}` : ""}</div>
    <div class="search-result-title">${escapeHtml(item.name)}</div>
    <div class="search-result-desc">${escapeHtml(item.desc || "Open this service portal.")}</div>
    <div class="search-result-actions">
      <button class="btn btn-orange btn-sm" onclick="openServiceLink('${escapeJs(item.url)}','${escapeJs(item.name)}','${escapeJs(item.category)}','${escapeJs(item.subcategory)}')">Open</button>
      <button class="mini-icon-btn ${isFavourite(item) ? "fav-on" : ""}" onclick="toggleFavouriteByKey('${escapeJs(key)}')" title="Favourite">${isFavourite(item) ? "Saved" : "Save"}</button>
    </div>
  </div>`;
}

function renderCategoryCards() {
  const grid = qs("#category-card-grid");
  const summaries = categorySummaries();
  grid.innerHTML = summaries.map(summary => {
    const isOpen = activeCategoryKey === summary.category;
    const directCategoryLink = summary.isDirectCategory ? summary.directLinks[0] : null;
    return `
      <section class="category-card ${isOpen ? "open" : ""} ${summary.isDirectCategory ? "category-card-direct" : ""}" id="${categoryDomId(summary.category)}">
        <div class="category-card-head">
          <button class="category-toggle" onclick="${summary.isDirectCategory ? `openServiceLink('${escapeJs(directCategoryLink.url)}','${escapeJs(directCategoryLink.name)}','${escapeJs(summary.category)}','')` : `focusCategory('${escapeJs(summary.category)}')`}">
            <div class="category-card-head">
              <div class="category-icon" style="background:${summary.color}">${summary.icon ? escapeHtml(summary.icon) : ""}</div>
              <div class="category-head-copy">
                <div class="category-name">${escapeHtml(summary.category)}</div>
                <div class="category-meta">${summary.isDirectCategory ? escapeHtml(directCategoryLink.desc || "Direct category link") : `${summary.subcategoryCount} subcategories · ${summary.linkCount} links`}</div>
              </div>
            </div>
          </button>
          <div class="category-card-actions">
            ${typeof openCategoryEditor === "function" ? `<button class="mini-icon-btn edit-action" onclick="openCategoryEditor('${escapeJs(summary.category)}')" title="Edit category">Edit</button>` : ""}
            ${typeof openLinkEditor === "function" ? `<button class="mini-icon-btn edit-action" onclick="openLinkEditor('${escapeJs(summary.category)}','','')" title="Add main link">+ Main</button>` : ""}
            ${typeof openSubcategoryEditor === "function" ? `<button class="mini-icon-btn edit-action" onclick="openSubcategoryEditor('${escapeJs(summary.category)}')" title="Add subcategory">+ Sub</button>` : ""}
            ${typeof deleteCategoryGui === "function" ? `<button class="mini-icon-btn edit-action" onclick="deleteCategoryGui('${escapeJs(summary.category)}')" title="Delete category">Delete</button>` : ""}
            <div class="category-toggle-indicator">${summary.isDirectCategory ? "Open" : (isOpen ? "Hide" : "Open")}</div>
          </div>
        </div>
        <div class="category-card-body">
          ${summary.directLinks.length ? `
            <div class="direct-links-panel">
              <div class="direct-links-title">Main Links</div>
              <div class="service-link-grid">
                ${summary.directLinks.map(link => renderDirectLinkItem(summary, link)).join("")}
              </div>
            </div>
          ` : ""}
          <div class="subcategory-stack">
            ${summary.subcategories.map(([subcategory, links]) => `
              <div class="subcategory-card ${isSubcategoryOpen(summary.category, subcategory) ? "open" : ""}">
                <div class="subcategory-head">
                  <button class="subcategory-toggle" onclick="toggleSubcategory('${escapeJs(summary.category)}','${escapeJs(subcategory)}')">
                    <div>
                      <div class="subcategory-name">${escapeHtml(subcategory)}</div>
                      <div class="subcategory-count">${links.length} links</div>
                    </div>
                    <div class="subcategory-toggle-indicator">${isSubcategoryOpen(summary.category, subcategory) ? "Hide" : "Open"}</div>
                  </button>
                  <div class="subcategory-head-actions">
                    ${typeof openSubcategoryEditor === "function" ? `<button class="mini-icon-btn edit-action" onclick="openSubcategoryEditor('${escapeJs(summary.category)}','${escapeJs(subcategory)}')" title="Rename subcategory">Edit</button>` : ""}
                    ${typeof openLinkEditor === "function" ? `<button class="mini-icon-btn edit-action" onclick="openLinkEditor('${escapeJs(summary.category)}','${escapeJs(subcategory)}','')" title="Add link">+ Link</button>` : ""}
                    ${typeof deleteSubcategoryGui === "function" ? `<button class="mini-icon-btn edit-action" onclick="deleteSubcategoryGui('${escapeJs(summary.category)}','${escapeJs(subcategory)}')" title="Delete subcategory">Delete</button>` : ""}
                  </div>
                </div>
                <div class="subcategory-body">
                  <div class="service-link-grid">
                    ${links.map(link => renderServiceLinkItem(summary, subcategory, link)).join("")}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>
    `;
  }).join("");
}

function renderDirectLinkItem(summary, link) {
  const item = {
    ...link,
    category: summary.category,
    subcategory: "",
    color: summary.color,
    isDirect: true
  };
  const key = makeServiceKey(item);
  return `<div class="service-link-item direct-link-item">
    <button class="service-link-button" onclick="openServiceLink('${escapeJs(link.url)}','${escapeJs(link.name)}','${escapeJs(summary.category)}','')">
      <span class="service-link-button-title">${escapeHtml(link.name)}</span>
      <span class="service-link-button-subtitle">${escapeHtml(link.desc || "Main category link")}</span>
    </button>
    <div class="service-link-actions">
      ${typeof openLinkEditor === "function" ? `<button class="mini-icon-btn edit-action" onclick="openLinkEditor('${escapeJs(summary.category)}','','${escapeJs(link.url)}')" title="Edit link">Edit</button>` : ""}
      ${typeof deleteLinkGui === "function" ? `<button class="mini-icon-btn edit-action" onclick="deleteLinkGui('${escapeJs(summary.category)}','','${escapeJs(link.url)}')" title="Delete link">Delete</button>` : ""}
      <button class="mini-icon-btn ${isFavourite(item) ? "fav-on" : ""}" onclick="toggleFavouriteByKey('${escapeJs(key)}')" title="Favourite">${isFavourite(item) ? "Saved" : "Save"}</button>
    </div>
  </div>`;
}

function renderServiceLinkItem(summary, subcategory, link) {
  const item = {
    ...link,
    category: summary.category,
    subcategory,
    color: summary.color
  };
  const key = makeServiceKey(item);
  return `<div class="service-link-item">
    <button class="service-link-button" onclick="openServiceLink('${escapeJs(link.url)}','${escapeJs(link.name)}','${escapeJs(summary.category)}','${escapeJs(subcategory)}')">
      <span class="service-link-button-title">${escapeHtml(link.name)}</span>
      <span class="service-link-button-subtitle">${escapeHtml(link.desc || subcategory)}</span>
    </button>
    <div class="service-link-actions">
      ${typeof openLinkEditor === "function" ? `<button class="mini-icon-btn edit-action" onclick="openLinkEditor('${escapeJs(summary.category)}','${escapeJs(subcategory)}','${escapeJs(link.url)}')" title="Edit link">Edit</button>` : ""}
      ${typeof deleteLinkGui === "function" ? `<button class="mini-icon-btn edit-action" onclick="deleteLinkGui('${escapeJs(summary.category)}','${escapeJs(subcategory)}','${escapeJs(link.url)}')" title="Delete link">Delete</button>` : ""}
      <button class="mini-icon-btn ${isFavourite(item) ? "fav-on" : ""}" onclick="toggleFavouriteByKey('${escapeJs(key)}')" title="Favourite">${isFavourite(item) ? "Saved" : "Save"}</button>
    </div>
  </div>`;
}

function focusCategory(category) {
  activeCategoryKey = activeCategoryKey === category ? null : category;
  renderCategoryChips();
  renderCategoryCards();
  const card = qs(`#${categoryDomId(category)}`);
  if (card && activeCategoryKey === category) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function makeSubcategoryKey(category, subcategory) {
  return `${category}|||${subcategory}`;
}

function isSubcategoryOpen(category, subcategory) {
  return !!openSubcategoryKeys[makeSubcategoryKey(category, subcategory)];
}

function toggleSubcategory(category, subcategory) {
  const key = makeSubcategoryKey(category, subcategory);
  openSubcategoryKeys[key] = !openSubcategoryKeys[key];
  renderCategoryCards();
}

function categoryDomId(category) {
  return `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function escapeJs(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

renderServices = function () {
  renderStats();
  renderCategoryChips();
  renderRecentLinks();
  renderFavouriteLinks();
  renderSearchResults(qs("#global-search") ? qs("#global-search").value : "");
  renderCategoryCards();
};

onGlobalSearch = function (value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    showView("services");
    renderSearchResults(value);
  }, 80);
};


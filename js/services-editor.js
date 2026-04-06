const serviceEditorState = {
  mode: "category",
  categoryKey: "",
  originalSubcategory: "",
  originalUrl: ""
};

function openCategoryEditor(categoryKey = "") {
  if (!EDIT_MODE) {
    toast("Turn on edit mode first", "warn");
    return;
  }

  serviceEditorState.mode = "category";
  serviceEditorState.categoryKey = categoryKey || "";
  serviceEditorState.originalSubcategory = "";
  serviceEditorState.originalUrl = "";

  const category = categoryKey ? DATA[categoryKey] : null;
  qs("#service-editor-title").textContent = category ? "Edit Category" : "Add Category";
  qs("#service-editor-location").textContent = category ? categoryKey : "New top-level category";
  qs("#service-editor-location-wrap").style.display = category ? "flex" : "none";

  qs("#service-editor-category-name").value = categoryKey || "";
  qs("#service-editor-category-icon").value = category?._icon || "";
  qs("#service-editor-category-color").value = normalizeColor(category?._color || "#3b82f6");

  toggleEditorSections("category");
  showOv("service-editor-ov");
}

function openSubcategoryEditor(categoryKey, subcategory = "") {
  if (!EDIT_MODE) {
    toast("Turn on edit mode first", "warn");
    return;
  }

  serviceEditorState.mode = "subcategory";
  serviceEditorState.categoryKey = categoryKey;
  serviceEditorState.originalSubcategory = subcategory || "";
  serviceEditorState.originalUrl = "";

  qs("#service-editor-title").textContent = subcategory ? "Edit Subcategory" : "Add Subcategory";
  qs("#service-editor-location").textContent = categoryKey;
  qs("#service-editor-location-wrap").style.display = "flex";
  qs("#service-editor-subcategory-name").value = subcategory || "";

  toggleEditorSections("subcategory");
  showOv("service-editor-ov");
}

function openLinkEditor(categoryKey, subcategory = "", url = "") {
  if (!EDIT_MODE) {
    toast("Turn on edit mode first", "warn");
    return;
  }

  const category = DATA[categoryKey];
  if (!category) return;

  serviceEditorState.mode = "link";
  serviceEditorState.categoryKey = categoryKey;
  serviceEditorState.originalSubcategory = subcategory || "";
  serviceEditorState.originalUrl = url || "";

  let link = null;
  if (url) {
    if (!subcategory) {
      link = (category._links || []).find(item => item.url === url) || null;
    } else {
      link = (category[subcategory] || []).find(item => item.url === url) || null;
    }
  }

  qs("#service-editor-title").textContent = link ? "Edit Link" : "Add Link";
  qs("#service-editor-location").textContent = subcategory ? `${categoryKey} / ${subcategory}` : `${categoryKey} / Main Links`;
  qs("#service-editor-location-wrap").style.display = "flex";
  populateLinkSubcategorySelect(categoryKey, subcategory);
  qs("#service-editor-link-name").value = link?.name || "";
  qs("#service-editor-link-url").value = link?.url || "";
  qs("#service-editor-link-desc").value = link?.desc || "";
  qs("#service-editor-link-keywords").value = Array.isArray(link?.keywords) ? link.keywords.join(", ") : "";

  toggleEditorSections("link");
  showOv("service-editor-ov");
}

function toggleEditorSections(mode) {
  qs("#service-editor-category-fields").style.display = mode === "category" ? "block" : "none";
  qs("#service-editor-subcategory-fields").style.display = mode === "subcategory" ? "block" : "none";
  qs("#service-editor-link-fields").style.display = mode === "link" ? "block" : "none";
}

function populateLinkSubcategorySelect(categoryKey, selectedSubcategory = "") {
  const select = qs("#service-editor-link-subcategory");
  const category = DATA[categoryKey];
  const options = ['<option value="">Main category links</option>'];
  Object.entries(category).forEach(([key, value]) => {
    if (key.startsWith("_") || !Array.isArray(value)) return;
    options.push(`<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`);
  });
  select.innerHTML = options.join("");
  select.value = selectedSubcategory || "";
}

function saveServiceEditor() {
  if (serviceEditorState.mode === "category") {
    saveCategoryEditor();
    return;
  }
  if (serviceEditorState.mode === "subcategory") {
    saveSubcategoryEditor();
    return;
  }
  saveLinkEditor();
}

function saveCategoryEditor() {
  const oldKey = serviceEditorState.categoryKey;
  const newKey = qs("#service-editor-category-name").value.trim();
  const icon = qs("#service-editor-category-icon").value.trim();
  const color = qs("#service-editor-category-color").value || "#3b82f6";

  if (!newKey) {
    toast("Enter a category name", "warn");
    return;
  }
  if (oldKey !== newKey && DATA[newKey]) {
    toast("A category with that name already exists", "warn");
    return;
  }

  const base = oldKey && DATA[oldKey]
    ? JSON.parse(JSON.stringify(DATA[oldKey]))
    : { _icon: "", _color: "#3b82f6" };

  base._icon = icon;
  base._color = color;

  if (oldKey && oldKey !== newKey) delete DATA[oldKey];
  DATA[newKey] = base;
  if (!oldKey || oldKey !== newKey) {
    DATA = reorderObjectWithKey(DATA, newKey);
  }

  saveState();
  closeOv("service-editor-ov");
  activeCategoryKey = newKey;
  renderServices();
  toast(oldKey ? "Category updated" : "Category added", "ok");
}

function saveSubcategoryEditor() {
  const categoryKey = serviceEditorState.categoryKey;
  const oldSubcategory = serviceEditorState.originalSubcategory;
  const newSubcategory = qs("#service-editor-subcategory-name").value.trim();
  const category = DATA[categoryKey];

  if (!newSubcategory) {
    toast("Enter a subcategory name", "warn");
    return;
  }
  if (oldSubcategory !== newSubcategory && category[newSubcategory]) {
    toast("That subcategory already exists", "warn");
    return;
  }

  const links = oldSubcategory && Array.isArray(category[oldSubcategory])
    ? category[oldSubcategory]
    : [];

  if (oldSubcategory && oldSubcategory !== newSubcategory) delete category[oldSubcategory];
  category[newSubcategory] = links;
  saveState();
  closeOv("service-editor-ov");
  activeCategoryKey = categoryKey;
  renderServices();
  toast(oldSubcategory ? "Subcategory updated" : "Subcategory added", "ok");
}

function saveLinkEditor() {
  const categoryKey = serviceEditorState.categoryKey;
  const oldSubcategory = serviceEditorState.originalSubcategory;
  const oldUrl = serviceEditorState.originalUrl;
  const targetSubcategory = qs("#service-editor-link-subcategory").value;
  const name = qs("#service-editor-link-name").value.trim();
  const url = qs("#service-editor-link-url").value.trim();
  const desc = qs("#service-editor-link-desc").value.trim();
  const keywords = qs("#service-editor-link-keywords").value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  if (!name || !url) {
    toast("Enter link name and URL", "warn");
    return;
  }

  const category = DATA[categoryKey];
  const link = { name, url, desc, keywords };

  if (oldUrl) {
    const oldBucket = getLinkBucket(category, oldSubcategory);
    const index = oldBucket.findIndex(item => item.url === oldUrl);
    if (index >= 0) oldBucket.splice(index, 1);
  }

  const newBucket = getLinkBucket(category, targetSubcategory, true);
  const existingIndex = newBucket.findIndex(item => item.url === url);
  if (existingIndex >= 0) newBucket.splice(existingIndex, 1, link);
  else newBucket.push(link);

  saveState();
  closeOv("service-editor-ov");
  activeCategoryKey = categoryKey;
  renderServices();
  toast(oldUrl ? "Link updated" : "Link added", "ok");
}

function deleteCategoryGui(categoryKey) {
  if (!EDIT_MODE) return;
  if (!confirm(`Delete category "${categoryKey}" and all its links?`)) return;
  delete DATA[categoryKey];
  if (activeCategoryKey === categoryKey) activeCategoryKey = null;
  saveState();
  renderServices();
  toast("Category deleted", "warn");
}

function deleteSubcategoryGui(categoryKey, subcategory) {
  if (!EDIT_MODE) return;
  if (!confirm(`Delete subcategory "${subcategory}" from "${categoryKey}"?`)) return;
  delete DATA[categoryKey][subcategory];
  saveState();
  activeCategoryKey = categoryKey;
  renderServices();
  toast("Subcategory deleted", "warn");
}

function deleteLinkGui(categoryKey, subcategory, url) {
  if (!EDIT_MODE) return;
  if (!confirm("Delete this link?")) return;
  const bucket = getLinkBucket(DATA[categoryKey], subcategory);
  const index = bucket.findIndex(item => item.url === url);
  if (index >= 0) bucket.splice(index, 1);
  saveState();
  activeCategoryKey = categoryKey;
  renderServices();
  toast("Link deleted", "warn");
}

function getLinkBucket(category, subcategory, createIfMissing = false) {
  if (!subcategory) {
    if (!Array.isArray(category._links) && createIfMissing) category._links = [];
    return Array.isArray(category._links) ? category._links : [];
  }
  if (!Array.isArray(category[subcategory]) && createIfMissing) category[subcategory] = [];
  return Array.isArray(category[subcategory]) ? category[subcategory] : [];
}

function reorderObjectWithKey(obj, pinnedKey) {
  const next = {};
  if (Object.prototype.hasOwnProperty.call(obj, pinnedKey)) next[pinnedKey] = obj[pinnedKey];
  Object.keys(obj).forEach(key => {
    if (key !== pinnedKey) next[key] = obj[key];
  });
  return next;
}

function normalizeColor(value) {
  const test = document.createElement("input");
  test.type = "color";
  test.value = "#3b82f6";
  try {
    test.value = value;
  } catch {
    test.value = "#3b82f6";
  }
  return test.value || "#3b82f6";
}

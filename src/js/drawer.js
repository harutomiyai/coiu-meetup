import { tagCategories } from "./state.js";

let _activeTopics = [];

const renderDrawerTags = () => {
  const list = document.getElementById("drawer-tag-list");
  if (!list) return;
  const tags = tagCategories.length
    ? tagCategories.map((c) => c.label)
    : [];
  list.innerHTML = tags.map((tag) => `
    <button
      class="nav-drawer-tag${_activeTopics.includes(tag) ? " is-active" : ""}"
      type="button"
      data-drawer-tag="${tag}"
    >${tag}</button>
  `).join("");
};

export const openDrawer = () => {
  const drawer = document.getElementById("nav-drawer");
  const btn = document.getElementById("hamburger-btn");
  if (!drawer) return;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  btn?.classList.add("is-open");
  btn?.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  renderDrawerTags();
  window.setTimeout(() => {
    document.getElementById("drawer-search-input")?.focus();
  }, 300);
};

export const closeDrawer = () => {
  const drawer = document.getElementById("nav-drawer");
  const btn = document.getElementById("hamburger-btn");
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  btn?.classList.remove("is-open");
  btn?.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
};

export const syncDrawerTopics = (activeTopics = []) => {
  _activeTopics = activeTopics;
  renderDrawerTags();
};

export const bindDrawerEvents = ({ onTagClick, onSearchInput, onSearchSubmit } = {}) => {
  document.getElementById("hamburger-btn")?.addEventListener("click", openDrawer);
  document.getElementById("nav-drawer-close")?.addEventListener("click", closeDrawer);
  document.getElementById("nav-drawer-backdrop")?.addEventListener("click", closeDrawer);

  document.querySelector(".nav-drawer-nav")?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeDrawer();
  });

  document.getElementById("nav-drawer")?.addEventListener("click", (event) => {
    const tagBtn = event.target.closest("[data-drawer-tag]");
    if (!tagBtn) return;
    const tag = tagBtn.dataset.drawerTag;

    if (_activeTopics.includes(tag)) {
      _activeTopics = _activeTopics.filter((t) => t !== tag);
    } else {
      _activeTopics = [..._activeTopics, tag];
    }

    renderDrawerTags();

    if (onTagClick) {
      onTagClick(tag);
      window.setTimeout(() => closeDrawer(), 200);
    } else {
      // search.html へ遷移
      const params = new URLSearchParams();
      const q = document.getElementById("drawer-search-input")?.value ?? "";
      if (q) params.set("q", q);
      _activeTopics.forEach((t) => params.append("tag", t));
      const qs = params.toString();
      location.href = `/students.html${qs ? `?${qs}` : ""}`;
    }
  });

  const searchInput = document.getElementById("drawer-search-input");
  let isComposing = false;

  searchInput?.addEventListener("compositionstart", () => { isComposing = true; });
  searchInput?.addEventListener("compositionend", (event) => {
    isComposing = false;
    onSearchInput?.(event.currentTarget.value);
  });
  searchInput?.addEventListener("input", (event) => {
    if (!isComposing) onSearchInput?.(event.currentTarget.value);
  });

  // Enterキーで検索実行（フォームsubmitで処理されるので不要だが念のため除外）

  // 検索ボタン（フォームsubmit対応）
  document.getElementById("drawer-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = searchInput?.value ?? "";
    if (onSearchSubmit) {
      onSearchSubmit(value);
    } else {
      // search.html へ遷移（index/about/coiu ページ用）
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      _activeTopics.forEach((t) => params.append("tag", t));
      const qs = params.toString();
      location.href = `/students.html${qs ? `?${qs}` : ""}`;
    }
    closeDrawer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
};

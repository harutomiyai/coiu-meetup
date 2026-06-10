const TAGS = ["AI", "地域", "デザイン", "起業", "教育", "プログラミング", "問い", "活動公開"];

let _activeTopics = [];

const renderDrawerTags = () => {
  const list = document.getElementById("drawer-tag-list");
  if (!list) return;
  list.innerHTML = TAGS.map((tag) => `
    <button
      class="nav-drawer-tag${_activeTopics.includes(tag) ? " is-active" : ""}"
      type="button"
      data-drawer-tag="${tag}"
    >#${tag}</button>
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
    onTagClick?.(tag);

    // タグ選択後にドロワーを閉じて結果を表示
    window.setTimeout(() => closeDrawer(), 200);
  });

  const searchInput = document.getElementById("drawer-search-input");

  searchInput?.addEventListener("input", (event) => {
    onSearchInput?.(event.currentTarget.value);
  });

  // Enterキーで検索実行・ドロワーを閉じる
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      onSearchSubmit?.(event.currentTarget.value);
      closeDrawer();
    }
  });

  // 検索ボタン（フォームsubmit対応）
  document.getElementById("drawer-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = searchInput?.value ?? "";
    onSearchSubmit?.(value);
    closeDrawer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
};

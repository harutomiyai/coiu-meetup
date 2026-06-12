import "./css/main.css";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
inject();
injectSpeedInsights();
import { loadStudents, loadTagCategories } from "./js/data.js";
import { students, state, tagCategories, getParentTagsForStudent } from "./js/state.js";
import { escapeHtml } from "./js/render.js";
import { bindDrawerEvents } from "./js/drawer.js";

// ── URL params ──────────────────────────────────────────────

const getParams = () => {
  const p = new URLSearchParams(location.search);
  return {
    q: p.get("q") || "",
    tags: p.getAll("tag"),
  };
};

const pushParams = (q, tags) => {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  tags.forEach((t) => p.append("tag", t));
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
};

// ── Filter ──────────────────────────────────────────────────

const normalizeText = (v) => String(v || "").trim().toLowerCase();

const getSearchText = (student) =>
  [
    student.name,
    student.catch,
    student.currentProject,
    student.projectDetail,
    student.oneOnOneMessage,
    student.currentQuestion,
    student.story,
    ...(Array.isArray(student.tags) ? student.tags : []),
    ...getParentTagsForStudent(student),
  ]
    .map(normalizeText)
    .join(" ");

const filterStudents = (q, tags) => {
  const query = normalizeText(q);
  return students.filter((s) => {
    const matchQuery = !query || getSearchText(s).includes(query);
    const parentTags = getParentTagsForStudent(s);
    const matchTags = tags.length === 0 || tags.every((t) => parentTags.includes(t));
    return matchQuery && matchTags;
  });
};

// ── Render ──────────────────────────────────────────────────

const renderImage = (student) =>
  student.image
    ? `<img class="feature-card-image" src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" loading="lazy" />`
    : `<span class="image-fallback feature-card-image">${escapeHtml(student.name)}</span>`;

const renderTags = (tags = []) =>
  (Array.isArray(tags) ? tags : [])
    .slice(0, 4)
    .map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`)
    .join("");

const getArchiveNumber = (student) => {
  const idx = students.findIndex((s) => s.slug === student.slug);
  return String(idx >= 0 ? idx + 1 : 0).padStart(3, "0");
};

const personCard = (student) => {
  const num = getArchiveNumber(student);
  const keyLine = student.currentQuestion || student.catch || student.currentProject || "問いを準備中";
  const lead = (() => {
    const first = String(student.story || "").split("。").find(Boolean);
    return first ? `${first}。` : student.projectDetail || keyLine;
  })();
  return `
    <a class="feature-card" href="/students/${escapeHtml(student.slug)}.html"
       aria-label="${escapeHtml(student.name)}さんの詳細を見る">
      <span class="feature-card-place">CoIU / ${escapeHtml(student.generation || "")}</span>
      <span class="feature-card-badge">${num}</span>
      <span class="feature-card-number">archive ${num}</span>
      <span class="feature-card-image-wrap">${renderImage(student)}</span>
      <span class="feature-card-body">
        <span class="feature-card-title">${escapeHtml(student.name)}</span>
        <span class="feature-card-question">${escapeHtml(keyLine)}</span>
        <span class="feature-card-copy">${escapeHtml(lead)}</span>
        <span class="tag-row">${renderTags(student.tags)}</span>
        <span class="read-more">Read more</span>
      </span>
    </a>
  `;
};

let currentQ = "";
let currentTags = [];

const renderTagFilter = () => {
  const el = document.getElementById("search-page-tags");
  if (!el) return;
  const tags = tagCategories.map((c) => c.label);
  el.innerHTML = tags.map((tag) => `
    <button class="search-page-tag${currentTags.includes(tag) ? " is-active" : ""}"
      type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
  `).join("");
};

const renderResults = () => {
  const grid = document.getElementById("people-grid");
  const count = document.getElementById("search-page-count");
  const empty = document.getElementById("search-page-empty");
  const title = document.getElementById("search-page-title");
  const input = document.getElementById("search-page-input");

  if (!grid) return;

  const results = filterStudents(currentQ, currentTags);

  // タイトル更新
  if (currentQ && currentTags.length) {
    title.textContent = `「${currentQ}」+ ${currentTags.map((t) => `#${t}`).join(" ")} の結果`;
  } else if (currentQ) {
    title.textContent = `「${currentQ}」の検索結果`;
  } else if (currentTags.length) {
    title.textContent = `${currentTags.map((t) => `#${t}`).join(" ")} の検索結果`;
  } else {
    title.textContent = "すべてのCoIU生";
  }

  // 入力欄に反映
  if (input && input.value !== currentQ) input.value = currentQ;

  // カウント
  if (count) count.textContent = `${results.length} 件`;

  // グリッド
  grid.innerHTML = results.map(personCard).join("");

  // 空
  if (empty) empty.hidden = results.length > 0;
};

const update = (q, tags) => {
  currentQ = q;
  currentTags = tags;
  pushParams(q, tags);
  renderTagFilter();
  renderResults();
};

// ── Events ──────────────────────────────────────────────────

const bindEvents = () => {
  // ページ内フォーム
  document.getElementById("search-page-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("search-page-input")?.value ?? "";
    update(q, currentTags);
  });

  const pageInput = document.getElementById("search-page-input");
  let isComposing = false;

  pageInput?.addEventListener("compositionstart", () => { isComposing = true; });
  pageInput?.addEventListener("compositionend", (e) => {
    isComposing = false;
    update(e.currentTarget.value, currentTags);
  });
  pageInput?.addEventListener("input", (e) => {
    if (!isComposing) update(e.currentTarget.value, currentTags);
  });

  // タグフィルター
  document.getElementById("search-page-tags")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tag]");
    if (!btn) return;
    const tag = btn.dataset.tag;
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    update(currentQ, next);
  });

  // ドロワーからの検索 → このページ内で結果更新
  bindDrawerEvents({
    onTagClick: (tag) => {
      const next = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      update(currentQ, next);
    },
    onSearchInput: (value) => update(value, currentTags),
    onSearchSubmit: (value) => update(value, currentTags),
  });
};

// ── Init ────────────────────────────────────────────────────

const init = async () => {
  await Promise.all([loadStudents(), loadTagCategories()]);

  const params = getParams();
  currentQ = params.q;
  currentTags = params.tags;

  // ドロワー入力欄に初期値を反映
  const drawerInput = document.getElementById("drawer-search-input");
  if (drawerInput && currentQ) drawerInput.value = currentQ;

  renderTagFilter();
  renderResults();
  bindEvents();
};

init();

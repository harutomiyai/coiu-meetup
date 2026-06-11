import "./css/main.css";
import { loadStudents, loadProjects, loadTagCategories } from "./js/data.js";
import { students, state, tagCategories, getParentTagsForStudent } from "./js/state.js";
import { escapeHtml, renderStudentDetail, renderProjectDetail } from "./js/render.js";
import { bindDrawerEvents } from "./js/drawer.js";
import { getProjectBySlug } from "./js/state.js";

// ── URL params ──────────────────────────────────────────────

const getParams = () => {
  const p = new URLSearchParams(location.search);
  return { q: p.get("q") || "", tags: p.getAll("tag") };
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

// ── Render helpers ──────────────────────────────────────────

const renderImage = (student) =>
  student.image
    ? `<img class="feature-card-image" src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" loading="lazy" />`
    : `<span class="image-fallback feature-card-image">${escapeHtml(student.name)}</span>`;

const renderTags = (tags = []) =>
  (Array.isArray(tags) ? tags : []).slice(0, 4)
    .map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("");

const getGenerationLabel = (student) => student.generation || "1期生";

const personCard = (student) => {
  const keyLine = student.currentQuestion || student.catch || student.currentProject || "問いを準備中";
  return `
    <a class="feature-card" href="#student/${escapeHtml(student.slug)}"
       aria-label="${escapeHtml(student.name)}さんの詳細を見る">
      <span class="feature-card-image-wrap">${renderImage(student)}</span>
      <span class="feature-card-body">
        <span class="feature-card-title">${escapeHtml(student.name)}</span>
        <span class="feature-card-question">${escapeHtml(keyLine)}</span>
      </span>
    </a>
  `;
};

// ── Tag filter ──────────────────────────────────────────────

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

// ── Results ─────────────────────────────────────────────────

const renderResults = () => {
  const grid = document.getElementById("people-grid");
  const count = document.getElementById("search-page-count");
  const empty = document.getElementById("search-page-empty");
  const title = document.getElementById("search-page-title");
  const input = document.getElementById("search-page-input");
  if (!grid) return;

  const results = filterStudents(currentQ, currentTags);

  if (currentQ && currentTags.length) {
    title.textContent = `「${currentQ}」+ ${currentTags.map((t) => `#${t}`).join(" ")} の結果`;
  } else if (currentQ) {
    title.textContent = `「${currentQ}」の検索結果`;
  } else if (currentTags.length) {
    title.textContent = `${currentTags.map((t) => `#${t}`).join(" ")} の検索結果`;
  } else {
    title.textContent = "CoIU生を探す";
  }

  if (input && input.value !== currentQ) input.value = currentQ;
  if (count) count.textContent = `${results.length} 件`;
  grid.innerHTML = results.map(personCard).join("");
  if (empty) empty.hidden = results.length > 0;
};

const update = (q, tags) => {
  currentQ = q;
  currentTags = tags;
  pushParams(q, tags);
  renderTagFilter();
  renderResults();
};

// ── Student detail view ──────────────────────────────────────

const studentView = document.getElementById("student-view");
const searchView = document.querySelector(".search-page--students");

const showDetail = (slug) => {
  const student = students.find((s) => s.slug === slug);
  if (!student) { showList(); return; }
  renderStudentDetail(student);
  if (searchView) searchView.hidden = true;
  if (studentView) { studentView.hidden = false; }
  window.scrollTo({ top: 0, behavior: "auto" });
};

const showProjectDetail = (slug) => {
  const project = getProjectBySlug(slug);
  if (!project) { showList(); return; }
  renderProjectDetail(project);
  if (searchView) searchView.hidden = true;
  if (studentView) { studentView.hidden = false; }
  window.scrollTo({ top: 0, behavior: "auto" });
};

const showList = () => {
  if (searchView) searchView.hidden = false;
  if (studentView) studentView.hidden = true;
};

const handleRoute = () => {
  const hash = location.hash.replace(/^#/, "");
  if (hash.startsWith("student/")) {
    showDetail(hash.replace("student/", ""));
  } else if (hash.startsWith("project/")) {
    showProjectDetail(hash.replace("project/", ""));
  } else {
    showList();
  }
};

// ── Events ──────────────────────────────────────────────────

const bindEvents = () => {
  // ページ内フォーム submit
  document.getElementById("search-page-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    update(document.getElementById("search-page-input")?.value ?? "", currentTags);
  });

  // ページ内入力（IME対応）
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

  // ドロワー（このページ内で結果更新）
  bindDrawerEvents({
    onTagClick: (tag) => {
      const next = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      update(currentQ, next);
    },
    onSearchInput: (value) => update(value, currentTags),
    onSearchSubmit: (value) => { update(value, currentTags); showList(); },
  });

  // 詳細カードクリック → hash 変更
  window.addEventListener("hashchange", handleRoute);

  // 詳細ビュー内の「戻る」リンク
  document.addEventListener("click", (e) => {
    if (e.target.closest(".back-link")) {
      e.preventDefault();
      history.pushState(null, "", location.pathname + (location.search || ""));
      showList();
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  });
};

// ── Init ────────────────────────────────────────────────────

const init = async () => {
  await Promise.all([loadStudents(), loadProjects(), loadTagCategories()]);

  const params = getParams();
  currentQ = params.q;
  currentTags = params.tags;

  const drawerInput = document.getElementById("drawer-search-input");
  if (drawerInput && currentQ) drawerInput.value = currentQ;

  renderTagFilter();
  renderResults();
  bindEvents();
  handleRoute();
};

init();

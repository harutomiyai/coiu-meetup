import "./css/main.css";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
inject();
injectSpeedInsights();
import { loadAll } from "./js/data.js";
import { projects, tagCategories } from "./js/state.js";
import { escapeHtml, renderProjectDetail } from "./js/render.js";
import { getProjectBySlug } from "./js/state.js";
import { bindDrawerEvents } from "./js/drawer.js";

const CELL_COLORS = [
  "#ffffff",
];

const buildGridCell = (project, index) => {
  const img = project.image ?? "";
  const num = String(index + 1).padStart(2, "0");
  const bg = CELL_COLORS[index % CELL_COLORS.length];

  return `
    <a
      class="project-grid-cell"
      href="/projects/${escapeHtml(project.slug)}.html"
      style="--cell-bg: ${bg}"
      aria-label="${escapeHtml(project.title)}の詳細を見る"
    >
      <span class="project-grid-num">${num}</span>
      <div class="project-grid-body">
        <h3 class="project-grid-title">${escapeHtml(project.title)}</h3>
        <p class="project-grid-summary">${escapeHtml(project.summary)}</p>
        <div class="project-grid-tags">
          ${(project.tags || []).slice(0, 3).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
      ${img
        ? `<img class="project-grid-img" src="${escapeHtml(img)}" alt="${escapeHtml(project.title)}" loading="lazy" />`
        : `<div class="project-grid-img project-grid-img--empty"></div>`
      }
    </a>
  `;
};

// ── Tag filter ────────────────────────────────────────────────

const VISIBLE_LIMIT = 5;
let currentParent = "";  // 選択中の親タグ label
let currentChild  = "";  // 選択中の子タグ
let tagsExpanded  = false;

const getParentTags = () => {
  const usedChildren = new Set();
  projects.forEach((p) => (p.tags || []).forEach((t) => usedChildren.add(t)));
  return tagCategories.filter((cat) =>
    cat.children.some((c) => usedChildren.has(c))
  );
};

const renderTagFilter = () => {
  const parentEl = document.getElementById("projects-page-tags");
  const childEl  = document.getElementById("projects-page-child-tags");
  if (!parentEl) return;

  // 親タグ行
  const parents = getParentTags();
  const visible = tagsExpanded ? parents : parents.slice(0, VISIBLE_LIMIT);
  const hasMore = parents.length > VISIBLE_LIMIT;

  const parentButtons = [
    `<button class="search-page-tag${!currentParent ? " is-active" : ""}" type="button" data-parent="">すべて</button>`,
    ...visible.map((cat) =>
      `<button class="search-page-tag${currentParent === cat.label ? " is-active" : ""}" type="button" data-parent="${escapeHtml(cat.label)}">${escapeHtml(cat.label)}</button>`
    ),
  ];
  if (hasMore) {
    parentButtons.push(
      `<button class="search-page-tag search-page-tag--more" type="button" data-action="toggle-tags">${tagsExpanded ? "閉じる ↑" : `もっと見る +${parents.length - VISIBLE_LIMIT}`}</button>`
    );
  }
  parentEl.innerHTML = parentButtons.join("");

  // 子タグ行
  if (!childEl) return;
  if (!currentParent) {
    childEl.hidden = true;
    childEl.innerHTML = "";
    return;
  }
  const cat = tagCategories.find((c) => c.label === currentParent);
  if (!cat) { childEl.hidden = true; return; }

  const usedChildren = new Set();
  projects.forEach((p) => (p.tags || []).forEach((t) => usedChildren.add(t)));
  const children = cat.children.filter((c) => usedChildren.has(c));

  childEl.hidden = false;
  childEl.innerHTML = children
    .map((c) =>
      `<button class="search-page-tag search-page-tag--child${currentChild === c ? " is-active" : ""}" type="button" data-child="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    )
    .join("");
};

const getFilteredProjects = () => {
  if (currentChild) {
    return projects.filter((p) => (p.tags || []).includes(currentChild));
  }
  if (currentParent) {
    const cat = tagCategories.find((c) => c.label === currentParent);
    if (!cat) return projects;
    return projects.filter((p) => (p.tags || []).some((t) => cat.children.includes(t)));
  }
  return projects;
};

// ── Results ──────────────────────────────────────────────────

const renderGrid = () => {
  const grid = document.getElementById("projects-grid");
  const empty = document.getElementById("projects-page-empty");
  if (!grid) return;

  const filtered = getFilteredProjects();
  grid.innerHTML = filtered.map((p, i) => buildGridCell(p, i)).join("");
  if (empty) empty.hidden = filtered.length > 0;
};

// ── Init ──────────────────────────────────────────────────────

const init = async () => {
  await loadAll();

  const listView = document.getElementById("projects-list-view");
  const detailView = document.getElementById("student-view");

  const showList = () => {
    if (listView) listView.hidden = false;
    if (detailView) detailView.hidden = true;
  };

  const showDetail = (slug) => {
    const project = getProjectBySlug(slug);
    if (!project) { showList(); return; }
    renderProjectDetail(project);
    if (listView) listView.hidden = true;
    if (detailView) detailView.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const handleRoute = () => {
    const hash = location.hash.replace(/^#/, "");
    if (hash.startsWith("project/")) {
      showDetail(hash.replace("project/", ""));
    } else {
      showList();
    }
  };

  renderTagFilter();
  renderGrid();

  const tagArea = document.getElementById("projects-page-tags");
  const childArea = document.getElementById("projects-page-child-tags");

  tagArea?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-parent], [data-action]");
    if (!btn) return;
    if (btn.dataset.action === "toggle-tags") {
      tagsExpanded = !tagsExpanded;
      renderTagFilter();
      return;
    }
    currentParent = btn.dataset.parent;
    currentChild  = "";
    renderTagFilter();
    renderGrid();
  });

  childArea?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-child]");
    if (!btn) return;
    currentChild = currentChild === btn.dataset.child ? "" : btn.dataset.child;
    renderTagFilter();
    renderGrid();
  });

  bindDrawerEvents({
    onSearchSubmit: (value) => {
      location.href = `/students.html${value ? `?q=${encodeURIComponent(value)}` : ""}`;
    },
  });

  window.addEventListener("hashchange", handleRoute);

  document.addEventListener("click", (e) => {
    if (e.target.closest(".back-link")) {
      e.preventDefault();
      history.pushState(null, "", location.pathname);
      showList();
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  });

  handleRoute();
};

init();

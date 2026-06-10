import "./css/main.css";
import { loadAll } from "./js/data.js";
import { projects } from "./js/state.js";
import { escapeHtml, renderProjectDetail } from "./js/render.js";
import { getMemberStudents, getProjectBySlug } from "./js/state.js";
import { bindDrawerEvents } from "./js/drawer.js";

const CELL_COLORS = [
  "#ffffff", "#fdf6e3", "#ffffff", "#eef6fb",
  "#ffffff", "#f3eeff", "#ffffff", "#edf7ee",
];

const buildGridCell = (project, index) => {
  const members = getMemberStudents(project);
  const img = members[0]?.image ?? "";
  const num = String(index + 1).padStart(2, "0");
  const bg = CELL_COLORS[index % CELL_COLORS.length];

  return `
    <a
      class="project-grid-cell"
      href="#project/${escapeHtml(project.slug)}"
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

let currentTag = "";

const getAllTags = () => {
  const set = new Set();
  projects.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
  return Array.from(set);
};

const renderTagFilter = () => {
  const el = document.getElementById("projects-page-tags");
  if (!el) return;
  const tags = getAllTags();
  el.innerHTML = [
    `<button class="search-page-tag${!currentTag ? " is-active" : ""}" type="button" data-tag="">すべて</button>`,
    ...tags.map((t) => `<button class="search-page-tag${currentTag === t ? " is-active" : ""}" type="button" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`),
  ].join("");
};

// ── Results ──────────────────────────────────────────────────

const renderGrid = () => {
  const grid = document.getElementById("projects-grid");
  const empty = document.getElementById("projects-page-empty");
  if (!grid) return;

  const filtered = currentTag
    ? projects.filter((p) => (p.tags || []).includes(currentTag))
    : projects;

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

  document.getElementById("projects-page-tags")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tag]");
    if (!btn) return;
    currentTag = btn.dataset.tag;
    renderTagFilter();
    renderGrid();
    history.replaceState(null, "", location.pathname);
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

import "./css/main.css";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
inject();
injectSpeedInsights();
import { loadAll } from "./js/data.js";
import { projects, tagCategories, getParentTag } from "./js/state.js";
import { escapeHtml, renderProjectDetail } from "./js/render.js";
import { getProjectBySlug } from "./js/state.js";
import { bindDrawerEvents } from "./js/drawer.js";

let currentParent = "";
let currentChild  = "";

const getParentTags = () => {
  const usedChildren = new Set();
  projects.forEach((p) => (p.tags || []).forEach((t) => usedChildren.add(t)));
  return tagCategories.filter((cat) =>
    cat.children.some((c) => usedChildren.has(c))
  );
};

const renderTagFilter = () => {
  const parentEl = document.getElementById("projects-page-tags");
  if (!parentEl) return;

  const parents = getParentTags();
  parentEl.innerHTML = [
    `<button class="search-page-tag${!currentParent ? " is-active" : ""}" type="button" data-parent="">すべて</button>`,
    ...parents.map((cat) =>
      `<button class="search-page-tag${currentParent === cat.label ? " is-active" : ""}" type="button" data-parent="${escapeHtml(cat.label)}">${escapeHtml(cat.label)}</button>`
    ),
  ].join("");
};

const getFilteredProjects = () => {
  if (currentChild) return projects.filter((p) => (p.tags || []).includes(currentChild));
  if (currentParent) {
    const cat = tagCategories.find((c) => c.label === currentParent);
    if (!cat) return projects;
    return projects.filter((p) => (p.tags || []).some((t) => cat.children.includes(t)));
  }
  return projects;
};

const renderGrid = () => {
  const grid  = document.getElementById("projects-grid");
  const empty = document.getElementById("projects-page-empty");
  const count = document.getElementById("projects-page-count");
  if (!grid) return;

  const filtered = getFilteredProjects();

  // render.js の projectCard を流用するため、renderProjectGrid を直接呼ばず
  // projects-grid に feature-card を直接埋め込む
  const toWebP = (src) => src ? src.replace(/\.(jpe?g|png)$/i, ".webp") : src;
  grid.innerHTML = filtered.map((project, index) => {
    const img = project.image ?? "";
    const num = String(index + 1).padStart(3, "0");
    return `
      <a
        class="feature-card"
        href="/projects/${escapeHtml(project.slug)}.html"
        aria-label="${escapeHtml(project.title)}の詳細を見る"
      >
        <span class="feature-card-place">CoIU Project</span>
        <span class="feature-card-badge">${num}</span>
        <span class="feature-card-image-wrap">
          ${img
            ? `<picture><source srcset="${escapeHtml(toWebP(img))}" type="image/webp" /><img class="feature-card-image" src="${escapeHtml(img)}" alt="${escapeHtml(project.title)}" loading="lazy" decoding="async" /></picture>`
            : `<span class="image-fallback feature-card-image">${escapeHtml(project.title[0])}</span>`
          }
        </span>
        <span class="feature-card-body">
          <span class="feature-card-title">${escapeHtml(project.title)}</span>
          <span class="feature-card-question">${escapeHtml(project.summary)}</span>
          <span class="read-more">Read more</span>
        </span>
      </a>
    `;
  }).join("");

  if (empty) empty.hidden = filtered.length > 0;
  if (count) count.textContent = `${filtered.length} 件`;
};

const init = async () => {
  await loadAll();

  const listView   = document.querySelector(".search-page--projects");
  const detailView = document.getElementById("student-view");

  const showList = () => {
    if (listView)   listView.hidden   = false;
    if (detailView) detailView.hidden = true;
  };

  const showDetail = (slug) => {
    const project = getProjectBySlug(slug);
    if (!project) { showList(); return; }
    renderProjectDetail(project);
    if (listView)   listView.hidden   = true;
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

  const urlTag = new URLSearchParams(location.search).get("tag");
  if (urlTag) {
    const parent = getParentTag(urlTag);
    if (parent) { currentParent = parent; currentChild = urlTag; }
    else { currentChild = urlTag; }
  }

  renderTagFilter();
  renderGrid();

  document.getElementById("projects-page-tags")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-parent]");
    if (!btn) return;
    currentParent = btn.dataset.parent;
    currentChild  = "";
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

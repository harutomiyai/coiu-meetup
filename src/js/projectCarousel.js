import { projects, getMemberStudents } from "./state.js";
import { escapeHtml } from "./render.js";

const CELL_COLORS = ["#ffffff"];

const buildGridCell = (project, index) => {
  const members = getMemberStudents(project);
  const img = project.image ?? members[0]?.image ?? "";
  const num = String(index + 1).padStart(2, "0");
  const bg = CELL_COLORS[index % CELL_COLORS.length];

  return `
    <a
      class="project-grid-cell"
      href="/students.html#project/${escapeHtml(project.slug)}"
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
      ${img ? `<img class="project-grid-img" src="${escapeHtml(img)}" alt="${escapeHtml(project.title)}" loading="lazy" />` : `<div class="project-grid-img project-grid-img--empty"></div>`}
    </a>
  `;
};

const HOME_PROJECT_LIMIT = 6;

export const initProjectCarousel = () => {
  const track = document.getElementById("project-carousel-track");
  if (!track || !projects.length) return;

  const visible = projects.slice(0, HOME_PROJECT_LIMIT);
  track.innerHTML = visible.map((p, i) => buildGridCell(p, i)).join("");

  const more = document.getElementById("project-carousel-more");
  if (more) more.hidden = projects.length <= HOME_PROJECT_LIMIT;
};

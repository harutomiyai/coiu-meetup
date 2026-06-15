import { projects, getMemberStudents, shuffled } from "./state.js";
import { escapeHtml } from "./render.js";

const toWebP = (src) => src ? src.replace(/\.(jpe?g|png)$/i, ".webp") : src;

const buildGridCell = (project, index) => {
  const members = getMemberStudents(project);
  const img = project.image ?? members[0]?.image ?? "";
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
};

const HOME_PROJECT_LIMIT = 6;

export const initProjectCarousel = () => {
  const track = document.getElementById("project-carousel-track");
  if (!track || !projects.length) return;

  const visible = shuffled(projects).slice(0, HOME_PROJECT_LIMIT);
  track.innerHTML = visible.map((p, i) => buildGridCell(p, i)).join("");

  const more = document.getElementById("project-carousel-more");
  if (more) more.hidden = false;
};

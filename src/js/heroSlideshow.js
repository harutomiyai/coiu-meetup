import { projects, getMemberStudents } from "./state.js";
import { escapeHtml } from "./render.js";

let current = 0;
let total = 0;
let timer = null;
let isTransitioning = false;
const GAP = 24;

const getSlides = () => projects.filter((p) => p.image);

const renderDots = (n) => {
  const dots = document.getElementById("hero-dots");
  if (!dots) return;
  dots.innerHTML = Array.from({ length: n }, (_, i) =>
    `<button class="hero-dot${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="${i + 1}枚目"></button>`
  ).join("");
};

const updateDots = () => {
  document.querySelectorAll(".hero-dot").forEach((el, i) => {
    el.classList.toggle("is-active", i === current);
  });
};

const updateActive = () => {
  document.querySelectorAll(".hero-slide").forEach((el) => {
    el.classList.toggle("is-active", Number(el.dataset.realIndex) === current);
  });
};

const getOffset = (vIdx) => {
  const track = document.getElementById("hero-slides");
  if (!track) return 0;
  const slideW = track.children[0]?.offsetWidth ?? 0;
  const containerW = track.parentElement.offsetWidth;
  return (containerW - slideW) / 2 - vIdx * (slideW + GAP);
};

const setPosition = (vIdx, animated) => {
  const track = document.getElementById("hero-slides");
  if (!track) return;
  track.style.transition = animated ? "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)" : "none";
  track.style.transform = `translateX(${getOffset(vIdx)}px)`;
};

const goNext = () => {
  if (isTransitioning) return;
  isTransitioning = true;
  const nextReal = (current + 1) % total;
  const targetV = current === total - 1 ? total + 1 : nextReal + 1;
  current = nextReal;
  updateActive();
  updateDots();
  setPosition(targetV, true);
  document.getElementById("hero-slides")?.addEventListener("transitionend", () => {
    setPosition(current + 1, false);
    isTransitioning = false;
  }, { once: true });
};

const goPrev = () => {
  if (isTransitioning) return;
  isTransitioning = true;
  const prevReal = ((current - 1) + total) % total;
  const targetV = current === 0 ? 0 : prevReal + 1;
  current = prevReal;
  updateActive();
  updateDots();
  setPosition(targetV, true);
  document.getElementById("hero-slides")?.addEventListener("transitionend", () => {
    setPosition(current + 1, false);
    isTransitioning = false;
  }, { once: true });
};

const startAuto = () => {
  clearInterval(timer);
  timer = setInterval(goNext, 5000);
};

const buildSlide = (project, originalIndex, realIndex) => {
  const members = getMemberStudents(project);
  const memberNames = members.map((m) => m.name).join(" / ");

  return `
    <a class="hero-slide${realIndex === 0 ? " is-active" : ""}" data-real-index="${realIndex}" href="/students.html#project/${escapeHtml(project.slug)}">
      <img class="hero-slide-img" src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" />
      <span class="hero-slide-num">Project ${String(originalIndex + 1).padStart(2, "0")}</span>
      <div class="hero-slide-card">
        ${memberNames ? `<p class="hero-slide-name">${escapeHtml(memberNames)}</p>` : ""}
        <h2 class="hero-slide-project">${escapeHtml(project.title)}</h2>
        <p class="hero-slide-summary">${escapeHtml(project.summary)}</p>
      </div>
    </a>
  `;
};

export const initHeroSlideshow = () => {
  const container = document.getElementById("hero-slides");
  if (!container) return;

  const list = getSlides();
  if (!list.length) return;
  total = list.length;

  container.innerHTML =
    buildSlide(list[total - 1], total - 1, -1) +
    list.map((p, i) => buildSlide(p, i, i)).join("") +
    buildSlide(list[0], 0, -2);

  container.children[0].classList.remove("is-active");
  container.children[container.children.length - 1].classList.remove("is-active");

  renderDots(total);

  requestAnimationFrame(() => setPosition(current + 1, false));

  document.getElementById("hero-prev")?.addEventListener("click", (e) => {
    e.preventDefault(); goPrev(); clearInterval(timer); startAuto();
  });
  document.getElementById("hero-next")?.addEventListener("click", (e) => {
    e.preventDefault(); goNext(); clearInterval(timer); startAuto();
  });
  document.getElementById("hero-dots")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-index]");
    if (!btn || isTransitioning) return;
    current = Number(btn.dataset.index);
    setPosition(current + 1, false);
    updateActive();
    updateDots();
    clearInterval(timer);
    startAuto();
  });

  window.addEventListener("resize", () => setPosition(current + 1, false));

  startAuto();
};

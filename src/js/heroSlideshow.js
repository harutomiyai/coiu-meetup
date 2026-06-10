import { students } from "./state.js";
import { escapeHtml } from "../js/render.js";

// スライド配列: [clone_last, 0, 1, ..., total-1, clone_first]
// virtualIndex = realIndex + 1
let current = 0;
let total = 0;
let timer = null;
let isTransitioning = false;
const GAP = 24;

const getSlides = () => students.filter((s) => s.image && s.currentProject);

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

const positionArrows = () => {
  const wrapper = document.getElementById("hero-slideshow");
  const track = document.getElementById("hero-slides");
  if (!wrapper || !track) return;
  const slideW = track.children[0]?.offsetWidth ?? 0;
  const containerW = wrapper.offsetWidth;
  const center = containerW / 2;
  const margin = 12;
  const btnW = 44;
  const prev = document.getElementById("hero-prev");
  const next = document.getElementById("hero-next");
  if (prev) prev.style.left = `${center - slideW / 2 - btnW - margin}px`;
  if (next) next.style.left = `${center + slideW / 2 + margin}px`;
};

const goNext = () => {
  if (isTransitioning) return;
  isTransitioning = true;

  const nextReal = (current + 1) % total;
  // クローン先頭（仮想 = total+1）へアニメーション、その後 nextReal へジャンプ
  const targetV = current === total - 1 ? total + 1 : nextReal + 1;

  // 先にアクティブ更新 → スケールとトランスレートを同時スタート
  current = nextReal;
  updateActive();
  updateDots();
  setPosition(targetV, true);

  const track = document.getElementById("hero-slides");
  track?.addEventListener("transitionend", () => {
    setPosition(current + 1, false); // ジャンプ（クローンから本体へ）
    isTransitioning = false;
  }, { once: true });
};

const goPrev = () => {
  if (isTransitioning) return;
  isTransitioning = true;

  const prevReal = ((current - 1) + total) % total;
  // クローン末尾（仮想 = 0）へアニメーション、その後 prevReal へジャンプ
  const targetV = current === 0 ? 0 : prevReal + 1;

  current = prevReal;
  updateActive();
  updateDots();
  setPosition(targetV, true);

  const track = document.getElementById("hero-slides");
  track?.addEventListener("transitionend", () => {
    setPosition(current + 1, false);
    isTransitioning = false;
  }, { once: true });
};

const startAuto = () => {
  clearInterval(timer);
  timer = setInterval(goNext, 4000);
};

const buildSlideHTML = (s, originalIndex, realIndex) => `
  <div class="hero-slide${realIndex === 0 ? " is-active" : ""}" data-real-index="${realIndex}">
    <img class="hero-slide-img" src="${escapeHtml(s.image)}" alt="${escapeHtml(s.name)}さんの写真" />
    <span class="hero-slide-num">Pickup ${String(originalIndex + 1).padStart(2, "0")}</span>
    <div class="hero-slide-card">
      <h2 class="hero-slide-project">${escapeHtml(s.currentProject)}</h2>
      <div class="hero-slide-tags">
        ${(s.tags || []).slice(0, 3).map((t) => `<span class="hero-slide-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
      <a class="hero-slide-link" href="/students.html#student/${escapeHtml(s.slug)}">詳しく見る →</a>
    </div>
  </div>
`;

export const initHeroSlideshow = () => {
  const container = document.getElementById("hero-slides");
  if (!container) return;

  const list = getSlides();
  if (!list.length) return;
  total = list.length;

  const last = list[total - 1];
  const first = list[0];
  container.innerHTML =
    buildSlideHTML(last, total - 1, -1) +
    list.map((s, i) => buildSlideHTML(s, i, i)).join("") +
    buildSlideHTML(first, 0, -2);

  renderDots(total);

  requestAnimationFrame(() => {
    setPosition(current + 1, false);
    positionArrows();
  });

  document.getElementById("hero-prev")?.addEventListener("click", () => {
    goPrev(); clearInterval(timer); startAuto();
  });
  document.getElementById("hero-next")?.addEventListener("click", () => {
    goNext(); clearInterval(timer); startAuto();
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

  window.addEventListener("resize", () => {
    setPosition(current + 1, false);
    positionArrows();
  });

  startAuto();
};

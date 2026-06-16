import { projects, getMemberStudents, shuffled } from "./state.js";
import { escapeHtml } from "./render.js";

const GAP = 24;
const DURATION = 600;
const INTERVAL = 5000;
const MOBILE_BP = 560;

const isMobile = () => window.innerWidth <= MOBILE_BP;

// 3セット複製: [clone-tail | originals | clone-head]
// current は originals 内のインデックス (0 〜 total-1)
// vIdx (virtual index) は実際の DOM 上の位置: total + current が中央セット

let total = 0;
let current = 0;
let vCurrent = 0; // DOM上の仮想インデックス (= total + current で初期化)
let timer = null;
let rafId = null;
let animStart = null;
let animFrom = 0;
let animTo = 0;

const getSlides = () => shuffled(projects.filter((p) => p.image));
const getTrack = () => document.getElementById("hero-slides");

let cachedSlideWidth = 0;
let cachedContainerWidth = 0;

const measureSizes = () => {
  const track = getTrack();
  if (!track) return;
  cachedSlideWidth = track.children[0]?.offsetWidth ?? 0;
  cachedContainerWidth = track.parentElement?.offsetWidth ?? 0;
};

// vIdx 番のスライドを画面中央に置くオフセット
const offsetFor = (vIdx) => {
  const sw = cachedSlideWidth;
  const cw = cachedContainerWidth;
  return (cw - sw) / 2 - vIdx * (sw + GAP);
};

const applyOffset = (x) => {
  const t = getTrack();
  if (!t) return;
  if (isMobile()) {
    t.style.transform = "";
    return;
  }
  t.style.transform = `translateX(${x}px)`;
};

// --- RAF イージング ---
const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

const cancelAnim = () => {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  animStart = null;
};

const animateTo = (from, to, onDone) => {
  cancelAnim();
  animFrom = from;
  animTo = to;
  const step = (ts) => {
    if (isMobile()) { rafId = null; animStart = null; return; }
    if (animStart === null) animStart = ts;
    const t = Math.min((ts - animStart) / DURATION, 1);
    applyOffset(animFrom + (animTo - animFrom) * ease(t));
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      rafId = null;
      animStart = null;
      onDone?.();
    }
  };
  rafId = requestAnimationFrame(step);
};

// --- ドット ---
const renderDots = () => {
  const el = document.getElementById("hero-dots");
  if (!el) return;
  el.innerHTML = Array.from({ length: total }, (_, i) =>
    `<button class="hero-dot${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="${i + 1}枚目"></button>`
  ).join("");
};

const updateDots = () => {
  document.querySelectorAll(".hero-dot").forEach((el, i) => {
    el.classList.toggle("is-active", i === current);
  });
};

// is-active は全 DOM スライドのうち real-index === current のものに付ける
const updateActive = () => {
  document.querySelectorAll(".hero-slide").forEach((el) => {
    el.classList.toggle("is-active", Number(el.dataset.realIndex) === current);
  });
};

// --- 移動 ---
const moveTo = (newReal, animated, onDone) => {
  // vCurrent から newReal へ一番近い仮想インデックスを選ぶ
  const centerSet = total; // middle set starts at DOM index `total`
  const newV = centerSet + newReal;
  const from = offsetFor(vCurrent);
  const to = offsetFor(newV);

  current = newReal;
  vCurrent = newV;
  updateActive();
  updateDots();

  if (!animated) {
    cancelAnim();
    applyOffset(to);
    onDone?.();
    return;
  }
  animateTo(from, to, onDone);
};

// 次へ（アニメが走っていたら無視）
const goNext = () => {
  if (isMobile()) { clearInterval(timer); return; }
  if (rafId) return;
  const nextReal = (current + 1) % total;
  const from = offsetFor(vCurrent);
  const newV = vCurrent + 1; // 右に1つ進む
  const to = offsetFor(newV);

  current = nextReal;
  vCurrent = newV;
  updateActive();
  updateDots();

  animateTo(from, to, () => {
    // 端に達したら中央セットへワープ（見た目の変化なし）
    if (vCurrent >= total * 2) {
      vCurrent -= total;
      applyOffset(offsetFor(vCurrent));
    }
  });
};

const goPrev = () => {
  if (rafId) return;
  const prevReal = ((current - 1) + total) % total;
  const from = offsetFor(vCurrent);
  const newV = vCurrent - 1;
  const to = offsetFor(newV);

  current = prevReal;
  vCurrent = newV;
  updateActive();
  updateDots();

  animateTo(from, to, () => {
    // 端に達したら中央セットへワープ
    if (vCurrent < total) {
      vCurrent += total;
      applyOffset(offsetFor(vCurrent));
    }
  });
};

// --- 自動再生 ---
const startAuto = () => {
  if (isMobile()) return;
  clearInterval(timer);
  timer = setInterval(goNext, INTERVAL);
};

// --- スライドビルド ---
const buildSlide = (project, realIndex, isActive, isFirst = false) => {
  const members = getMemberStudents(project);
  const memberNames = members.map((m) => m.name).join(" / ");
  const imgAttrs = isFirst
    ? 'fetchpriority="high" loading="eager" decoding="sync"'
    : 'loading="lazy" decoding="async"';
  return `
    <a class="hero-slide${isActive ? " is-active" : ""}" data-real-index="${realIndex}" href="/projects/${escapeHtml(project.slug)}.html">
      <picture><source srcset="${escapeHtml(project.image.replace(/\.(jpe?g|png)$/i, ".webp"))}" type="image/webp" /><img class="hero-slide-img" src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" ${imgAttrs} /></picture>
      <span class="hero-slide-num">Project ${String(realIndex + 1).padStart(2, "0")}</span>
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
  current = 0;

  if (isMobile()) {
    // モバイル: オリジナルのみ、横スクロール・transform不要
    const orig = list.map((p, i) => buildSlide(p, i, i === 0, i === 0));
    container.innerHTML = orig.join("");
    container.style.transform = "";
    vCurrent = 0;
    renderDots();
    return;
  }

  // 3セット: [tail clone | originals | head clone]
  const tail = list.map((p, i) => buildSlide(p, i, false, false));
  const orig = list.map((p, i) => buildSlide(p, i, i === 0, i === 0));
  const head = list.map((p, i) => buildSlide(p, i, false, false));
  container.innerHTML = [...tail, ...orig, ...head].join("");

  // 初期位置: 中央セットの current=0 → vIdx = total + 0 = total
  vCurrent = total;
  renderDots();
  requestAnimationFrame(() => {
    measureSizes();
    applyOffset(offsetFor(vCurrent));
  });

  document.getElementById("hero-prev")?.addEventListener("click", (e) => {
    e.preventDefault(); goPrev(); clearInterval(timer); startAuto();
  });
  document.getElementById("hero-next")?.addEventListener("click", (e) => {
    e.preventDefault(); goNext(); clearInterval(timer); startAuto();
  });
  document.getElementById("hero-dots")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-index]");
    if (!btn || rafId) return;
    moveTo(Number(btn.dataset.index), true);
    clearInterval(timer);
    startAuto();
  });

  window.addEventListener("resize", () => {
    if (isMobile()) {
      cancelAnim();
      clearInterval(timer);
      const track = getTrack();
      if (track) track.style.transform = "";
      return;
    }
    cancelAnim();
    measureSizes();
    applyOffset(offsetFor(vCurrent));
  });

  startAuto();
};

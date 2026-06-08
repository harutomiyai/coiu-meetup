// ── Scroll restoration reset ──
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

window.addEventListener("load", () => {
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";

  window.scrollTo(0, 0);

  document.querySelectorAll("*").forEach((el) => {
    if (el.scrollLeft) el.scrollLeft = 0;
  });

  html.style.scrollBehavior = prev;
});

// ── Elements ──
const aboutSection = document.querySelector(".about-section");
const heroSection = document.querySelector(".hero-section");
const heroBg = document.querySelector(".hero-bg");
const heroWhite = document.querySelector(".hero-white");
const heroOverlay = document.querySelector(".hero-overlay");
const heroLines = document.querySelectorAll(".hero-line:not(.hero-line--gap)");
const qRows = [];

// ── Questions data ──
const questions = [
  "人はなぜ争うのか",
  "豊かさとは何か",
  "教育は誰のためにあるのか",
  "自由とは何か",
  "幸福とは何か",
  "正義は存在するのか",
  "技術は人を救えるのか",
  "言葉はどこまで届くのか",
  "平等は実現できるのか",
  "愛は学べるのか",
  "孤独は悪か",
  "進歩とは何か",
  "文化は誰がつくるのか",
  "共生とは何か",
  "未来は選べるのか",
  "経済は人を幸せにしたか",
  "社会は人を自由にしたか",
  "知性とは何か",
  "対話はなぜ必要か",
  "私たちはどこへ向かうのか",
  "平和は守れるのか",
  "環境と人は共存できるのか",
  "創造とは何か",
  "信念は持ち続けられるのか",
  "多様性とは強さか",
];

// ── Build question rows ──
const qBg = document.querySelector(".questions-bg");
const rowCount = 30;
const perRow = 12;

for (let r = 0; r < rowCount; r++) {
  const row = document.createElement("div");
  row.className = "q-row";
  const dir = r % 2 === 0 ? 1 : -1;
  for (let c = 0; c < perRow; c++) {
    const span = document.createElement("span");
    span.textContent = questions[(r * perRow + c) % questions.length];
    row.appendChild(span);
  }
  qBg.appendChild(row);
  qRows.push({ el: row, dir });
}

// ── Fade-in observer for lead text ──
const fadeDelays = [0, 800, 1600];
const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => entry.target.classList.add("visible"), delay);
      }
    });
  },
  { threshold: 0.1 },
);
document.querySelectorAll(".fade-in").forEach((el, i) => {
  el.dataset.delay = fadeDelays[i] || 0;
  fadeObserver.observe(el);
});

// ── About section gradient activation ──
const aboutObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        aboutSection.classList.add("gradient-active");
        aboutObserver.disconnect();
      }
    });
  },
  { threshold: 0.3 },
);
aboutObserver.observe(aboutSection);

// ── Hero reveal (one-shot) ──
let heroRevealed = false;
function revealHero() {
  if (heroRevealed) return;
  heroRevealed = true;
  heroWhite.classList.add("fade-out");
  heroBg.classList.add("active");
  heroLines.forEach((line, i) => {
    setTimeout(() => line.classList.add("visible"), 800 + i * 350);
  });
}

// ── Scroll-driven cinematic controller ──
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateCinematic);
}

function updateCinematic() {
  ticking = false;
  const scrollY = window.scrollY;
  const vh = window.innerHeight;

  // progress: 0 (top) → 1 (scrolled 1 viewport)
  const rawProgress = Math.min(Math.max(scrollY / vh, 0), 1);
  const p = easeOutCubic(rawProgress);

  // ── About section: scale down, fade out ──
  const aboutOpacity = 1 - p;
  aboutSection.style.transform = `none`;
  aboutSection.style.filter = `none`;
  aboutSection.style.opacity = aboutOpacity;

  // ── Question rows: horizontal parallax ──
  for (let i = 0; i < qRows.length; i++) {
    const { el, dir } = qRows[i];
    el.style.transform = `translateX(${dir * scrollY * 0.25}px)`;
  }

  // ── Crossfade "film" effect ──
  // At the handoff zone (45%–65%), briefly darken overlay + flash white
  const filmCenter = 0.55;
  const filmWidth = 0.1;
  const filmT =
    1 - Math.min(Math.abs(rawProgress - filmCenter) / filmWidth, 1);
  // filmT: 0 outside zone, peaks at 1 at center

  // Overlay: base 0.15 → peaks to 0.25 at crossfade moment
  const overlayAlpha = 0.15 + filmT * 0.1;
  heroOverlay.style.background = `rgba(0,0,0,${overlayAlpha})`;

  // White curtain: inject a subtle flash (opacity 0 → 0.12 → 0)
  const flashAlpha = filmT * 0.12;
  heroWhite.style.background = `rgba(255,255,255,${flashAlpha})`;

  // ── Hero section: emerge from blur ──
  // Hero starts appearing at 40% scroll, fully clear at 90%
  const heroStart = 0.4;
  const heroEnd = 0.9;
  const heroP = Math.min(
    Math.max((rawProgress - heroStart) / (heroEnd - heroStart), 0),
    1,
  );
  const heroOpacity = heroP;
  heroSection.style.filter = `none`;
  heroSection.style.opacity = heroOpacity;

  // Trigger hero reveal animation once mostly visible
  if (rawProgress > 0.7) {
    revealHero();
  }
}

window.addEventListener("scroll", onScroll, { passive: true });

// Initial call
updateCinematic();

// ── Global Navbar: circle → bar (open) / bar → circle → float away (close) ──
(() => {
  const nav = document.getElementById("globalNav");
  const featureSections = document.querySelectorAll(".feature-section");
  // Non-feature sections that should trigger an immediate close
  const otherSections = document.querySelectorAll(".about-section, .hero-section");
  if (!nav || !featureSections.length) return;

  const allPhases = ["phase-drop", "phase-expand", "phase-collapse", "phase-exit"];
  function clearPhases() { allPhases.forEach((c) => nav.classList.remove(c)); }

  let state = "hidden"; // hidden | opening | open | closing
  let closeTimer = null;
  let openTimer = null;
  let closeDebounce = null;
  const visibleFeatures = new Set();

  function openNav() {
    if (state === "open" || state === "opening") return;
    // Cancel any ongoing close
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    state = "opening";

    clearPhases();
    nav.classList.add("phase-drop");

    openTimer = setTimeout(() => {
      nav.classList.remove("phase-drop");
      nav.classList.add("phase-expand");
      state = "open";
      openTimer = null;
    }, 550);
  }

  function closeNav() {
    if (state === "hidden" || state === "closing") return;
    if (openTimer) { clearTimeout(openTimer); openTimer = null; }
    state = "closing";

    clearPhases();
    // Collapse bar → circle
    nav.classList.add("phase-collapse");

    closeTimer = setTimeout(() => {
      nav.classList.remove("phase-collapse");
      nav.classList.add("phase-exit");

      setTimeout(() => {
        clearPhases();
        state = "hidden";
        closeTimer = null;
      }, 500);
    }, 550); // wait for border-radius to fully round before floating up
  }

  // Watch feature sections — open when any is visible
  const featureObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleFeatures.add(entry.target);
        } else {
          visibleFeatures.delete(entry.target);
        }
      });

      if (visibleFeatures.size > 0) {
        if (closeDebounce) { clearTimeout(closeDebounce); closeDebounce = null; }
        openNav();
      } else {
        // セクション間スクロール時の一瞬の空白を無視するためデバウンス
        if (closeDebounce) clearTimeout(closeDebounce);
        closeDebounce = setTimeout(() => {
          closeDebounce = null;
          if (visibleFeatures.size === 0) closeNav();
        }, 150);
      }
    },
    { threshold: 0.15 },
  );
  featureSections.forEach((s) => featureObserver.observe(s));

  // Watch non-feature sections — close immediately when they enter view
  const otherObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          closeNav();
        }
      });
    },
    { threshold: 0.15 },
  );
  otherSections.forEach((s) => otherObserver.observe(s));
})();



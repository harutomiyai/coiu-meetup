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

// ══════════════════════════════════════════════
//  Student Grid & Detail Overlay
// ══════════════════════════════════════════════

// ── Render card grid ──
function renderGrid(students) {
  const grid = document.getElementById("studentGrid");
  if (!grid) return;

  grid.innerHTML = students
    .map((s, i) => {
      const avatar = s.image
        ? `<img src="${s.image}" alt="${s.nameJa}" class="sg-card__img" loading="lazy">`
        : `<div class="sg-card__photo-fallback" style="background: ${s.gradient}"></div>`;

      const idx = String(i + 1).padStart(2, "0");
      const deptShort = s.dept.split(" ").slice(1).join(" ");

      return `
        <button class="sg-card" data-id="${s.id}" aria-label="${s.nameJa}の紹介を見る" style="--c-gradient: ${s.gradient}">
          <span class="sg-card__idx">${idx}</span>
          <div class="sg-card__photo">${avatar}</div>
          <div class="sg-card__info">
            <span class="sg-card__name">${s.nameJa}</span>
            <span class="sg-card__meta">${deptShort} · ${s.year}</span>
          </div>
          <div class="sg-card__tags">
            ${s.tags.slice(0, 2).map((t) => `<span class="sg-tag">#${t}</span>`).join("")}
          </div>
        </button>
      `;
    })
    .join("");

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".sg-card");
    if (!card) return;
    const student = students.find((s) => s.id === card.dataset.id);
    if (student) openDetail(student);
  });
}

// ── Open detail overlay ──
function openDetail(student) {
  const overlay = document.getElementById("studentDetail");
  const hero = document.getElementById("detailHero");
  const content = document.getElementById("detailContent");

  hero.style.background = student.gradient;
  const heroPhoto = student.image
    ? `<img src="${student.image}" alt="${student.nameJa}" class="sd-hero__photo">`
    : "";
  hero.innerHTML = `
    ${heroPhoto}
    <div class="sd-hero__inner">
      <h2 class="sd-hero__name">${student.nameJa}</h2>
      <p class="sd-hero__roman">${student.nameEn}</p>
      <p class="sd-hero__dept">${student.dept} / ${student.year}</p>
      <div class="sd-hero__tags">
        ${student.tags.map((t) => `<span class="sd-hero__tag">#${t}</span>`).join("")}
      </div>
    </div>
  `;

  content.innerHTML = `
    <dl class="sd-profile-dl">
      <dt>出身</dt><dd>${student.from}</dd>
      <dt>学年</dt><dd>${student.year}</dd>
      <dt>趣味</dt><dd>${student.hobbies}</dd>
    </dl>
    <blockquote class="sd-quote">「${student.quote}」</blockquote>
    <p class="sd-bio">${student.bio}</p>
    <div class="sd-message-wrap">
      <p class="sd-message-label">Message</p>
      <p class="sd-message-body">${student.message}</p>
      <footer class="sd-message-sig">
        <span class="sd-message-sig__name">${student.nameJa}</span>
        <span class="sd-message-sig__dept">${student.dept} ${student.year}</span>
      </footer>
    </div>
  `;

  overlay.querySelector(".sd-scroll").scrollTop = 0;
  overlay.classList.add("is-open");
  overlay.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
}

// ── Close detail overlay ──
function closeDetail() {
  const overlay = document.getElementById("studentDetail");
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.getElementById("detailClose").addEventListener("click", closeDetail);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});

// ── Load students from JSON ──
fetch("students.json")
  .then((res) => res.json())
  .then((students) => renderGrid(students))
  .catch((err) => console.error("students.json の読み込みに失敗しました:", err));

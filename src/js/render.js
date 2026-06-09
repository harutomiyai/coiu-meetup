import { students, state, fixedTopics, getAllTopics } from "./state.js";
import { selectors } from "./selectors.js";

const FEATURED_PREVIEW_LIMIT = 3;
const PICKUP_AUTOPLAY_DELAY = 7000;
const PICKUP_RESUME_DELAY = 12000;

let pickupIndex = 0;
let pickupTimerId;
let pickupResumeTimerId;

export const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getContactLink = (student) =>
  student.links.contact || student.links.x || student.links.instagram || "#";

const getExternalLabel = (key) => {
  const labels = {
    note: "note",
    youtube: "YouTube",
    podcast: "Podcast",
    x: "X",
    instagram: "Instagram",
    contact: "Contact",
  };
  return labels[key] || key;
};

const topicButton = (topic, isActive = false, className = "topic-chip") => `
  <button
    class="${className} ${isActive ? "is-active" : ""}"
    type="button"
    data-topic="${escapeHtml(topic)}"
    aria-pressed="${isActive ? "true" : "false"}"
  >
    #${escapeHtml(topic)}
  </button>
`;

const tagPill = (tag) => `<span class="tag-pill">#${escapeHtml(tag)}</span>`;

const talkPill = (topic) => `<span class="talk-pill">${escapeHtml(topic)}</span>`;

const cardImage = (student) => `
  <a class="card-image" href="#student/${escapeHtml(student.slug)}" aria-label="${escapeHtml(student.name)}さんの詳細を見る" tabindex="-1">
    <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
  </a>
`;

const personCard = (student, variant = "grid") => {
  const isPickup = variant === "pickup";

  return `
    <article class="person-card person-card-${variant}">
      ${cardImage(student)}
      <div class="person-card-body">
        <h3>${escapeHtml(student.name)}</h3>
        <p class="person-catch">${escapeHtml(student.catch)}</p>
        <div class="tag-row">
          ${student.tags.slice(0, 3).map(tagPill).join("")}
        </div>
        <p class="activity-line">${escapeHtml(student.currentProject)}</p>
        ${isPickup ? `
          <div class="card-hint-box">
            <span class="card-hint-label">話してみたいこと</span>
            <p>${escapeHtml(student.oneOnOneMessage)}</p>
          </div>
        ` : ""}
        <div class="card-actions">
          <a class="button button-dark button-small" href="#student/${escapeHtml(student.slug)}">詳しく見る</a>
        </div>
      </div>
    </article>
  `;
};

const pickupSlide = (student, index) => `
  <div class="pickup-slide" role="group" aria-label="${index + 1}人目のピックアップ学生">
    ${personCard(student, "pickup")}
  </div>
`;

const updatePickupSlider = (root, index) => {
  const slides = root.querySelectorAll(".pickup-slide");
  const dots = root.querySelectorAll("[data-pickup-dot]");
  const track = root.querySelector(".pickup-track");
  if (!slides.length || !track) return;

  pickupIndex = (index + slides.length) % slides.length;
  track.style.transform = `translateX(-${pickupIndex * 100}%)`;

  slides.forEach((slide, slideIndex) => {
    slide.toggleAttribute("aria-hidden", slideIndex !== pickupIndex);
  });

  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === pickupIndex);
    dot.setAttribute("aria-current", dotIndex === pickupIndex ? "true" : "false");
  });
};

const clearPickupTimers = () => {
  window.clearInterval(pickupTimerId);
  window.clearTimeout(pickupResumeTimerId);
};

const startPickupAutoplay = (root) => {
  const slideCount = root.querySelectorAll(".pickup-slide").length;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  clearPickupTimers();

  if (slideCount <= 1 || reduceMotion) return;

  pickupTimerId = window.setInterval(() => {
    updatePickupSlider(root, pickupIndex + 1);
  }, PICKUP_AUTOPLAY_DELAY);
};

const pausePickupAutoplay = (root) => {
  clearPickupTimers();
  pickupResumeTimerId = window.setTimeout(() => startPickupAutoplay(root), PICKUP_RESUME_DELAY);
};

const initPickupSlider = () => {
  const root = selectors.todayQuestionCard.querySelector("[data-pickup-slider]");
  if (!root) return;

  const slideCount = root.querySelectorAll(".pickup-slide").length;
  pickupIndex = 0;
  updatePickupSlider(root, 0);

  root.querySelector("[data-pickup-prev]")?.addEventListener("click", () => {
    updatePickupSlider(root, pickupIndex - 1);
    pausePickupAutoplay(root);
  });

  root.querySelector("[data-pickup-next]")?.addEventListener("click", () => {
    updatePickupSlider(root, pickupIndex + 1);
    pausePickupAutoplay(root);
  });

  root.querySelectorAll("[data-pickup-dot]").forEach((dot) => {
    dot.addEventListener("click", () => {
      updatePickupSlider(root, Number(dot.dataset.pickupDot));
      pausePickupAutoplay(root);
    });
  });

  root.addEventListener("mouseenter", () => clearPickupTimers());
  root.addEventListener("mouseleave", () => startPickupAutoplay(root));
  root.addEventListener("focusin", () => clearPickupTimers());
  root.addEventListener("focusout", () => startPickupAutoplay(root));

  root.querySelector(".pickup-controls")?.toggleAttribute("hidden", slideCount <= 1);
  root.querySelector(".pickup-dots")?.toggleAttribute("hidden", slideCount <= 1);
  startPickupAutoplay(root);
};

const getFilteredStudents = () => {
  if (state.selectedTopic === "すべて") return students;
  return students.filter((student) => student.tags.includes(state.selectedTopic));
};

const detailList = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const detailLinks = (student) =>
  Object.entries(student.links)
    .filter(([, url]) => Boolean(url))
    .map(
      ([key, url]) => `
        <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
          ${escapeHtml(getExternalLabel(key))}
        </a>
      `,
    )
    .join("");

export const renderStudentDetail = (student) => {
  selectors.studentView.innerHTML = `
    <div class="detail-shell">
      <a class="back-link" href="#students">← 学生一覧へ戻る</a>
      <div class="detail-hero">
        <div class="detail-image">
          <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
        </div>
        <div class="detail-main">
          <p class="eyebrow">${escapeHtml(student.generation)} / CoIU Students</p>
          <h1>${escapeHtml(student.name)}</h1>
          <p class="detail-catch">${escapeHtml(student.catch)}</p>
          <div class="tag-row">
            ${student.tags.map(tagPill).join("")}
          </div>
          <div class="card-hint-box detail-hint">
            <span class="card-hint-label">今持っている問い</span>
            <p>${escapeHtml(student.currentQuestion)}</p>
          </div>
          <a class="button button-dark" href="${escapeHtml(getContactLink(student))}" target="_blank" rel="noreferrer">
            話してみる
          </a>
        </div>
      </div>

      <div class="detail-grid">
        <article class="detail-card detail-profile">
          <p class="eyebrow">PROFILE</p>
          <h2>この人について</h2>
          <p>${escapeHtml(student.story)}</p>
        </article>

        <article class="detail-card">
          <p class="eyebrow">INTERESTS</p>
          <h2>関心テーマ</h2>
          <div class="tag-row">
            ${student.tags.map(tagPill).join("")}
          </div>
        </article>

        <article class="detail-card">
          <p class="eyebrow">TALK THEME</p>
          <h2>話せるテーマ</h2>
          <div class="talk-row">
            ${student.talkTopics.map(talkPill).join("")}
          </div>
        </article>

        <article class="detail-card">
          <p class="eyebrow">RECENT PROJECT</p>
          <h2>最近取り組んでいること</h2>
          <p>${escapeHtml(student.currentProject)}</p>
          <ul>${detailList(student.recentActivities)}</ul>
        </article>

        <article class="detail-card">
          <p class="eyebrow">ASK ME</p>
          <h2>相談できること</h2>
          <ul>${detailList(student.canConsult)}</ul>
        </article>

        <article class="detail-card">
          <p class="eyebrow">MESSAGE</p>
          <h2>話してみたい人へ</h2>
          <p class="message-box">「${escapeHtml(student.oneOnOneMessage)}」</p>
        </article>

        <article class="detail-card">
          <p class="eyebrow">LINKS</p>
          <h2>SNS / note / YouTube / Podcast</h2>
          <div class="link-list">
            ${detailLinks(student)}
          </div>
        </article>
      </div>
    </div>
  `;
};

export const renderTopicControls = () => {
  const topics = getAllTopics();

  if (selectors.heroTopics) {
    selectors.heroTopics.innerHTML = fixedTopics
    .slice(0, 8)
    .map((topic) => topicButton(topic, topic === state.selectedTopic, "hero-tag"))
    .join("");
  }

  selectors.topicList.innerHTML = topics
    .slice(1)
    .map((topic) => topicButton(topic, topic === state.selectedTopic, "topic-chip"))
    .join("");

  if (selectors.tagCloud) {
    selectors.tagCloud.innerHTML = topics
      .slice(1)
      .map((topic, index) => {
        const sizes = ["tag-large", "tag-medium", "tag-small"];
        return topicButton(topic, topic === state.selectedTopic, `cloud-tag ${sizes[index % sizes.length]}`);
      })
      .join("");
  }
};

export const renderFeatured = () => {
  const previewStudents = students.filter((student) => !student.featured).slice(0, FEATURED_PREVIEW_LIMIT);
  const fallbackStudents = previewStudents.length ? previewStudents : students.slice(0, FEATURED_PREVIEW_LIMIT);

  selectors.featuredGrid.innerHTML = fallbackStudents
    .map((student) => personCard(student, "featured"))
    .join("");
};

export const renderTodayQuestion = () => {
  const pickupStudents = students.filter((student) => student.featured);
  const fallbackStudents = pickupStudents.length ? pickupStudents : students.slice(0, 1);

  selectors.todayQuestionCard.innerHTML = `
    <div class="pickup-slider" data-pickup-slider>
      <div class="pickup-viewport" aria-live="polite">
        <div class="pickup-track">
          ${fallbackStudents.map(pickupSlide).join("")}
        </div>
      </div>
      <div class="pickup-controls" aria-label="ピックアップ学生の切り替え">
        <button class="pickup-arrow" type="button" data-pickup-prev aria-label="前の学生">←</button>
        <div class="pickup-dots" aria-label="現在のスライド">
          ${fallbackStudents
            .map(
              (student, index) => `
                <button
                  class="pickup-dot"
                  type="button"
                  data-pickup-dot="${index}"
                  aria-label="${escapeHtml(student.name)}さんを表示"
                ></button>
              `,
            )
            .join("")}
        </div>
        <button class="pickup-arrow" type="button" data-pickup-next aria-label="次の学生">→</button>
      </div>
    </div>
  `;
  initPickupSlider();
};

export const renderPeopleGrid = () => {
  const filtered = getFilteredStudents();
  const label =
    state.selectedTopic === "すべて"
      ? "すべての学生"
      : `#${state.selectedTopic} に関心のある学生`;

  selectors.topicResultHead.innerHTML = `
    <p>${escapeHtml(label)}</p>
    <span>${filtered.length} people</span>
  `;

  selectors.peopleGrid.innerHTML = filtered.length
    ? filtered.map((student) => personCard(student)).join("")
    : `
      <div class="empty-state">
        <h3>このタグの学生は準備中です</h3>
        <p>掲載したい学生データを追加すると、ここに自動で表示されます。</p>
      </div>
    `;
};

export const renderRecentQuestions = () => {
  if (selectors.recentQuestions) {
    selectors.recentQuestions.innerHTML = "";
  }
};

export const renderHome = () => {
  renderTopicControls();
  renderTodayQuestion();
  renderFeatured();
  renderPeopleGrid();
};

export const renderLoadError = (error) => {
  console.error(error);
  selectors.homeView.innerHTML = `
    <section class="section">
      <div class="empty-state">
        <h3>学生データを読み込めませんでした</h3>
        <p>時間をおいて再読み込みしてください。</p>
      </div>
    </section>
  `;
  selectors.studentView.hidden = true;
};

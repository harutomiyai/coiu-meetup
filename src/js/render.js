import { students, state, getAllTopics, interestTopics } from "./state.js";
import { selectors } from "./selectors.js";

const NOTE_WORKER_ENDPOINT = ""; // TODO: Replace with your deployed Cloudflare Worker URL

const HERO_PREVIEW_LIMIT = 3;
const RECOMMENDATION_LIMIT = 3;
const PICKUP_AUTOPLAY_DELAY = 7000;
const PICKUP_RESUME_DELAY = 12000;

let pickupIndex = 0;
let pickupTimerId;
let pickupResumeTimerId;

const tagThemeByName = {
  教育: "tag-theme-human",
  問い: "tag-theme-human",
  N高: "tag-theme-human",
  AI: "tag-theme-tech",
  プログラミング: "tag-theme-tech",
  Web制作: "tag-theme-tech",
  地域: "tag-theme-local",
  交流歓迎: "tag-theme-local",
  デザイン: "tag-theme-design",
  Podcast: "tag-theme-design",
  起業: "tag-theme-business",
};

const linkOrder = ["x", "instagram", "note", "youtube", "podcast", "contact"];

export const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getContactLink = (student) =>
  student.links?.contact || student.links?.x || student.links?.instagram || "#";

const getExternalAttributes = (url) =>
  url && url !== "#" ? ' target="_blank" rel="noreferrer"' : "";

const getExternalLabel = (key) => {
  const labels = {
    note: "note",
    youtube: "YouTube",
    podcast: "Podcast",
    x: "X",
    instagram: "Instagram",
    contact: "連絡フォーム",
  };
  return labels[key] || key;
};

const getExternalIcon = (key) => {
  const icons = {
    note: "n",
    youtube: "▶",
    podcast: "P",
    x: "X",
    instagram: "◎",
    contact: "↗",
  };
  return icons[key] || "↗";
};

const getTagThemeClass = (tag) => tagThemeByName[tag] || "tag-theme-general";

const topicButton = (topic, isActive = false, className = "topic-chip") => `
  <button
    class="${className} ${getTagThemeClass(topic)} ${isActive ? "is-active" : ""}"
    type="button"
    data-topic="${escapeHtml(topic)}"
    aria-pressed="${isActive ? "true" : "false"}"
  >
    #${escapeHtml(topic)}
  </button>
`;

const tagPill = (tag) => `<span class="tag-pill ${getTagThemeClass(tag)}">#${escapeHtml(tag)}</span>`;

const talkPill = (topic) => `<span class="talk-pill">${escapeHtml(topic)}</span>`;

const getProfileLead = (student) => {
  if (student.profileLead) return student.profileLead;

  const firstSentence = String(student.story || "").split("。").find(Boolean);
  return firstSentence ? `${firstSentence}。` : student.catch;
};

const getInterestDetails = (student) =>
  Array.isArray(student.interests)
    ? student.interests.filter((interest) => interest?.theme && interest?.reason)
    : [];

const interestReasonCards = (student) => {
  const interests = getInterestDetails(student);
  if (!interests.length) return "";

  return `
    <article class="detail-card detail-interests">
      <p class="eyebrow">INTERESTS</p>
      <h2>関心テーマ</h2>
      <div class="interest-reason-grid">
        ${interests
          .map(
            (interest) => `
              <div class="interest-reason">
                ${tagPill(interest.theme)}
                <p>${escapeHtml(interest.reason)}</p>
              </div>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getSearchText = (student) =>
  [
    student.name,
    student.catch,
    student.currentProject,
    student.oneOnOneMessage,
    student.currentQuestion,
    ...(student.tags || []),
  ]
    .map(normalizeText)
    .join(" ");

export const hasActiveDiscoveryFilters = () =>
  state.selectedTopics.length > 0 || normalizeText(state.searchQuery).length > 0;

const getStudentTopicScore = (student) =>
  state.selectedTopics.filter((topic) => student.tags.includes(topic)).length;

const getRankedStudents = () => {
  const query = normalizeText(state.searchQuery);

  return students
    .map((student, index) => {
      const topicScore = getStudentTopicScore(student);
      const searchMatch = !query || getSearchText(student).includes(query);
      return { student, index, topicScore, searchMatch };
    })
    .filter(({ topicScore, searchMatch }) => {
      const matchesTopics = state.selectedTopics.length === 0 || topicScore > 0;
      return matchesTopics && searchMatch;
    })
    .sort((a, b) => b.topicScore - a.topicScore || Number(b.student.featured) - Number(a.student.featured) || a.index - b.index)
    .map(({ student }) => student);
};

const getDiscoveryLabel = () => {
  const topicLabel = state.selectedTopics.map((topic) => `#${topic}`).join(" ");
  const query = state.searchQuery.trim();

  if (topicLabel && query) return `${topicLabel} / 「${query}」に近い学生`;
  if (topicLabel) return `${topicLabel} に近い学生`;
  if (query) return `「${query}」で検索`;
  return "すべての学生";
};

const getRecommendationNote = () => {
  const topicLabel = state.selectedTopics.map((topic) => `#${topic}`).join(" ");
  const query = state.searchQuery.trim();

  if (topicLabel && query) return `${topicLabel} と「${query}」に近い学生を上から表示しています。`;
  if (topicLabel) return `${topicLabel} に近い学生を上から表示しています。`;
  if (query) return `「${query}」に合う学生を上から表示しています。`;
  return "気になるテーマを選ぶと、近い学生を上から表示します。";
};

const getEmptyTitle = () =>
  state.selectedTopics.length ? "このテーマの学生は準備中です" : "条件に合う学生は準備中です";

const heroStudentCard = (student, index) => `
  <a
    class="hero-student-card hero-student-card-${index + 1}"
    href="#student/${escapeHtml(student.slug)}"
    aria-label="${escapeHtml(student.name)}さんの詳細を見る"
  >
    <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
    <span class="hero-student-body">
      <strong>${escapeHtml(student.name)}</strong>
      <span class="hero-student-catch">${escapeHtml(student.catch)}</span>
      <span class="hero-student-tags">
        ${student.tags.slice(0, 2).map((tag) => `<span class="${getTagThemeClass(tag)}">#${escapeHtml(tag)}</span>`).join("")}
      </span>
    </span>
  </a>
`;

const cardImage = (student) => `
  <a class="card-image" href="#student/${escapeHtml(student.slug)}" aria-label="${escapeHtml(student.name)}さんの詳細を見る" tabindex="-1">
    <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
  </a>
`;

const personCard = (student, variant = "grid") => {
  const isPickup = variant === "pickup";

  return `
    <article class="person-card person-card-${variant}" data-student-slug="${escapeHtml(student.slug)}">
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

const getFilteredStudents = () => (hasActiveDiscoveryFilters() ? getRankedStudents() : students);

const detailList = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const detailLinks = (student) =>
  linkOrder
    .map((key) => [key, student.links?.[key]])
    .filter(([, url]) => Boolean(url))
    .map(
      ([key, url]) => `
        <a class="external-link external-link-${escapeHtml(key)} ${key === "contact" ? "is-contact-link" : ""}" href="${escapeHtml(url)}"${getExternalAttributes(url)}>
          <span class="external-link-icon" aria-hidden="true">${escapeHtml(getExternalIcon(key))}</span>
          <span>${escapeHtml(getExternalLabel(key))}</span>
        </a>
      `,
    )
    .join("");

const renderArticleBlock = (block) => {
  switch (block.type) {
    case "lead":
      return `<p class="article-lead">${escapeHtml(block.text)}</p>`;
    case "heading":
      return `<h3 class="article-heading">${escapeHtml(block.text)}</h3>`;
    case "paragraph":
      return `<p class="article-paragraph">${escapeHtml(block.text)}</p>`;
    case "quote":
      return `<blockquote class="article-quote">${escapeHtml(block.text)}</blockquote>`;
    case "qa":
      return `
        <div class="article-qa">
          <p class="article-qa-question">Q. ${escapeHtml(block.question)}</p>
          <p class="article-qa-answer">${escapeHtml(block.answer)}</p>
        </div>
      `;
    case "image":
      return `
        <figure class="article-figure">
          <img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.caption || "")}" loading="lazy" />
          ${block.caption ? `<figcaption class="article-caption">${escapeHtml(block.caption)}</figcaption>` : ""}
        </figure>
      `;
    default:
      return "";
  }
};

const renderArticleSection = (student) => {
  const article = student.article;
  if (!Array.isArray(article) || !article.length) return "";

  return `
    <section class="article-section" aria-label="インタビュー記事">
      <header class="article-header">
        <p class="eyebrow">INTERVIEW</p>
        <h2>インタビュー記事</h2>
      </header>
      <div class="article-body">
        ${article.map(renderArticleBlock).join("")}
      </div>
    </section>
  `;
};

const noteArticleCard = (article) => `
  <a class="note-article-card" href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer">
    <div class="note-card-image">
      ${
        article.thumbnail
          ? `<img src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(article.title)}" loading="lazy" />`
          : `<div class="note-card-image-fallback" aria-hidden="true"></div>`
      }
      <span class="note-badge">note</span>
    </div>
    <div class="note-card-body">
      <p class="note-card-date">${escapeHtml(article.pubDate)}</p>
      <h3>${escapeHtml(article.title)}</h3>
      ${article.excerpt ? `<p class="note-card-excerpt">${escapeHtml(article.excerpt)}…</p>` : ""}
    </div>
  </a>
`;

export const renderStudentDetail = (student) => {
  const contactLink = getContactLink(student);
  const projectLead = student.projectDetail || student.currentProject;
  const topTalkTopics = student.talkTopics.slice(0, 2);

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
          <p class="detail-lead">${escapeHtml(getProfileLead(student))}</p>
          <div class="detail-actions">
            <a class="button button-cta detail-primary-cta" href="${escapeHtml(contactLink)}"${getExternalAttributes(contactLink)}>
              話してみる
            </a>
          </div>
          <div class="card-hint-box detail-hint">
            <span class="card-hint-label">今持っている問い</span>
            <p>${escapeHtml(student.currentQuestion)}</p>
          </div>
          <div class="detail-quick-box">
            <span class="card-hint-label">話し始めやすいテーマ</span>
            <div class="talk-row">
              ${topTalkTopics.map(talkPill).join("")}
            </div>
          </div>
        </div>
      </div>

      ${renderArticleSection(student)}

      <div class="detail-grid">
        <article class="detail-card detail-profile">
          <p class="eyebrow">PROFILE</p>
          <h2>この人について</h2>
          <p>${escapeHtml(student.story)}</p>
        </article>

        ${interestReasonCards(student)}

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
          <p>${escapeHtml(projectLead)}</p>
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
          <h2>SNS・各種リンク</h2>
          <div class="link-list">
            ${detailLinks(student) || '<p class="link-empty">公開リンクは準備中です。</p>'}
          </div>
        </article>
      </div>
      <section class="detail-final-cta" aria-label="話してみる">
        <div>
          <p class="eyebrow">CONTACT</p>
          <h2>読んで気になったら、話してみる</h2>
          <p>${escapeHtml(student.oneOnOneMessage)}</p>
        </div>
        <a class="button button-cta" href="${escapeHtml(contactLink)}"${getExternalAttributes(contactLink)}>
          話してみる
        </a>
      </section>
    </div>
  `;
};

export const renderTopicControls = () => {
  const topics = getAllTopics();
  const isSelected = (topic) => state.selectedTopics.includes(topic);

  if (selectors.themeModalTags) {
    selectors.themeModalTags.innerHTML = interestTopics
      .map((topic) => topicButton(topic, isSelected(topic), "theme-modal-tag"))
      .join("");
  }

  selectors.topicList.innerHTML = topics
    .slice(1)
    .map((topic) => topicButton(topic, isSelected(topic), "topic-chip"))
    .join("");

  if (selectors.clearTopic) {
    selectors.clearTopic.hidden = !hasActiveDiscoveryFilters();
  }

  if (selectors.tagCloud) {
    selectors.tagCloud.innerHTML = topics
      .slice(1)
      .map((topic, index) => {
        const sizes = ["tag-large", "tag-medium", "tag-small"];
        return topicButton(topic, isSelected(topic), `cloud-tag ${sizes[index % sizes.length]}`);
      })
      .join("");
  }
};

export const renderHeroVisual = () => {
  const heroStudents = students.filter((student) => student.featured).slice(0, HERO_PREVIEW_LIMIT);
  const fallbackStudents = heroStudents.length ? heroStudents : students.slice(0, HERO_PREVIEW_LIMIT);

  selectors.heroVisual.innerHTML = fallbackStudents.map(heroStudentCard).join("");
};

export const renderRecommendations = () => {
  const activeFilters = hasActiveDiscoveryFilters();
  const filteredStudents = getFilteredStudents();
  const defaultStudents = students.filter((student) => !student.featured).slice(0, RECOMMENDATION_LIMIT);
  const fallbackStudents = defaultStudents.length ? defaultStudents : students.slice(0, RECOMMENDATION_LIMIT);
  const recommendedStudents = activeFilters ? filteredStudents.slice(0, RECOMMENDATION_LIMIT) : fallbackStudents;

  selectors.recommendationNote.textContent = getRecommendationNote();

  selectors.recommendationGrid.innerHTML = recommendedStudents.length
    ? recommendedStudents.map((student) => personCard(student, "featured")).join("")
    : `
      <div class="empty-state recommendation-empty">
        <h3>${escapeHtml(getEmptyTitle())}</h3>
        <p>別のテーマやキーワードでも探してみてください。</p>
      </div>
    `;
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
  const activeFilters = hasActiveDiscoveryFilters();
  const label = getDiscoveryLabel();

  selectors.topicResultHead.innerHTML = `
    <p>${escapeHtml(label)}</p>
    <span>${filtered.length} people</span>
  `;

  selectors.peopleGrid.className = activeFilters ? "people-grid is-grid" : "people-grid is-marquee";

  if (!filtered.length) {
    selectors.peopleGrid.innerHTML = `
      <div class="empty-state">
        <h3>${escapeHtml(getEmptyTitle())}</h3>
        <p>別のテーマやキーワードでも探してみてください。</p>
      </div>
    `;
    return;
  }

  const cards = filtered.map((student) => personCard(student)).join("");

  selectors.peopleGrid.innerHTML = activeFilters
    ? cards
    : `
      <div class="people-marquee-track">
        <div class="people-marquee-set">
          ${cards}
        </div>
        <div class="people-marquee-set" aria-hidden="true" inert>
          ${cards}
        </div>
      </div>
    `;
};

export const renderRecentQuestions = () => {
  if (selectors.recentQuestions) {
    selectors.recentQuestions.innerHTML = "";
  }
};

export const renderDiscoveryResults = () => {
  renderTopicControls();
  renderRecommendations();
  renderPeopleGrid();
};

export const renderNoteArticles = async () => {
  if (!selectors.noteFeedSection || !selectors.noteFeedGrid) return;
  if (!NOTE_WORKER_ENDPOINT) return;

  try {
    const res = await fetch(NOTE_WORKER_ENDPOINT);
    if (!res.ok) throw new Error("fetch failed");
    const articles = await res.json();
    if (!Array.isArray(articles) || !articles.length) throw new Error("empty");

    selectors.noteFeedGrid.innerHTML = articles.map(noteArticleCard).join("");
    selectors.noteFeedSection.removeAttribute("hidden");
  } catch {
    // leave section hidden on any failure
  }
};

export const renderHome = () => {
  renderHeroVisual();
  renderTodayQuestion();
  renderDiscoveryResults();
  renderNoteArticles();
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

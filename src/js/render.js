import { students, state, getAllTopics, interestTopics } from "./state.js";
import { selectors } from "./selectors.js";
import { fetchNoteArticles, getNoteHomeUrl, hasNoteFeedSource } from "../lib/noteRss.js";

let detailNoteRequestId = 0;
let pickupScrollFrame = 0;
let pickupAutoplayTimer = null;
let heroSlideIndex = 0;
let heroSlideTimer = null;
let heroSlideStudents = [];

const linkOrder = ["note", "youtube", "podcast", "instagram", "x", "contact"];

export const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getExternalAttributes = (url) =>
  url && url !== "#" ? ' target="_blank" rel="noreferrer"' : "";

const getExternalLabel = (key) => {
  const labels = {
    note: "note",
    youtube: "YouTube",
    podcast: "Podcast",
    x: "X",
    instagram: "Instagram",
    contact: "問い合わせ",
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

const getExternalDescription = (student, key) => {
  const descriptions = {
    note: "noteで記事や活動記録を読む",
    youtube: "動画で活動や発表を見る",
    podcast: "音声で活動の背景を聞く",
    x: "近況や制作の断片を見る",
    instagram: "写真で活動の雰囲気を見る",
    contact: "必要な問い合わせを運営へ送る",
  };
  return student.linkDescriptions?.[key] || descriptions[key] || "外部で活動を見る";
};

const getLinkUrl = (student, key) => {
  if (key === "note") return student.links?.note || getNoteHomeUrl(student);
  return student.links?.[key] || "";
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

const getEmptyTitle = () =>
  state.selectedTopics.length ? "このテーマの学生は準備中です" : "条件に合う学生は準備中です";

const heroSpotlightCard = (student) => `
  <a
    class="hero-spotlight-card"
    href="#student/${escapeHtml(student.slug)}"
    aria-label="${escapeHtml(student.name)}さんの詳細を見る"
  >
    <span class="hero-spotlight-image">
      <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
    </span>
    <span class="hero-spotlight-body">
      <span class="hero-card-label">PICK UP STUDENT</span>
      <strong>${escapeHtml(student.name)}</strong>
      <span class="hero-student-meta">${escapeHtml(student.currentQuestion)}</span>
    </span>
  </a>
`;

const heroQueueCard = (student) => `
  <a
    class="hero-queue-card"
    href="#student/${escapeHtml(student.slug)}"
    aria-label="${escapeHtml(student.name)}さんの詳細を見る"
  >
    <span class="hero-queue-copy">
      <strong>${escapeHtml(student.name)}</strong>
      <span>${escapeHtml(student.currentQuestion)}</span>
    </span>
  </a>
`;

const personCard = (student) => {
  const visibleTags = student.tags.slice(0, 2);

  return `
    <a
      class="person-card person-card-grid"
      href="#student/${escapeHtml(student.slug)}"
      data-student-slug="${escapeHtml(student.slug)}"
      aria-label="${escapeHtml(student.name)}さんの詳細を見る"
    >
      <span class="card-image">
        <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" loading="lazy" />
      </span>
      <span class="person-card-body">
        <span class="card-question">${escapeHtml(student.currentQuestion)}</span>
        <span class="person-card-meta-row">
          <span class="person-name">${escapeHtml(student.name)}</span>
          <span class="generation-badge">${escapeHtml(student.generation)}</span>
        </span>
        ${student.currentProject ? `<span class="card-project">${escapeHtml(student.currentProject)}</span>` : ""}
        <span class="tag-row">
          ${visibleTags.map(tagPill).join("")}
        </span>
        <span class="card-read-more">詳しく見る →</span>
        <span class="card-hover-link" aria-hidden="true">話を聞きに行く →</span>
      </span>
    </a>
  `;
};

const pickupSlide = (student, index) => `
  <div class="pickup-slide" role="group" aria-label="${index + 1}人目のピックアップ学生">
    <article class="pickup-card" data-student-slug="${escapeHtml(student.slug)}">
      <a class="pickup-image" href="#student/${escapeHtml(student.slug)}" aria-label="${escapeHtml(student.name)}さんのプロフィールを見る">
        <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
      </a>
      <div class="pickup-body">
        <p class="pickup-question">${escapeHtml(student.currentQuestion)}</p>
        <div class="pickup-person">
          <strong>${escapeHtml(student.name)}</strong>
          <span class="generation-badge">${escapeHtml(student.generation)}</span>
        </div>
        <p class="pickup-message">「${escapeHtml(student.oneOnOneMessage)}」</p>
        <div class="pickup-note-slot" data-pickup-note-slug="${escapeHtml(student.slug)}" hidden></div>
        <a class="text-arrow" href="#student/${escapeHtml(student.slug)}">プロフィールを見る →</a>
      </div>
    </article>
  </div>
`;

const pickupNoteArticleCard = (article) => `
  <a class="pickup-note-card" href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer">
    <span class="pickup-note-thumb">
      ${
        article.thumbnail
          ? `<img src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(article.title)}" loading="lazy" />`
          : ""
      }
    </span>
    <span class="pickup-note-copy">
      <span>最新note</span>
      <strong>${escapeHtml(article.title)}</strong>
    </span>
  </a>
`;

const updatePickupVisibility = (root) => {
  const viewport = root.querySelector(".pickup-viewport");
  const slides = [...root.querySelectorAll(".pickup-slide")];
  if (!viewport || !slides.length) return;

  const nearestIndex = slides.reduce((nearest, slide, index) => {
    const currentDistance = Math.abs(slide.offsetLeft - viewport.scrollLeft);
    const nearestDistance = Math.abs(slides[nearest].offsetLeft - viewport.scrollLeft);
    return currentDistance < nearestDistance ? index : nearest;
  }, 0);

  slides.forEach((slide, index) => {
    const isActive = index === nearestIndex;
    slide.setAttribute("aria-hidden", String(!isActive));
    slide.toggleAttribute("inert", !isActive);
  });
};

const startPickupAutoplay = (root) => {
  const viewport = root.querySelector(".pickup-viewport");
  const slides = [...root.querySelectorAll(".pickup-slide")];
  if (!viewport || slides.length < 2) return;

  if (pickupAutoplayTimer) clearInterval(pickupAutoplayTimer);

  pickupAutoplayTimer = setInterval(() => {
    const currentIndex = slides.reduce((nearest, slide, index) => {
      const currentDist = Math.abs(slide.offsetLeft - viewport.scrollLeft);
      const nearestDist = Math.abs(slides[nearest].offsetLeft - viewport.scrollLeft);
      return currentDist < nearestDist ? index : nearest;
    }, 0);

    const nextIndex = (currentIndex + 1) % slides.length;
    viewport.scrollTo({ left: slides[nextIndex].offsetLeft, behavior: "smooth" });
  }, 4000);
};

const initPickupScroller = () => {
  const root = selectors.todayQuestionCard.querySelector("[data-pickup-slider]");
  if (!root) return;

  const viewport = root.querySelector(".pickup-viewport");
  if (!viewport) return;

  updatePickupVisibility(root);
  viewport.addEventListener("scroll", () => {
    window.cancelAnimationFrame(pickupScrollFrame);
    pickupScrollFrame = window.requestAnimationFrame(() => updatePickupVisibility(root));
  });

  viewport.addEventListener("pointerenter", () => {
    if (pickupAutoplayTimer) clearInterval(pickupAutoplayTimer);
  });
  viewport.addEventListener("pointerleave", () => startPickupAutoplay(root));

  startPickupAutoplay(root);
};

const renderPickupNoteCards = async (pickupStudents) => {
  await Promise.all(
    pickupStudents.map(async (student) => {
      if (!hasNoteFeedSource(student)) return;

      const slot = [...selectors.todayQuestionCard.querySelectorAll("[data-pickup-note-slug]")]
        .find((item) => item.dataset.pickupNoteSlug === student.slug);
      if (!slot) return;

      try {
        const [article] = await fetchNoteArticles(student, { limit: 1 });
        if (!article) return;
        slot.innerHTML = pickupNoteArticleCard(article);
        slot.hidden = false;
      } catch {
        slot.hidden = true;
      }
    }),
  );
};

const getFilteredStudents = () => (hasActiveDiscoveryFilters() ? getRankedStudents() : students);

const detailList = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const profileAbout = (student) => {
  if (Array.isArray(student.about) && student.about.length) {
    return student.about.filter(Boolean);
  }

  return student.story ? [student.story] : [];
};

const detailLinks = (student) =>
  linkOrder
    .map((key) => [key, getLinkUrl(student, key)])
    .filter(([, url]) => Boolean(url))
    .map(
      ([key, url]) => `
        <a class="external-link external-link-${escapeHtml(key)} ${key === "contact" ? "is-contact-link" : ""}" href="${escapeHtml(url)}"${getExternalAttributes(url)}>
          <span class="external-link-icon" aria-hidden="true">${escapeHtml(getExternalIcon(key))}</span>
          <span class="external-link-copy">
            <strong>${escapeHtml(getExternalLabel(key))}</strong>
            <small>${escapeHtml(getExternalDescription(student, key))}</small>
          </span>
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

const renderProfileArticle = (student) => {
  const article = student.article;
  if (!Array.isArray(article) || !article.length) return "";

  return `
    <div class="profile-article" aria-label="インタビュー記事">
      <header class="profile-subsection-head">
        <p class="eyebrow">INTERVIEW</p>
        <h3>インタビュー記事</h3>
      </header>
      <div class="article-body profile-article-body">
        ${article.map(renderArticleBlock).join("")}
      </div>
    </div>
  `;
};

const renderStudentNoteShell = (student) => {
  if (!hasNoteFeedSource(student)) return "";

  return `
    <div class="student-note-latest" data-note-latest-section hidden>
      <header class="profile-subsection-head compact">
        <p class="eyebrow">LATEST NOTE</p>
        <h3>最新記事</h3>
      </header>
      <div class="student-note-grid" data-note-latest-grid></div>
    </div>
  `;
};

const renderProfileLinks = (student) => {
  const links = detailLinks(student);
  if (!links) return "";

  return `
    <div class="profile-links" aria-label="外部で活動を見る">
      <header class="profile-subsection-head">
        <p class="eyebrow">LINKS</p>
        <h3>外部で活動を見る</h3>
      </header>
      <div class="link-list">
        ${links}
      </div>
      ${renderStudentNoteShell(student)}
    </div>
  `;
};

const studentNoteArticleCard = (article) => `
  <a class="student-note-card" href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer">
    ${
      article.thumbnail
        ? `<span class="student-note-thumb"><img src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(article.title)}" loading="lazy" /></span>`
        : ""
    }
    <span class="student-note-date">${escapeHtml(article.pubDate || "note")}</span>
    <strong>${escapeHtml(article.title)}</strong>
    <span class="student-note-arrow">記事を読む</span>
  </a>
`;

const renderStudentNoteArticles = async (student) => {
  const requestId = ++detailNoteRequestId;
  const section = selectors.studentView.querySelector("[data-note-latest-section]");
  const grid = selectors.studentView.querySelector("[data-note-latest-grid]");

  if (!section || !grid || !hasNoteFeedSource(student)) return;

  try {
    const articles = await fetchNoteArticles(student, { limit: 3 });
    if (requestId !== detailNoteRequestId || !articles.length) return;

    grid.innerHTML = articles.map(studentNoteArticleCard).join("");
    section.hidden = false;
  } catch {
    section.hidden = true;
  }
};

const noteArticleCard = (article, student) => `
  <article class="note-article-card">
    <a class="note-card-main" href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer">
      <div class="note-card-image">
        ${
          article.thumbnail
            ? `<img src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(article.title)}" loading="lazy" />`
            : `<div class="note-card-image-fallback"><strong>${escapeHtml(article.title)}</strong></div>`
        }
        <span class="note-badge">note</span>
      </div>
      <div class="note-card-body">
        <h3>${escapeHtml(article.title)}</h3>
        ${article.excerpt ? `<p class="note-card-excerpt">${escapeHtml(article.excerpt)}…</p>` : ""}
      </div>
    </a>
    <div class="note-card-author">
      <a href="#student/${escapeHtml(student.slug)}" aria-label="${escapeHtml(article.creatorName || student.name)}さんのプロフィールを見る">
        <img src="${escapeHtml(article.creatorImage || student.image)}" alt="${escapeHtml(article.creatorName || student.name)}さんの写真" loading="lazy" />
      </a>
      <a href="#student/${escapeHtml(student.slug)}">
        <span>${escapeHtml(article.creatorName || student.name)}</span>
        <time>${escapeHtml(article.pubDate || "投稿日未取得")}</time>
      </a>
    </div>
  </article>
`;

export const renderStudentDetail = (student) => {
  const projectLead = student.projectDetail || student.currentProject;
  const recentActivities = student.recentActivities || [];
  const relatedExperience = student.canConsult || [];
  const aboutParagraphs = profileAbout(student);

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
          <div class="detail-question-strip">
            <span class="card-hint-label">今持っている問い</span>
            <p>${escapeHtml(student.currentQuestion)}</p>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <article class="detail-card detail-profile" data-detail-section="profile">
          <p class="eyebrow">PROFILE</p>
          <h2>この人について</h2>
          <div class="profile-copy">
            ${aboutParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          </div>
          ${renderProfileArticle(student)}
          ${renderProfileLinks(student)}
        </article>

        ${interestReasonCards(student)}

        <article class="detail-card detail-works" data-detail-section="works">
          <p class="eyebrow">WORKS / RECENT PROJECT</p>
          <h2>活動・制作物</h2>
          <p>${escapeHtml(projectLead)}</p>
          ${
            recentActivities.length
              ? `
                <div class="work-list-group">
                  <h3>最近の取り組み</h3>
                  <ul>${detailList(recentActivities)}</ul>
                </div>
              `
              : ""
          }
          ${
            relatedExperience.length
              ? `
                <div class="work-list-group">
                  <h3>関連する経験</h3>
                  <ul>${detailList(relatedExperience)}</ul>
                </div>
              `
              : ""
          }
        </article>

        <article class="detail-card detail-message">
          <p class="eyebrow">MESSAGE</p>
          <h2>本人の言葉</h2>
          <p class="message-box">「${escapeHtml(student.oneOnOneMessage)}」</p>
        </article>
      </div>
    </div>
  `;

  renderStudentNoteArticles(student);
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
};

export const renderHeroVisual = () => {
  const heroStudents = students.filter((student) => student.featured).slice(0, 3);
  const fallbackStudents = heroStudents.length ? heroStudents : students.slice(0, 3);
  const [spotlightStudent, ...queueStudents] = fallbackStudents;

  if (!spotlightStudent) {
    selectors.heroVisual.innerHTML = "";
    return;
  }

  selectors.heroVisual.innerHTML = `
    ${heroSpotlightCard(spotlightStudent)}
    <div class="hero-queue" aria-label="次に見る学生">
      ${queueStudents.slice(0, 2).map(heroQueueCard).join("")}
    </div>
  `;
};

export const renderTodayQuestion = () => {
  const pickupStudents = students.filter((student) => student.featured);
  const fallbackStudents = pickupStudents.length ? pickupStudents : students.slice(0, 1);

  selectors.todayQuestionCard.innerHTML = `
    <div class="pickup-slider" data-pickup-slider>
      <div class="pickup-viewport" tabindex="0" aria-label="ピックアップ学生を横にスクロール">
        <div class="pickup-track">
          ${fallbackStudents.map(pickupSlide).join("")}
        </div>
      </div>
    </div>
  `;

  initPickupScroller();
  renderPickupNoteCards(fallbackStudents);
};

export const renderPeopleGrid = () => {
  const filtered = getFilteredStudents();
  const label = getDiscoveryLabel();

  selectors.topicResultHead.innerHTML = `
    <p><span>表示中</span>${escapeHtml(label)}</p>
    <strong>${filtered.length} people</strong>
  `;

  selectors.peopleGrid.className = "people-grid is-grid";

  if (!filtered.length) {
    selectors.peopleGrid.innerHTML = `
      <div class="empty-state">
        <h3>${escapeHtml(getEmptyTitle())}</h3>
        <p>別のテーマやキーワードでも探してみてください。</p>
      </div>
    `;
    return;
  }

  selectors.peopleGrid.innerHTML = filtered.map((student) => personCard(student)).join("");
};

export const renderDiscoveryResults = () => {
  renderTopicControls();
  renderPeopleGrid();
};

export const renderNoteArticles = async () => {
  if (!selectors.noteFeedSection || !selectors.noteFeedGrid) return;

  const noteStudents = students.filter(hasNoteFeedSource);
  if (!noteStudents.length) return;

  try {
    const results = await Promise.allSettled(
      noteStudents.map(async (student) => {
        const articles = await fetchNoteArticles(student, { limit: 3 });
        return articles.map((article) => ({ article, student }));
      }),
    );

    const articleItems = results
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .slice(0, 3);

    if (!articleItems.length) throw new Error("empty");

    selectors.noteFeedGrid.innerHTML = articleItems
      .map(({ article, student }) => noteArticleCard(article, student))
      .join("");
    selectors.noteFeedSection.removeAttribute("hidden");
  } catch {
    selectors.noteFeedSection.setAttribute("hidden", "");
  }
};

const heroSlide = (student) => `
  <div class="hero-slide" role="group" aria-label="${escapeHtml(student.name)}さんのピックアップ">
    <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
    <div class="hero-slide-overlay" aria-hidden="true"></div>
    <a class="hero-slide-caption" href="#student/${escapeHtml(student.slug)}" aria-label="${escapeHtml(student.name)}さんの詳細を見る">
      <span class="eyebrow">PICK UP STUDENT</span>
      <h2>${escapeHtml(student.name)}</h2>
      <p>${escapeHtml(student.currentQuestion)}</p>
    </a>
  </div>
`;

const setHeroSlide = (index) => {
  const track = selectors.heroSlideTrack;
  const dots = selectors.heroDots;
  if (!track) return;

  heroSlideIndex = index;
  track.style.transform = `translateX(${-index * 100}%)`;

  if (dots) {
    [...dots.querySelectorAll(".hero-dot")].forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
    });
  }
};

const startHeroAutoplay = () => {
  if (heroSlideTimer) clearInterval(heroSlideTimer);
  if (heroSlideStudents.length < 2) return;

  heroSlideTimer = setInterval(() => {
    const next = (heroSlideIndex + 1) % heroSlideStudents.length;
    setHeroSlide(next);
  }, 4500);
};

export const renderHeroSlideshow = () => {
  const track = selectors.heroSlideTrack;
  const dots = selectors.heroDots;
  const slideshow = selectors.heroSlideshow;
  if (!track || !slideshow) return;

  heroSlideStudents = students.filter((s) => s.featured);
  if (!heroSlideStudents.length) heroSlideStudents = students.slice(0, 4);
  if (!heroSlideStudents.length) {
    slideshow.hidden = true;
    return;
  }

  track.innerHTML = heroSlideStudents.map(heroSlide).join("");

  if (dots) {
    dots.innerHTML = heroSlideStudents
      .map(
        (_, i) =>
          `<button class="hero-dot ${i === 0 ? "is-active" : ""}" type="button" aria-label="${i + 1}枚目のスライドへ" data-hero-dot="${i}"></button>`,
      )
      .join("");

    dots.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-hero-dot]");
      if (!dot) return;
      const idx = Number(dot.dataset.heroDot);
      setHeroSlide(idx);
      startHeroAutoplay();
    });
  }

  slideshow.addEventListener("pointerenter", () => {
    if (heroSlideTimer) clearInterval(heroSlideTimer);
  });
  slideshow.addEventListener("pointerleave", () => startHeroAutoplay());

  setHeroSlide(0);
  startHeroAutoplay();
};

export const renderHome = () => {
  renderHeroSlideshow();
  renderTodayQuestion();
  renderDiscoveryResults();
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

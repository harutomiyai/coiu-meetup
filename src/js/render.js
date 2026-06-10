import { students, state, getAllTopics, interestTopics } from "./state.js";
import { selectors } from "./selectors.js";
import { fetchNoteArticles, getNoteHomeUrl, hasNoteFeedSource } from "../lib/noteRss.js";

let detailNoteRequestId = 0;

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
    <div class="detail-interests">
      <p class="eyebrow">INTERESTS</p>
      <h3>関心テーマ</h3>
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
    </div>
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

const formatArchiveNumber = (value) => String(value).padStart(3, "0");

const getStudentIndex = (student) => students.findIndex((item) => item.slug === student.slug);

const getArchiveNumber = (student) => {
  const index = getStudentIndex(student);
  return formatArchiveNumber(index >= 0 ? index + 1 : 0);
};

const getStudentKeyLine = (student) => student.catch || student.currentQuestion || student.currentProject || "";

const getStudentStoryLead = (student) => {
  if (student.story) {
    const firstSentence = String(student.story).split("。").find(Boolean);
    if (firstSentence) return `${firstSentence}。`;
  }

  return student.projectDetail || student.currentQuestion || "";
};

const getStudentTalkThemes = (student) =>
  (Array.isArray(student.talkTopics) && student.talkTopics.length ? student.talkTopics : student.canConsult || student.tags || []).slice(0, 4);

const getStudentRelatedWorks = (student) => {
  const works = [student.currentProject, student.projectDetail, ...(student.recentActivities || [])].filter(Boolean);
  return [...new Set(works)].slice(0, 5);
};

const renderArchiveImage = (student, { className = "", loading = "lazy" } = {}) =>
  student.image
    ? `<img class="${className}" src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" loading="${loading}" />`
    : `<div class="image-fallback ${className}"><span>${escapeHtml(student.name)}</span></div>`;

const renderArchiveTags = (tags = []) =>
  tags.map((tag) => `<span class="tag-pill">#${escapeHtml(tag)}</span>`).join("");

const renderTalkPills = (items = []) =>
  items.map((item) => `<span class="talk-pill">${escapeHtml(item)}</span>`).join("");

const personCard = (student) => {
  const archiveNumber = getArchiveNumber(student);
  const visibleTags = student.tags.slice(0, 3);

  return `
    <a
      class="archive-card archive-card-grid"
      href="#student/${escapeHtml(student.slug)}"
      data-student-slug="${escapeHtml(student.slug)}"
      aria-label="${escapeHtml(student.name)}さんの詳細を見る"
    >
      <span class="archive-card-rail">student ${archiveNumber}</span>
      <span class="archive-card-visual">
        ${renderArchiveImage(student, { className: "archive-card-image" })}
      </span>
      <span class="archive-card-body">
        <span class="archive-card-topline">
          <span class="archive-number">archive ${archiveNumber}</span>
        </span>
        <span class="archive-card-name">${escapeHtml(student.name)}</span>
        <span class="archive-card-title">${escapeHtml(getStudentKeyLine(student))}</span>
        <span class="archive-card-question"><span>QUESTION</span>${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</span>
        <p class="archive-card-copy">${escapeHtml(getStudentStoryLead(student))}</p>
        <span class="archive-card-section-label">関心タグ</span>
        <span class="tag-row archive-card-tags">${renderArchiveTags(visibleTags)}</span>
        <span class="card-read-more">プロフィールを読む</span>
      </span>
    </a>
  `;
};

const pickupSlide = (student, index) => {
  const archiveNumber = getArchiveNumber(student);

  return `
    <article class="pickup-editorial-card" role="group" aria-label="${index + 1}人目の注目学生">
      <a class="pickup-editorial-media" href="#student/${escapeHtml(student.slug)}" aria-label="${escapeHtml(student.name)}さんのプロフィールを見る">
        ${renderArchiveImage(student, { className: "pickup-editorial-image" })}
      </a>
      <div class="pickup-editorial-body">
        <p class="pickup-editorial-label eyebrow">PICK UP STUDENT / archive ${archiveNumber}</p>
        <h3 class="pickup-editorial-name">${escapeHtml(student.name)}</h3>
        <p class="pickup-editorial-title">${escapeHtml(getStudentKeyLine(student))}</p>
        <p class="pickup-editorial-question"><span>QUESTION</span><strong>${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</strong></p>
        <p class="pickup-editorial-copy">${escapeHtml(getStudentStoryLead(student))}</p>
        <div class="pickup-editorial-meta-row">
          <span class="generation-badge">${escapeHtml(student.generation)}</span>
          <span class="archive-number">CoIU / ${escapeHtml(student.generation)}</span>
        </div>
        <div class="pickup-editorial-block">
          <span class="pickup-editorial-block-label">話せるテーマ</span>
          <div class="tag-row">${renderTalkPills(getStudentTalkThemes(student))}</div>
        </div>
        <div class="pickup-editorial-block">
          <span class="pickup-editorial-block-label">MESSAGE</span>
          <p class="pickup-editorial-quote">「${escapeHtml(student.oneOnOneMessage)}」</p>
        </div>
        <div class="pickup-note-slot" data-pickup-note-slug="${escapeHtml(student.slug)}" hidden></div>
        <a class="text-arrow" href="#student/${escapeHtml(student.slug)}">プロフィールを読む</a>
      </div>
    </article>
  `;
};

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
  const archiveNumber = getArchiveNumber(student);
  const recentActivities = student.recentActivities || [];
  const talkThemes = getStudentTalkThemes(student);
  const relatedWorks = getStudentRelatedWorks(student);
  const aboutParagraphs = profileAbout(student);

  selectors.studentView.innerHTML = `
    <div class="detail-shell">
      <a class="back-link" href="#students">← 学生一覧へ戻る</a>

      <section class="detail-hero" aria-labelledby="detail-title">
        <div class="detail-image">
          ${renderArchiveImage(student, { className: "detail-image-media", loading: "eager" })}
        </div>
        <div class="detail-main">
          <p class="eyebrow">PERSON ARCHIVE / archive ${archiveNumber}</p>
          <h1 id="detail-title">${escapeHtml(student.name)}</h1>
          <p class="detail-meta">CoIU / ${escapeHtml(student.generation)}</p>
          <p class="detail-catch">${escapeHtml(student.catch)}</p>
          <div class="tag-row detail-tags">
            ${renderArchiveTags(student.tags)}
          </div>
          <div class="detail-title-block">
            <span class="detail-title-label">一言タイトル</span>
            <p>${escapeHtml(getStudentKeyLine(student))}</p>
          </div>
        </div>
      </section>

      <div class="detail-grid">
        <article class="detail-card detail-question-card">
          <p class="eyebrow">QUESTION</p>
          <h2>この人の問い</h2>
          <p class="detail-question">${escapeHtml(student.currentQuestion)}</p>
          <blockquote class="detail-quote">「${escapeHtml(student.oneOnOneMessage)}」</blockquote>
        </article>

        <article class="detail-card detail-about-card">
          <p class="eyebrow">PROFILE NOTE</p>
          <h2>活動の紹介</h2>
          <div class="profile-copy">
            ${aboutParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          </div>
        </article>

        <article class="detail-card detail-topics-card">
          <p class="eyebrow">TALK THEMES</p>
          <h2>話せるテーマ</h2>
          <div class="detail-chip-grid">${renderTalkPills(talkThemes)}</div>
        </article>

        <article class="detail-card detail-recent-card">
          <p class="eyebrow">RECENT</p>
          <h2>最近の取り組み</h2>
          <ul>${detailList(recentActivities.length ? recentActivities : [student.projectDetail || student.currentProject || "準備中"])} </ul>
        </article>

        <article class="detail-card detail-works-card">
          <p class="eyebrow">RELATED WORKS</p>
          <h2>関連する経験や制作物</h2>
          <p>${escapeHtml(student.projectDetail || student.currentProject || getStudentStoryLead(student))}</p>
          <ul>${detailList(relatedWorks)}</ul>
          ${interestReasonCards(student)}
        </article>

        ${renderProfileArticle(student)}
        ${renderProfileLinks(student)}

        <article class="detail-card detail-message">
          <p class="eyebrow">CONTACT</p>
          <h2>話してみたいとき</h2>
          <p class="message-box">${escapeHtml(student.oneOnOneMessage)}</p>
          <div class="detail-final-actions">
            <a class="button button-dark" href="#students">一覧へ戻る</a>
            ${student.links?.contact ? `<a class="button button-light" href="${escapeHtml(student.links.contact)}" target="_blank" rel="noreferrer">問い合わせる</a>` : ""}
          </div>
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
  const heroRoot = selectors.heroVisual;
  if (!heroRoot) return;

  const heroStudents = students.filter((student) => student.featured);
  const fallbackStudents = heroStudents.length ? heroStudents : students;
  const [spotlightStudent, leftStudent, rightStudent] = fallbackStudents;

  if (!spotlightStudent) {
    heroRoot.innerHTML = "";
    return;
  }

  heroRoot.innerHTML = `
    <div class="hero-archive-stage" aria-label="注目学生のアーカイブ">
      ${leftStudent ? `<a class="hero-archive-side hero-archive-side-left" href="#student/${escapeHtml(leftStudent.slug)}">${renderArchiveImage(leftStudent, { className: "hero-archive-side-image" })}<span class="hero-archive-side-copy"><span class="archive-number">archive ${getArchiveNumber(leftStudent)}</span><strong>${escapeHtml(leftStudent.name)}</strong><small>${escapeHtml(getStudentKeyLine(leftStudent))}</small></span></a>` : `<span class="hero-archive-side hero-archive-side-left is-empty"></span>`}
      <a class="hero-archive-center hero-archive-center-feature" href="#student/${escapeHtml(spotlightStudent.slug)}" aria-label="${escapeHtml(spotlightStudent.name)}さんの詳細を見る">
        <span class="hero-archive-media">${renderArchiveImage(spotlightStudent, { className: "hero-archive-image" })}</span>
      </a>
      ${rightStudent ? `<a class="hero-archive-side hero-archive-side-right" href="#student/${escapeHtml(rightStudent.slug)}">${renderArchiveImage(rightStudent, { className: "hero-archive-side-image" })}<span class="hero-archive-side-copy"><span class="archive-number">archive ${getArchiveNumber(rightStudent)}</span><strong>${escapeHtml(rightStudent.name)}</strong><small>${escapeHtml(getStudentKeyLine(rightStudent))}</small></span></a>` : `<span class="hero-archive-side hero-archive-side-right is-empty"></span>`}
    </div>
  `;
};

export const renderTodayQuestion = () => {
  const pickupStudents = students.filter((student) => student.featured);
  const fallbackStudents = pickupStudents.length ? pickupStudents : students.slice(0, 1);
  const [spotlightStudent] = fallbackStudents;

  selectors.todayQuestionCard.innerHTML = spotlightStudent
    ? `
      <div class="pickup-editorial">
        ${pickupSlide(spotlightStudent, 0)}
        <div class="pickup-editorial-aside" aria-label="次の注目学生">
        ${fallbackStudents.slice(1, 3)
            .map(
              (student) => `
                <a class="pickup-aside-card" href="#student/${escapeHtml(student.slug)}">
                  <span class="pickup-aside-archive">archive ${getArchiveNumber(student)}</span>
                  <strong>${escapeHtml(student.name)}</strong>
                  <small>${escapeHtml(getStudentKeyLine(student))}</small>
                  <small>${escapeHtml(student.currentQuestion || "")}</small>
                </a>
              `,
            )
            .join("")}
        </div>
      </div>
    `
    : "";

  renderPickupNoteCards(fallbackStudents);
};

export const renderPeopleGrid = () => {
  const filtered = getFilteredStudents();
  const label = getDiscoveryLabel();

  selectors.topicResultHead.innerHTML = `
    <p><span>表示中</span>${escapeHtml(label)}</p>
    <strong>${filtered.length} students</strong>
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

export const renderHome = () => {
  renderHeroVisual();
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

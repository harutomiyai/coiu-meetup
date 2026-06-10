import { students, state, getAllTopics, interestTopics } from "./state.js";
import { selectors } from "./selectors.js";

const linkOrder = ["note", "youtube", "podcast", "instagram", "x", "contact"];

export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getExternalAttributes = (url) =>
  url && url !== "#" ? ' target="_blank" rel="noreferrer"' : "";

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

const getNoteHomeUrl = (student) =>
  student.noteUsername ? `https://note.com/${student.noteUsername}` : "";

const getLinkUrl = (student, key) => {
  if (key === "note") return student.links?.note || getNoteHomeUrl(student);
  return student.links?.[key] || "";
};

const getArchiveNumber = (student) => {
  const index = students.findIndex((item) => item.slug === student.slug);
  return String(index >= 0 ? index + 1 : 0).padStart(3, "0");
};

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const getStudentKeyLine = (student) =>
  student.catch || student.currentQuestion || student.currentProject || "問いを準備中";

const getStudentStoryLead = (student) => {
  const firstSentence = String(student.story || "").split("。").find(Boolean);
  return firstSentence ? `${firstSentence}。` : student.projectDetail || student.currentQuestion || "";
};

const getStudentTalkThemes = (student) => {
  const talkTopics = asArray(student.talkTopics);
  const consult = asArray(student.canConsult);
  const tags = asArray(student.tags);
  return (talkTopics.length ? talkTopics : consult.length ? consult : tags).slice(0, 5);
};

const getSearchText = (student) =>
  [
    student.name,
    student.catch,
    student.currentProject,
    student.projectDetail,
    student.oneOnOneMessage,
    student.currentQuestion,
    student.story,
    ...asArray(student.tags),
    ...getStudentTalkThemes(student),
  ]
    .map(normalizeText)
    .join(" ");

export const hasActiveDiscoveryFilters = () =>
  state.selectedTopics.length > 0 || normalizeText(state.searchQuery).length > 0;

const getStudentTopicScore = (student) =>
  state.selectedTopics.filter((topic) => asArray(student.tags).includes(topic)).length;

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

const getFilteredStudents = () => (hasActiveDiscoveryFilters() ? getRankedStudents() : students);

const getDiscoveryLabel = () => {
  const topicLabel = state.selectedTopics.map((topic) => `#${topic}`).join(" ");
  const query = state.searchQuery.trim();

  if (topicLabel && query) return `${topicLabel} / ${query}`;
  if (topicLabel) return topicLabel;
  if (query) return `SEARCH: ${query}`;
  return "ALL STUDENTS";
};

const topicButton = (topic, isActive = false, className = "topic-chip") => `
  <button
    class="${className} ${isActive ? "is-active" : ""}"
    type="button"
    data-topic="${escapeHtml(topic)}"
    aria-pressed="${isActive ? "true" : "false"}"
  >
    ${escapeHtml(topic)}
  </button>
`;

const renderImage = (student, className, loading = "lazy") =>
  student.image
    ? `<img class="${className}" src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" loading="${loading}" />`
    : `<span class="image-fallback ${className}">${escapeHtml(student.name)}</span>`;

const renderTags = (tags = [], limit = tags.length) =>
  asArray(tags)
    .slice(0, limit)
    .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
    .join("");

const detailList = (items) => asArray(items).map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const personCard = (student) => {
  const archiveNumber = getArchiveNumber(student);

  return `
    <a
      class="feature-card"
      href="#student/${escapeHtml(student.slug)}"
      data-student-slug="${escapeHtml(student.slug)}"
      aria-label="${escapeHtml(student.name)}さんの詳細を見る"
    >
      <span class="feature-card-place">CoIU / ${escapeHtml(student.generation)}</span>
      <span class="feature-card-badge">${archiveNumber}</span>
      <span class="feature-card-number">archive ${archiveNumber}</span>
      <span class="feature-card-image-wrap">
        ${renderImage(student, "feature-card-image")}
      </span>
      <span class="feature-card-body">
        <span class="feature-card-title">${escapeHtml(student.name)}</span>
        <span class="feature-card-question">${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</span>
        <span class="feature-card-copy">${escapeHtml(getStudentStoryLead(student))}</span>
        <span class="tag-row">${renderTags(student.tags, 4)}</span>
        <span class="read-more">Read more</span>
      </span>
    </a>
  `;
};

const infoItem = (student) => `
  <a class="info-item" href="#student/${escapeHtml(student.slug)}">
    ${renderImage(student, "info-item-image")}
    <span>
      <small>${escapeHtml(student.generation)} / archive ${getArchiveNumber(student)}</small>
      <strong>${escapeHtml(student.name)}</strong>
      <em>${escapeHtml(getStudentKeyLine(student))}</em>
    </span>
  </a>
`;

const renderDetailLinks = (student) =>
  linkOrder
    .map((key) => [key, getLinkUrl(student, key)])
    .filter(([, url]) => Boolean(url))
    .map(
      ([key, url]) => `
        <a class="profile-link" href="${escapeHtml(url)}"${getExternalAttributes(url)}>
          <span>${escapeHtml(getExternalLabel(key))}</span>
          <strong>OPEN +</strong>
        </a>
      `,
    )
    .join("");

const renderInterestList = (student) => {
  const interests = asArray(student.interests).filter((interest) => interest.theme && interest.reason);
  if (!interests.length) return "";

  return `
    <section class="profile-article-block profile-interest-block">
      <div class="profile-block-head">
        <p class="section-kicker">INTEREST</p>
        <h2>関心テーマ</h2>
      </div>
      <div class="interest-list">
        ${interests
          .map(
            (interest) => `
              <article>
                <strong>${escapeHtml(interest.theme)}</strong>
                <p>${escapeHtml(interest.reason)}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
};

const relatedPostCard = (student) => `
  <a class="related-post-card" href="#student/${escapeHtml(student.slug)}">
    ${renderImage(student, "related-post-image")}
    <span>
      <small>${escapeHtml(student.generation)} / archive ${getArchiveNumber(student)}</small>
      <strong>${escapeHtml(student.name)}</strong>
      <em>${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</em>
    </span>
  </a>
`;

const renderPostList = (currentStudent, { className, title, note, sourceStudents }) => {
  const pool = sourceStudents || students;
  const relatedStudents = pool
    .filter((student) => student.slug !== currentStudent.slug)
    .slice(0, 5);

  if (!relatedStudents.length) return "";

  return `
    <section class="${className}">
      <div class="related-posts-head">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(note)}</p>
      </div>
      <div class="related-post-list">
        ${relatedStudents.map(relatedPostCard).join("")}
      </div>
    </section>
  `;
};

const renderProfileSidebar = (currentStudent) => {
  const featured = students.filter((student) => student.featured);
  const related = [...featured, ...students.filter((student) => !featured.includes(student))];
  const recent = [...students].reverse();

  return `
    <aside class="profile-sidebar" aria-label="関連する学生">
      ${renderPostList(currentStudent, {
        className: "related-posts",
        title: "RELATED POSTS",
        note: "関心が近いCoIU生",
        sourceStudents: related,
      })}
      ${renderPostList(currentStudent, {
        className: "recent-posts",
        title: "RECENT POSTS",
        note: "最近追加した学生",
        sourceStudents: recent,
      })}
    </aside>
  `;
};

export const renderHeroVisual = () => {
  if (!selectors.heroVisual) return;

  const featuredStudents = students.filter((student) => student.featured);
  const visibleStudents = (featuredStudents.length ? featuredStudents : students).slice(0, 4);

  selectors.heroVisual.innerHTML = visibleStudents.map(infoItem).join("");
};

export const renderTopicControls = () => {
  const topics = getAllTopics();
  const isSelected = (topic) => state.selectedTopics.includes(topic);

  if (selectors.themeModalTags) {
    selectors.themeModalTags.innerHTML = interestTopics
      .map((topic) => topicButton(topic, isSelected(topic), "theme-modal-tag"))
      .join("");
  }

  if (selectors.topicList) {
    selectors.topicList.innerHTML = topics
      .slice(1)
      .map((topic) => topicButton(topic, isSelected(topic), "topic-chip"))
      .join("");
  }

  if (selectors.clearTopic) {
    selectors.clearTopic.hidden = !hasActiveDiscoveryFilters();
  }
};

export const renderPeopleGrid = () => {
  if (!selectors.peopleGrid) return;

  const filtered = getFilteredStudents();

  if (selectors.topicResultHead) {
    selectors.topicResultHead.innerHTML = `
      <p>${escapeHtml(getDiscoveryLabel())}</p>
      <strong>${filtered.length} posts</strong>
    `;
  }

  if (!filtered.length) {
    selectors.peopleGrid.innerHTML = `
      <div class="empty-state">
        <h3>条件に合う学生は準備中です</h3>
        <p>別のテーマやキーワードでも探してみてください。</p>
      </div>
    `;
    return;
  }

  selectors.peopleGrid.innerHTML = filtered.map(personCard).join("");
};

export const renderDiscoveryResults = () => {
  renderTopicControls();
  renderPeopleGrid();
};

export const renderStudentDetail = (student) => {
  const archiveNumber = getArchiveNumber(student);
  const aboutParagraphs = asArray(student.about).length ? asArray(student.about) : [student.story].filter(Boolean);
  const recentActivities = asArray(student.recentActivities);
  const links = renderDetailLinks(student);
  const talkThemes = getStudentTalkThemes(student);

  selectors.studentView.innerHTML = `
    <div class="profile-news-shell">
      <a class="back-link" href="#feature">Back to students +</a>

      <div class="profile-news-layout">
        <article class="profile-article-main" aria-labelledby="detail-title">
          <header class="profile-article-header">
            <p class="profile-press-label">STUDENT PROFILE <span>ABOUT</span></p>
            <div class="profile-article-meta">
              <span>archive ${archiveNumber}</span>
              <time>2026.06 QUESTION</time>
            </div>
            <h1 id="detail-title">${escapeHtml(student.name)}｜${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</h1>
          </header>

          <div class="profile-date-strip">
            <span>CoIU / ${escapeHtml(student.generation)}</span>
            <strong>${escapeHtml(student.name)}</strong>
          </div>

          <figure class="profile-main-figure">
            <div class="profile-hero-grid">
              ${renderImage(student, "profile-main-image", "eager")}
              <div class="profile-question-tile">
                <p>QUESTION</p>
                <strong>${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</strong>
                <span>${renderTags(student.tags, 4)}</span>
              </div>
            </div>
            <figcaption>${escapeHtml(student.name)} / ${escapeHtml(getStudentKeyLine(student))}</figcaption>
          </figure>

          <p class="profile-lead">${escapeHtml(getStudentStoryLead(student))}</p>

          <div class="profile-summary-box">
            <p class="section-kicker">QUESTION</p>
            <strong>${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</strong>
            <span>${escapeHtml(student.oneOnOneMessage || "")}</span>
          </div>

          <section class="profile-article-block">
            <div class="profile-block-head">
              <p class="section-kicker">PROFILE</p>
              <h2>活動の紹介</h2>
            </div>
            ${aboutParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          </section>

          <section class="profile-article-block profile-split-block">
            <div>
              <div class="profile-block-head">
                <p class="section-kicker">TALK THEME</p>
                <h2>話せるテーマ</h2>
              </div>
              <ul class="plain-list">${detailList(talkThemes)}</ul>
            </div>
            <div>
              <div class="profile-block-head">
                <p class="section-kicker">RECENT</p>
                <h2>最近の取り組み</h2>
              </div>
              <ul class="plain-list">${detailList(recentActivities.length ? recentActivities : [student.projectDetail || student.currentProject || "準備中"])}</ul>
            </div>
          </section>

          ${renderInterestList(student)}

          ${
            links
              ? `
                <section class="profile-article-block">
                  <div class="profile-block-head">
                    <p class="section-kicker">LINK</p>
                    <h2>外部で活動を見る</h2>
                  </div>
                  <div class="profile-links">${links}</div>
                </section>
              `
              : ""
          }
        </article>

        ${renderProfileSidebar(student)}
      </div>
    </div>
  `;
};

export const renderHome = () => {
  renderHeroVisual();
  renderDiscoveryResults();
};

export const renderLoadError = (error) => {
  console.error(error);
  if (!selectors.homeView) return;

  selectors.homeView.innerHTML = `
    <section class="section">
      <div class="empty-state">
        <h3>学生データを読み込めませんでした</h3>
        <p>時間をおいて再読み込みしてください。</p>
      </div>
    </section>
  `;
  if (selectors.studentView) selectors.studentView.hidden = true;
};

import { students, projects, state, getAllTopics, interestTopics, getProjectBySlug, getMemberStudents } from "./state.js";
import { selectors } from "./selectors.js";
import { fetchNoteArticles } from "../lib/noteRss.js";

const linkOrder = ["note", "youtube", "podcast", "instagram", "x", "contact"];
const HOME_STUDENT_LIMIT = 8;
const CONTENT_FEED_SOURCE = {
  name: "宮井陽音",
  image: "/images/students/haruto.jpg",
  noteUsername: "haruto_miyai",
  noteRssUrl: "https://note.com/haruto_miyai/m/ma9c2b38ca7c1/rss",
  links: {
    note: "https://note.com/haruto_miyai",
  },
};

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

const getGenerationLabel = (student) => student.generation || "1期生";

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

const isStudentsPage = () => document.body.dataset.page === "students";

const detailList = (items) => asArray(items).map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const personCard = (student) => {
  const genLabel = getGenerationLabel(student);

  return `
    <a
      class="feature-card"
      href="#student/${escapeHtml(student.slug)}"
      data-student-slug="${escapeHtml(student.slug)}"
      aria-label="${escapeHtml(student.name)}さんの詳細を見る"
    >
      <span class="feature-card-place">CoIU / ${escapeHtml(student.generation)}</span>
      <span class="feature-card-badge">${escapeHtml(genLabel)}</span>
      <span class="feature-card-number">${escapeHtml(genLabel)}</span>
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
      <small>CoIU / ${escapeHtml(getGenerationLabel(student))}</small>
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
      <small>CoIU / ${escapeHtml(getGenerationLabel(student))}</small>
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

const questionSearchButton = (question) => `
  <button class="question-chip" type="button" data-question-search="${escapeHtml(question)}">
    ${escapeHtml(question)}
  </button>
`;

const contentCard = (article) => {
  const authorName = article.creatorName || CONTENT_FEED_SOURCE.name;
  const authorImage = article.creatorImage || CONTENT_FEED_SOURCE.image;

  return `
    <a class="content-card" href="${escapeHtml(article.link)}" target="_blank" rel="noreferrer">
      <span class="content-thumb">
        ${
          article.thumbnail
            ? `<img src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(article.title)}" loading="lazy" />`
            : `<span class="content-thumb-fallback">note</span>`
        }
      </span>
      <span class="content-card-body">
        <small>note / ${escapeHtml(article.pubDate || "投稿日未取得")}</small>
        <strong>${escapeHtml(article.title)}</strong>
        <span class="content-card-excerpt">${article.excerpt ? escapeHtml(article.excerpt.length > 60 ? article.excerpt.slice(0, 60) + "…" : article.excerpt) : ""}</span>
        <em>
          <img src="${escapeHtml(authorImage)}" alt="" loading="lazy" />
          ${escapeHtml(authorName)}
        </em>
      </span>
    </a>
  `;
};

const renderNoteFeed = async () => {
  if (!selectors.noteFeedGrid) return;

  try {
    const articles = await fetchNoteArticles(CONTENT_FEED_SOURCE, { limit: 8 });
    if (!articles.length) throw new Error("No note articles found.");

    const cards = articles.map(contentCard).join("");
    selectors.noteFeedGrid.innerHTML = `${cards}${cards}`;
  } catch (error) {
    console.info("content feed could not be loaded.", error);
    selectors.noteFeedGrid.innerHTML = `
      <article class="content-card content-card-loading">
        <span class="content-thumb"></span>
        <span class="content-card-body">
          <small>note</small>
          <strong>記事を取得できませんでした</strong>
          <em>${escapeHtml(CONTENT_FEED_SOURCE.name)}</em>
        </span>
      </article>
    `;
  }
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

  if (selectors.searchModalTags) {
    selectors.searchModalTags.innerHTML = interestTopics
      .map((topic) => topicButton(topic, isSelected(topic), "search-modal-tag"))
      .join("");
  }

  if (selectors.searchModalQuestions) {
    selectors.searchModalQuestions.innerHTML = students
      .map((student) => student.currentQuestion)
      .filter(Boolean)
      .slice(0, 6)
      .map(questionSearchButton)
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
  const visibleStudents = isStudentsPage() ? filtered : filtered.slice(0, HOME_STUDENT_LIMIT);

  if (selectors.topicResultHead) {
    selectors.topicResultHead.innerHTML = `
      <p>${escapeHtml(getDiscoveryLabel())}</p>
      <strong>${isStudentsPage() ? filtered.length : visibleStudents.length} / ${filtered.length} posts</strong>
    `;
  }

  if (selectors.peopleMore) {
    selectors.peopleMore.hidden = isStudentsPage() || filtered.length <= HOME_STUDENT_LIMIT;
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

  selectors.peopleGrid.innerHTML = visibleStudents.map(personCard).join("");
};

export const renderDiscoveryResults = () => {
  renderTopicControls();
  renderPeopleGrid();
};

const renderSingleProjectCard = (project) => `
  <a class="profile-project-card" href="/students.html#project/${escapeHtml(project.slug)}">
    <div class="profile-project-card-tags">${(project.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
    <strong class="profile-project-card-title">${escapeHtml(project.title)}</strong>
    <p class="profile-project-card-summary">${escapeHtml(project.summary)}</p>
    <span class="profile-project-card-link">プロジェクト詳細 →</span>
  </a>
`;

const renderProjectSection = (student) => {
  const slugs = asArray(student.projectSlugs).length
    ? asArray(student.projectSlugs)
    : student.projectSlug
    ? [student.projectSlug]
    : [];
  const projectList = slugs.map(getProjectBySlug).filter(Boolean);
  if (!projectList.length) return "";

  const gridClass = projectList.length > 1 ? "profile-projects-grid" : "";

  return `
    <section class="profile-article-block profile-project-block">
      <div class="profile-block-head">
        <p class="section-kicker">PROJECT</p>
        <h2>取り組んでいるプロジェクト</h2>
      </div>
      <div class="${gridClass}">
        ${projectList.map(renderSingleProjectCard).join("")}
      </div>
    </section>
  `;
};

export const renderStudentDetail = (student) => {
  const genLabel = getGenerationLabel(student);
  const aboutParagraphs = asArray(student.about).length ? asArray(student.about) : [student.story].filter(Boolean);
  const links = renderDetailLinks(student);

  selectors.studentView.innerHTML = `
    <div class="profile-news-shell">
      <a class="back-link" href="#feature">Back to students +</a>

      <div class="profile-news-layout">
        <article class="profile-article-main" aria-labelledby="detail-title">
          <header class="profile-article-header">
            <p class="profile-press-label">STUDENT PROFILE <span>ABOUT</span></p>
            <div class="profile-article-meta">
              <span>CoIU / ${escapeHtml(genLabel)}</span>
              <time>2026.06 QUESTION</time>
            </div>
            <h1 id="detail-title">${escapeHtml(student.name)}｜${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</h1>
          </header>

          <div class="profile-date-strip">
            <span>CoIU / ${escapeHtml(student.generation)}</span>
            <strong>${escapeHtml(student.name)}</strong>
          </div>

          <figure class="profile-main-figure">
            ${renderImage(student, "profile-main-image", "eager")}
            <figcaption class="profile-main-figcaption">
              <strong class="profile-main-name">${escapeHtml(student.name)}</strong>
              <span class="tag-row">${renderTags(student.tags, 4)}</span>
            </figcaption>
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

          ${renderProjectSection(student)}

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

      </div>
    </div>
  `;
};

export const renderProjectDetail = (project, { backUrl } = {}) => {
  const members = getMemberStudents(project);
  const resolvedBackUrl = backUrl ?? (isStudentsPage() ? "#" : "#feature");

  selectors.studentView.innerHTML = `
    <div class="profile-news-shell">
      <a class="back-link" href="${escapeHtml(resolvedBackUrl)}">Back to projects +</a>
      <div class="profile-news-layout">
        <article class="profile-article-main" aria-labelledby="project-detail-title">
          <header class="profile-article-header">
            <p class="profile-press-label">PROJECT <span>DETAIL</span></p>
            <div class="profile-article-meta">
              <span>${(project.tags || []).join(" / ")}</span>
              <span class="profile-project-status">${escapeHtml(project.status === "active" ? "進行中" : project.status || "")}</span>
            </div>
            <h1 id="project-detail-title">${escapeHtml(project.title)}</h1>
          </header>

          <section class="profile-article-block">
            <div class="profile-block-head">
              <p class="section-kicker">OVERVIEW</p>
              <h2>プロジェクト概要</h2>
            </div>
            <p>${escapeHtml(project.detail || project.summary)}</p>
          </section>

          ${members.length ? `
            <section class="profile-article-block">
              <div class="profile-block-head">
                <p class="section-kicker">MEMBERS</p>
                <h2>メンバー</h2>
              </div>
              <div class="profile-project-member-list">
                ${members.map((m) => `
                  <a class="profile-project-member" href="/students.html#student/${escapeHtml(m.slug)}">
                    ${m.image ? `<img src="${escapeHtml(m.image)}" alt="${escapeHtml(m.name)}" />` : ""}
                    <div>
                      <strong>${escapeHtml(m.name)}</strong>
                      <p>${escapeHtml(m.catch || m.currentQuestion || "")}</p>
                    </div>
                  </a>
                `).join("")}
              </div>
            </section>
          ` : ""}
        </article>
      </div>
    </div>
  `;
};

const projectCard = (project, index) => {
  const members = getMemberStudents(project);
  const leadMember = members[0];
  const num = String(index + 1).padStart(3, "0");
  return `
    <a
      class="feature-card"
      href="#project/${escapeHtml(project.slug)}"
      aria-label="${escapeHtml(project.title)}の詳細を見る"
    >
      <span class="feature-card-place">CoIU Project</span>
      <span class="feature-card-badge">${num}</span>
      <span class="feature-card-number">project ${num}</span>
      <span class="feature-card-image-wrap">
        ${leadMember?.image
          ? `<img class="feature-card-image" src="${escapeHtml(leadMember.image)}" alt="${escapeHtml(project.title)}" loading="lazy" />`
          : `<span class="image-fallback feature-card-image">${escapeHtml(project.title[0])}</span>`
        }
      </span>
      <span class="feature-card-body">
        <span class="feature-card-title">${escapeHtml(project.title)}</span>
        <span class="feature-card-question">${escapeHtml(project.summary)}</span>
        <span class="tag-row">${(project.tags || []).slice(0, 4).map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</span>
        <span class="read-more">Read more</span>
      </span>
    </a>
  `;
};

const renderProjectGrid = () => {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;
  if (!projects.length) { grid.innerHTML = ""; return; }
  grid.innerHTML = projects.map((p, i) => projectCard(p, i)).join("");
};

export const renderHome = () => {
  renderHeroVisual();
  renderDiscoveryResults();
  renderNoteFeed();
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

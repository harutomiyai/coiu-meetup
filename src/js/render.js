import { students, projects, state, getAllTopics, getInterestTopics, getProjectBySlug, getMemberStudents, getParentTagsForStudent, tagCategories, shuffled } from "./state.js";
import { selectors } from "./selectors.js";
import { fetchNoteArticles } from "../lib/noteRss.js";

const linkOrder = ["contact", "note", "youtube", "podcast", "instagram", "x"];
const HOME_STUDENT_LIMIT = 8;
const CONTENT_FEED_SOURCE = {
  name: "宮井陽音",
  image: "/images/students/haruto.webp",
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
    contact: "話しかける",
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
    ...getParentTagsForStudent(student),
    ...getStudentTalkThemes(student),
  ]
    .map(normalizeText)
    .join(" ");

export const hasActiveDiscoveryFilters = () =>
  state.selectedTopics.length > 0 || normalizeText(state.searchQuery).length > 0;

const getStudentTopicScore = (student) => {
  const parentTags = getParentTagsForStudent(student);
  return state.selectedTopics.filter((topic) => parentTags.includes(topic)).length;
};

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

const toWebP = (src) => src ? src.replace(/\.(jpe?g|png)$/i, ".webp") : src;

const positionStyle = (pos) => {
  if (!pos) return "";
  const map = { top: "center top", center: "center center", bottom: "center bottom" };
  const val = map[pos] ?? pos;
  return ` style="object-position:${val}"`;
};

const renderImage = (student, className, loading = "lazy") =>
  student.image
    ? `<picture><source srcset="${escapeHtml(toWebP(student.image))}" type="image/webp" /><img class="${className}" src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" loading="${loading}" decoding="async"${positionStyle(student.imagePosition)} /></picture>`
    : `<span class="image-fallback ${className}">${escapeHtml(student.name)}</span>`;

const renderTags = (tags = [], limit = tags.length) =>
  asArray(tags)
    .slice(0, limit)
    .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
    .join("");

const renderParentTags = (student, limit = 4) => {
  const parents = getParentTagsForStudent(student).slice(0, limit);
  return parents.map((tag) => `<span class="tag-pill tag-pill--parent">${escapeHtml(tag)}</span>`).join("");
};

const renderDetailTagGroups = (student) => {
  const childTags = asArray(student.tags);
  const groups = tagCategories
    .map((cat) => {
      const matched = childTags.filter((t) => cat.children.includes(t));
      return matched.length ? { label: cat.label, tags: matched } : null;
    })
    .filter(Boolean);
  if (!groups.length) return renderTags(childTags);
  return groups.map((g) => `
    <span class="tag-group">
      <span class="tag-pill tag-pill--parent">${escapeHtml(g.label)}</span>
      ${g.tags.map((t) => `<span class="tag-pill tag-pill--child">${escapeHtml(t)}</span>`).join("")}
    </span>
  `).join("");
};

const isStudentsPage = () => document.body.dataset.page === "students";

const detailList = (items) => asArray(items).map((item) => `<li>${escapeHtml(item)}</li>`).join("");

export const personCard = (student) => {
  const genLabel = getGenerationLabel(student);

  return `
    <a
      class="feature-card"
      href="/students/${escapeHtml(student.slug)}.html"
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
        <span class="tag-row">${renderParentTags(student)}</span>
        <span class="read-more">Read more</span>
      </span>
    </a>
  `;
};

const infoItem = (student) => `
  <a class="info-item" href="/students/${escapeHtml(student.slug)}.html">
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
  <a class="related-post-card" href="/students/${escapeHtml(student.slug)}.html">
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
      <span class="content-card-overlay">
        <span class="content-card-overlay-btn">記事を見る ▶</span>
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
    selectors.searchModalTags.innerHTML = getInterestTopics()
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
  const pool = isStudentsPage() ? filtered : shuffled(filtered);
  const visibleStudents = isStudentsPage() ? filtered : pool.slice(0, HOME_STUDENT_LIMIT);

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
  <a class="project-related-card" href="/projects/${escapeHtml(project.slug)}.html">
    ${project.image ? `<picture><source srcset="${escapeHtml(toWebP(project.image))}" type="image/webp" /><img class="project-related-img" src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" loading="lazy" decoding="async" /></picture>` : `<div class="project-related-img project-related-img--empty"></div>`}
    <div class="project-related-body">
      <div class="project-related-tags">${(project.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
      <strong>${escapeHtml(project.title)}</strong>
    </div>
  </a>
`;

const renderInterviewItem = (item) => {
  const image = item.image
    ? `<figure class="interview-figure">
        <picture><source srcset="${escapeHtml(toWebP(item.image))}" type="image/webp" /><img class="interview-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || "")}" loading="lazy" decoding="async" /></picture>
        ${item.imageCaption ? `<figcaption class="interview-figcaption">${escapeHtml(item.imageCaption)}</figcaption>` : ""}
      </figure>`
    : "";
  const quote = item.quote
    ? `<blockquote class="interview-quote">${escapeHtml(item.quote)}</blockquote>`
    : "";
  return `
    <li class="interview-item">
      <p class="interview-q">${escapeHtml(item.question)}</p>
      <p class="interview-a">${escapeHtml(item.answer)}</p>
      ${quote}
      ${image}
    </li>
  `;
};

const renderInterviewSection = (student) => {
  const items = asArray(student.interview);
  if (!items.length) return "";
  return `
    <section class="profile-article-block profile-interview">
      <div class="profile-block-head">
        <p class="section-kicker">INTERVIEW</p>
        <h2>インタビュー</h2>
      </div>
      <ol class="interview-list">
        ${items.map(renderInterviewItem).join("")}
      </ol>
    </section>
  `;
};

const renderProjectSection = (student) => {
  const slugs = asArray(student.projectSlugs).length
    ? asArray(student.projectSlugs)
    : student.projectSlug
    ? [student.projectSlug]
    : [];
  const projectList = slugs.map(getProjectBySlug).filter(Boolean);
  if (!projectList.length) return "";

  return `
    <section class="profile-article-block profile-project-block">
      <div class="profile-block-head">
        <p class="section-kicker">PROJECT</p>
        <h2>取り組んでいるプロジェクト</h2>
      </div>
      <div class="project-related-list">
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
      <div class="profile-news-layout">
        <article class="profile-article-main" aria-labelledby="detail-title">
          <header class="profile-article-header">
            <p class="section-kicker">STUDENT PROFILE</p>
            <div class="profile-article-meta">
              <span class="profile-article-gen">CoIU / ${escapeHtml(genLabel)}</span>
            </div>
            <div class="profile-article-tags">${renderParentTags(student)}</div>
            <h1 id="detail-title">${escapeHtml(student.name)}｜${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</h1>
          </header>

          <figure class="profile-main-figure">
            ${renderImage(student, "profile-main-image", "eager")}
            <figcaption class="profile-main-figcaption">
              ${student.nameRoman ? `<span class="section-kicker eyebrow">${escapeHtml(student.nameRoman)}</span>` : ""}
              <strong class="profile-main-name">${escapeHtml(student.name)}</strong>
              ${student.bio ? `<p class="profile-main-bio">${escapeHtml(student.bio)}</p>` : ""}
            </figcaption>
          </figure>

<div class="profile-summary-box">
            <p class="section-kicker">QUESTION</p>
            <strong>${escapeHtml(student.currentQuestion || getStudentKeyLine(student))}</strong>
          </div>

          <section class="profile-article-block">
            <div class="profile-block-head">
              <p class="section-kicker">PROFILE</p>
              <h2>活動の紹介</h2>
            </div>
            ${aboutParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          </section>

          ${renderInterviewSection(student)}

          ${renderProjectSection(student)}

          ${
            student.spotifyEmbedUrl
              ? `
                <section class="profile-article-block">
                  <div class="profile-block-head">
                    <p class="section-kicker">PODCAST</p>
                    <h2>Podcast</h2>
                  </div>
                  <iframe
                    style="border-radius:12px"
                    src="${student.spotifyEmbedUrl}"
                    width="100%"
                    height="152"
                    frameborder="0"
                    allowfullscreen=""
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  ></iframe>
                </section>
              `
              : ""
          }

          ${
            links
              ? `
                <section class="profile-article-block">
                  <div class="profile-block-head">
                    <p class="section-kicker">CONTACT</p>
                    <h2>つながる</h2>
                  </div>
                  <div class="profile-links">${links}</div>
                </section>
              `
              : ""
          }

          <section class="profile-article-block profile-request-block">
            <div class="profile-block-head">
              <p class="section-kicker">FEEDBACK</p>
              <h2>リクエスト・報告</h2>
            </div>
            <p>掲載内容への修正リクエストや誤りの報告はこちらから送っていただけます。</p>
            <a class="profile-request-link" href="https://forms.gle/oom12dSjt1KxMpkj9" target="_blank" rel="noopener noreferrer">フォームを開く</a>
          </section>
        </article>

      </div>
    </div>
  `;
};

const renderProjectTimeline = (project) => {
  const timeline = asArray(project.timeline).filter((e) => e.date && e.label);
  if (!timeline.length) return "";

  return `
    <section class="project-detail-section project-timeline-section">
      <p class="section-kicker">TIMELINE</p>
      <h2>活動の記録</h2>
      <ol class="project-timeline">
        ${timeline.map((entry, i) => `
          <li class="project-timeline-item${i === timeline.length - 1 ? " is-latest" : ""}">
            <div class="project-timeline-dot"></div>
            <div class="project-timeline-content">
              <time class="project-timeline-date">${escapeHtml(entry.date)}</time>
              <strong class="project-timeline-label">${escapeHtml(entry.label)}</strong>
              ${entry.body ? `<p class="project-timeline-body">${escapeHtml(entry.body)}</p>` : ""}
            </div>
          </li>
        `).join("")}
      </ol>
    </section>
  `;
};

export const renderProjectDetail = (project, { backUrl } = {}) => {
  const members = getMemberStudents(project);
  const related = projects
    .filter((p) => p.slug !== project.slug && (p.tags || []).some((t) => (project.tags || []).includes(t)))
    .slice(0, 3);
  const resolvedBackUrl = backUrl ?? (isStudentsPage() ? "#" : "#feature");

  selectors.studentView.innerHTML = `
    <div class="project-detail-page">
      <div class="project-detail-hero">
        <div class="project-detail-hero-inner">
          <div class="project-detail-meta">
            ${(project.tags || []).map((t) => `<a class="project-detail-tag" href="/projects.html?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join("")}
          </div>
          <h1 class="project-detail-title" id="project-detail-title">${escapeHtml(project.title)}</h1>
        </div>
      </div>

      ${project.image ? `
        <div class="project-detail-img-wrap">
          <picture><source srcset="${escapeHtml(toWebP(project.image))}" type="image/webp" /><img class="project-detail-image" src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" loading="lazy" decoding="async" /></picture>
        </div>
      ` : ""}

      <div class="project-detail-body">
        <section class="project-detail-section">
          <p class="section-kicker">OVERVIEW</p>
          <h2>プロジェクト概要</h2>
          <p>${escapeHtml(project.detail || project.summary).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
        </section>

        ${renderProjectTimeline(project)}

        ${members.length ? `
          <section class="project-detail-section">
            <p class="section-kicker">MEMBERS</p>
            <h2>メンバー</h2>
            <div class="profile-project-member-list">
              ${members.map((m) => `
                <a class="profile-project-member" href="/students/${escapeHtml(m.slug)}.html">
                  ${m.image ? `<picture><source srcset="${escapeHtml(toWebP(m.image))}" type="image/webp" /><img src="${escapeHtml(m.image)}" alt="${escapeHtml(m.name)}" loading="lazy" decoding="async" /></picture>` : ""}
                  <div>
                    <strong>${escapeHtml(m.name)}</strong>
                    <p>${escapeHtml(m.catch || m.currentQuestion || "")}</p>
                  </div>
                </a>
              `).join("")}
            </div>
          </section>
        ` : ""}
        ${related.length ? `
          <section class="project-detail-section">
            <p class="section-kicker">RELATED</p>
            <h2>関連プロジェクト</h2>
            <div class="project-related-list">
              ${related.map((p) => `
                <a class="project-related-card" href="/projects/${escapeHtml(p.slug)}.html">
                  ${p.image ? `<picture><source srcset="${escapeHtml(toWebP(p.image))}" type="image/webp" /><img class="project-related-img" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async" /></picture>` : `<div class="project-related-img project-related-img--empty"></div>`}
                  <div class="project-related-body">
                    <div class="project-related-tags">
                      ${(p.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
                    </div>
                    <strong class="project-related-title">${escapeHtml(p.title)}</strong>
                  </div>
                </a>
              `).join("")}
            </div>
          </section>
        ` : ""}
      </div>
    </div>
  `;
};

const projectCard = (project, index) => {
  const members = getMemberStudents(project);
  const leadMember = members[0];
  const img = project.image ?? leadMember?.image ?? "";
  const num = String(index + 1).padStart(3, "0");
  return `
    <a
      class="feature-card"
      href="/projects/${escapeHtml(project.slug)}.html"
      aria-label="${escapeHtml(project.title)}の詳細を見る"
    >
      <span class="feature-card-place">CoIU Project</span>
      <span class="feature-card-badge">${num}</span>
      <span class="feature-card-image-wrap">
        ${img
          ? `<picture><source srcset="${escapeHtml(toWebP(img))}" type="image/webp" /><img class="feature-card-image" src="${escapeHtml(img)}" alt="${escapeHtml(project.title)}" loading="lazy" decoding="async" /></picture>`
          : `<span class="image-fallback feature-card-image">${escapeHtml(project.title[0])}</span>`
        }
      </span>
      <span class="feature-card-body">
        <span class="feature-card-title">${escapeHtml(project.title)}</span>
        <span class="feature-card-question">${escapeHtml(project.summary)}</span>
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

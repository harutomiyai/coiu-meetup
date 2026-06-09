import { students, state, fixedTopics, featureCards, getAllTopics } from "./state.js";
import { selectors } from "./selectors.js";

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
  <a class="card-image" href="#student/${escapeHtml(student.slug)}" aria-label="${escapeHtml(student.name)}さんの詳細を見る">
    <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
  </a>
`;

const personCard = (student, variant = "grid") => `
  <article class="person-card person-card-${variant}">
    ${cardImage(student)}
    <div class="person-card-body">
      <div class="card-meta">
        <span>QUESTION</span>
        <span>${escapeHtml(student.tags[0] || "CoIU")}</span>
      </div>
      <h3>${escapeHtml(student.currentQuestion)}</h3>
      <p class="person-name">${escapeHtml(student.name)} / ${escapeHtml(student.generation)}</p>
      <p class="person-catch">${escapeHtml(student.catch)}</p>
      <div class="talk-row">
        ${student.talkTopics.slice(0, 3).map(talkPill).join("")}
      </div>
      <p class="activity-line">${escapeHtml(student.currentProject)}</p>
      <div class="tag-row">
        ${student.tags.slice(0, 4).map(tagPill).join("")}
      </div>
      <div class="card-actions">
        <a class="button button-dark button-small" href="#student/${escapeHtml(student.slug)}">話してみる</a>
      </div>
    </div>
  </article>
`;

const todayQuestionCard = (student) => `
  <article class="today-card question-led-card">
    <a class="today-image" href="#student/${escapeHtml(student.slug)}">
      <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
    </a>
    <div class="today-body">
      <p class="eyebrow">TODAY'S QUESTION</p>
      <div class="question-feature">
        <span>今、聞いてみたい問い</span>
        <strong>${escapeHtml(student.currentQuestion)}</strong>
      </div>
      <h3>${escapeHtml(student.name)}</h3>
      <p class="today-catch">${escapeHtml(student.catch)}</p>
      <div class="talk-row">
        ${student.talkTopics.map(talkPill).join("")}
      </div>
      <p class="activity-line">${escapeHtml(student.currentProject)}</p>
      <a class="button button-dark" href="#student/${escapeHtml(student.slug)}">この人と話してみる</a>
    </div>
  </article>
`;

const recentQuestionCard = (student, index) => `
  <article class="question-card">
    <a href="#student/${escapeHtml(student.slug)}">
      <span>QUESTION ${String(index + 1).padStart(2, "0")}</span>
      <h3>${escapeHtml(student.currentQuestion)}</h3>
      <p>${escapeHtml(student.name)} / ${escapeHtml(student.tags.slice(0, 2).join("・"))}</p>
      <div class="talk-row">
        ${student.talkTopics.slice(0, 2).map(talkPill).join("")}
      </div>
    </a>
  </article>
`;

const topicFeatureCard = (feature, index) => `
  <article class="story-card" data-topic="${escapeHtml(feature.topic)}" tabindex="0" role="button" aria-label="${escapeHtml(feature.title)}を探す">
    <img src="${escapeHtml(feature.image)}" alt="" />
    <div class="story-body">
      <span>THEME ${String(index + 1).padStart(2, "0")}</span>
      <h3>${escapeHtml(feature.title)}</h3>
      <p>${escapeHtml(feature.copy)}</p>
      <strong>#${escapeHtml(feature.topic)}</strong>
    </div>
  </article>
`;

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
      <a class="back-link" href="#topics">問いに戻る</a>
      <div class="detail-hero">
        <div class="detail-image">
          <img src="${escapeHtml(student.image)}" alt="${escapeHtml(student.name)}さんの写真" />
        </div>
        <div class="detail-main">
          <p class="eyebrow">${escapeHtml(student.generation)} / CoIU QUESTIONS</p>
          <h1>${escapeHtml(student.currentQuestion)}</h1>
          <p class="person-name detail-name">${escapeHtml(student.name)}</p>
          <p class="detail-catch">${escapeHtml(student.catch)}</p>
          <div class="tag-row">
            ${student.tags.map(tagPill).join("")}
          </div>
          <div class="question-feature detail-question">
            <span>この問いについて話せます</span>
            <strong>${escapeHtml(student.oneOnOneMessage)}</strong>
          </div>
          <a class="button button-dark" href="${escapeHtml(getContactLink(student))}" target="_blank" rel="noreferrer">
            この人と話してみる
          </a>
        </div>
      </div>

      <div class="detail-grid">
        <article class="detail-card detail-profile">
          <p class="eyebrow">PROFILE</p>
          <h2>本文プロフィール</h2>
          <p>${escapeHtml(student.story)}</p>
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
          <p class="eyebrow">1on1 MESSAGE</p>
          <h2>1on1したい人へ</h2>
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

  selectors.heroTopics.innerHTML = fixedTopics
    .slice(0, 8)
    .map((topic) => topicButton(topic, topic === state.selectedTopic, "hero-tag"))
    .join("");

  selectors.topicList.innerHTML = topics
    .slice(1)
    .map((topic) => topicButton(topic, topic === state.selectedTopic, "topic-chip"))
    .join("");
};

export const renderFeatured = () => {
  selectors.featuredGrid.innerHTML = students
    .filter((student) => student.featured)
    .slice(0, 3)
    .map((student) => personCard(student, "featured"))
    .join("");
};

export const renderTodayQuestion = () => {
  const picked = students.find((student) => student.today) || students[0];
  selectors.todayQuestionCard.innerHTML = todayQuestionCard(picked);
};

export const renderPeopleGrid = () => {
  const filtered = getFilteredStudents();
  const label =
    state.selectedTopic === "すべて"
      ? "気になるテーマから、問いを持つ人を探す"
      : `#${state.selectedTopic} の問いから人を探す`;

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
  const questionCards = students.map(recentQuestionCard).join("");
  const topicCards = featureCards.map(topicFeatureCard).join("");
  selectors.recentQuestions.innerHTML = questionCards + topicCards;
};

export const renderHome = () => {
  renderTopicControls();
  renderTodayQuestion();
  renderFeatured();
  renderPeopleGrid();
  renderRecentQuestions();
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

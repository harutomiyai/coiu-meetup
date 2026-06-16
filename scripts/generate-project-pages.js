#!/usr/bin/env node
// Generates projects/<slug>.html for each project before the Vite build.
// Each file gets project-specific meta tags for SEO, then the client-side
// JS loads the full detail view at runtime.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const BASE_URL = "https://coiu-meetup.vercel.app";

const index = JSON.parse(
  readFileSync(resolve(root, "public/data/projects/index.json"), "utf-8")
);

// メンバー解決用に全学生データを事前ロード
const studentsIndex = JSON.parse(
  readFileSync(resolve(root, "public/data/students/index.json"), "utf-8")
);
const allStudents = studentsIndex.map((entry) =>
  JSON.parse(readFileSync(resolve(root, `public${entry.path}`), "utf-8"))
);

mkdirSync(resolve(root, "projects"), { recursive: true });

for (const entry of index) {
  const project = JSON.parse(
    readFileSync(resolve(root, `public${entry.path}`), "utf-8")
  );

  const { slug, title, summary, image, tags = [] } = project;
  const url = `${BASE_URL}/projects/${slug}.html`;
  const ogImage = image ? `${BASE_URL}${image}` : `${BASE_URL}/images/hero/coiu-students.jpg`;
  const description = summary || title;
  const keywords = ["CoIU", "CoIU Meetup", "学生プロジェクト", ...tags].join(", ");

  const webpImage = image ? image.replace(/\.(jpe?g|png)$/i, ".webp") : null;
  const tagPills = tags.map((t) => `<span class="project-detail-tag">${escHtml(t)}</span>`).join("");

  // ---- JSON-LD: build as object, serialize with JSON.stringify ----
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: ogImage,
    inLanguage: "ja",
    ...(tags.length ? { keywords: tags.join(", ") } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: "CoIU Meetup",
      url: `${BASE_URL}/`,
    },
  };

  // ---- prerender: image ----
  const imgHtml = image ? `
        <div class="project-detail-img-wrap">
          <picture>
            ${webpImage ? `<source srcset="${escAttr(webpImage)}" type="image/webp" />` : ""}
            <img class="project-detail-image" src="${escAttr(image)}" alt="${escAttr(title)}" loading="eager" decoding="async" fetchpriority="high" width="680" height="510" />
          </picture>
        </div>` : "";

  // ---- prerender: OVERVIEW ----
  const detailText = project.detail || project.summary || "";
  const overviewHtml = detailText
    ? `
        <section class="project-detail-section">
          <div class="project-block-head">
            <p class="section-kicker">OVERVIEW</p>
            <h2>プロジェクト概要</h2>
          </div>
          ${detailText
            .split(/\n\n+/)
            .map((block) => `<p>${escHtml(block.replace(/\n/g, " "))}</p>`)
            .join("\n          ")}
        </section>`
    : "";

  // ---- prerender: TIMELINE ----
  const timelineItems = Array.isArray(project.timeline)
    ? project.timeline.filter((e) => e.date && e.label)
    : [];
  const timelineHtml = timelineItems.length
    ? `
        <section class="project-detail-section project-timeline-section">
          <p class="section-kicker">TIMELINE</p>
          <h2>活動の記録</h2>
          <ol class="project-timeline">
            ${timelineItems.map((entry, i) => `<li class="project-timeline-item${i === timelineItems.length - 1 ? " is-latest" : ""}">
              <div class="project-timeline-dot"></div>
              <div class="project-timeline-content">
                <time class="project-timeline-date">${escHtml(entry.date)}</time>
                <strong class="project-timeline-label">${escHtml(entry.label)}</strong>
                ${entry.body ? `<p class="project-timeline-body">${escHtml(entry.body)}</p>` : ""}
              </div>
            </li>`).join("\n            ")}
          </ol>
        </section>`
    : "";

  // ---- prerender: MEMBERS ----
  const memberSlugs = [
    ...( Array.isArray(project.projectSlugs) ? project.projectSlugs : []),
    ...( Array.isArray(project.members) ? project.members : []),
  ];
  const members = memberSlugs
    .map((s) => allStudents.find((st) => st.slug === s))
    .filter(Boolean);

  const membersHtml = members.length
    ? `
        <section class="project-detail-section">
          <p class="section-kicker">MEMBERS</p>
          <h2>メンバー</h2>
          <div class="profile-project-member-list">
            ${members.map((m) => {
              const mWebp = m.image ? m.image.replace(/\.(jpe?g|png)$/i, ".webp") : null;
              const mImg = m.image
                ? `<picture><source srcset="${escAttr(mWebp || m.image)}" type="image/webp" /><img src="${escAttr(m.image)}" alt="${escAttr(m.name)}" loading="lazy" decoding="async" /></picture>`
                : "";
              return `<a class="profile-project-member" href="/students/${escAttr(m.slug)}.html">
              ${mImg}
              <div>
                <strong>${escHtml(m.name)}</strong>
                <p>${escHtml(m.catch || m.currentQuestion || "")}</p>
              </div>
            </a>`;
            }).join("\n            ")}
          </div>
        </section>`
    : "";

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <title>${escHtml(title)} | CoIU Meetup</title>
    <meta name="description" content="${escAttr(description)}" />
    <meta name="keywords" content="${escAttr(keywords)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${escAttr(title)} | CoIU Meetup" />
    <meta property="og:description" content="${escAttr(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="CoIU Meetup" />
    <meta property="og:locale" content="ja_JP" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">
    ${JSON.stringify(ldJson, null, 2).split("\n").join("\n    ")}
    </script>
    ${image ? `<link rel="preload" as="image" href="${escAttr(webpImage || image)}" fetchpriority="high" />` : ""}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'" />
    <noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap" rel="stylesheet" /></noscript>
    <script type="module" src="/src/project-detail.js"></script>
  </head>
  <body data-page="project-detail" data-slug="${escAttr(slug)}">
    <header class="site-header">
      <a class="brand" href="/index.html" aria-label="CoIU Meetup トップへ">
        <span class="brand-kana">こういう学生に会える場所</span>
        <span class="brand-logo">CoIU meetup ...</span>
      </a>
      <button class="hamburger" type="button" id="hamburger-btn" aria-label="メニューを開く" aria-expanded="false" aria-controls="nav-drawer">
        <span></span><span></span><span></span>
      </button>
    </header>

    <div class="nav-drawer" id="nav-drawer" aria-hidden="true">
      <div class="nav-drawer-backdrop" id="nav-drawer-backdrop"></div>
      <div class="nav-drawer-panel">
        <button class="nav-drawer-close" type="button" id="nav-drawer-close" aria-label="メニューを閉じる">×</button>
        <div class="nav-drawer-search">
          <p class="nav-drawer-search-label">検索ワード</p>
          <form class="nav-drawer-search-form" id="drawer-search-form">
            <label class="sr-only" for="drawer-search-input">キーワードで検索</label>
            <div class="nav-drawer-search-row">
              <input id="drawer-search-input" class="nav-drawer-search-input" type="search" placeholder="名前・問い・テーマで検索" autocomplete="off" />
              <button class="nav-drawer-search-btn" type="submit" aria-label="検索する">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="2"/><path d="M13 13L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            </div>
          </form>
          <p class="nav-drawer-search-label" style="margin-top:28px">話題のキーワード</p>
          <div class="nav-drawer-tag-list" id="drawer-tag-list"></div>
        </div>
        <nav class="nav-drawer-nav" aria-label="メインナビゲーション">
          <a href="/students.html">STUDENTS</a>
          <a href="/projects.html">PROJECTS</a>
          <a href="https://coiu.jp" target="_blank" rel="noopener noreferrer">CoIUとは</a>
          <a href="/about.html">ABOUT</a>
        </nav>
      </div>
    </div>

    <main>
      <section class="student-detail" id="student-view" aria-live="polite">
        <div class="project-detail-page">
          <div class="project-detail-hero">
            <div class="project-detail-hero-inner">
              <div class="project-detail-meta">${tagPills}</div>
              <h1 class="project-detail-title" id="project-detail-title">${escHtml(title)}</h1>
            </div>
          </div>${imgHtml}
          <div class="project-detail-body">${overviewHtml}${timelineHtml}${membersHtml}
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <span class="brand-kana">こういう学生に会える場所</span>
            <strong>CoIU meetup ...</strong>
          </div>
          <a class="page-top" href="#">
            <span>Page Top</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
        <div class="footer-bottom">
          <nav aria-label="フッターナビゲーション">
            <a href="/index.html">TOP</a>
            <a href="/index.html#contents">CONTENTS</a>
            <a href="/index.html#feature">FEATURE</a>
            <a href="https://coiu.jp" target="_blank" rel="noopener noreferrer">CoIUとは</a>
            <a href="/about.html">ABOUT</a>
          </nav>
          <p class="footer-copy">&copy; 2026 CoIU meetup</p>
        </div>
      </div>
    </footer>
  </body>
</html>
`;

  writeFileSync(resolve(root, `projects/${slug}.html`), html, "utf-8");
  console.log(`  generated: projects/${slug}.html`);
}

console.log(`\nDone. ${index.length} project pages generated.`);

function escHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escAttr(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
}

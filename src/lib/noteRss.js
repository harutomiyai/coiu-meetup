const DEFAULT_NOTE_LIMIT = 3;
const NOTE_RSS_DEV_PROXY_PREFIX = "/note-rss";
const NOTE_RSS_PROXY_BASE = import.meta.env.VITE_NOTE_RSS_PROXY_BASE || "";

const toText = (value) => String(value || "").trim();

const getNodeText = (node, tagName) => {
  const child = Array.from(node.children).find(
    (item) => item.tagName.toLowerCase() === tagName.toLowerCase(),
  );
  return toText(child?.textContent);
};

const getMediaThumbnail = (item) => {
  const mediaNode = Array.from(item.children).find(
    (child) =>
      child.tagName.toLowerCase() === "media:thumbnail" ||
      (child.localName?.toLowerCase() === "thumbnail" && child.prefix?.toLowerCase() === "media"),
  );
  return toText(mediaNode?.getAttribute("url")) || toText(mediaNode?.textContent);
};

const stripHtml = (html) =>
  toText(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatDate = (pubDate) => {
  if (!pubDate) return "";
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return pubDate;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const getUsernameFromNoteUrl = (url) => {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== "note.com") return "";
    return parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
  } catch {
    return "";
  }
};

const getNoteProxyPath = (url) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== "note.com") return "";
    return parsedUrl.pathname.endsWith("/rss") ? parsedUrl.pathname : "";
  } catch {
    return "";
  }
};

export const getNoteUsername = (student) =>
  toText(student.noteUsername) ||
  getUsernameFromNoteUrl(student.noteRssUrl) ||
  getUsernameFromNoteUrl(student.links?.note);

export const getNoteHomeUrl = (student) => {
  const noteLink = toText(student.links?.note);
  if (noteLink) return noteLink;

  const username = getNoteUsername(student);
  return username ? `https://note.com/${username}` : "";
};

export const getNoteRssUrl = (student) => {
  const explicitUrl = toText(student.noteRssUrl);
  if (explicitUrl) return explicitUrl;

  const username = getNoteUsername(student);
  return username ? `https://note.com/${username}/rss` : "";
};

export const hasNoteFeedSource = (student) => Boolean(getNoteRssUrl(student));

const buildRequest = (student) => {
  const rssUrl = getNoteRssUrl(student);
  const explicitUrl = toText(student.noteRssUrl);
  const username = getNoteUsername(student);

  if (!rssUrl) return null;

  if (NOTE_RSS_PROXY_BASE) {
    const proxyUrl = new URL(NOTE_RSS_PROXY_BASE, window.location.origin);
    if (explicitUrl) {
      proxyUrl.searchParams.set("url", rssUrl);
    } else if (username) {
      proxyUrl.searchParams.set("username", username);
    } else {
      proxyUrl.searchParams.set("url", rssUrl);
    }
    return { url: proxyUrl.toString(), expectsJson: true };
  }

  if (import.meta.env.DEV) {
    const noteProxyPath = getNoteProxyPath(rssUrl);
    if (noteProxyPath) {
      return {
        url: `${NOTE_RSS_DEV_PROXY_PREFIX}${noteProxyPath}`,
        expectsJson: false,
      };
    }
  }

  if (import.meta.env.DEV && username) {
    return {
      url: `${NOTE_RSS_DEV_PROXY_PREFIX}/${encodeURIComponent(username)}/rss`,
      expectsJson: false,
    };
  }

  return { url: rssUrl, expectsJson: false };
};

const normalizeArticles = (articles, limit) =>
  articles
    .filter((article) => article?.title && article?.link)
    .slice(0, limit)
    .map((article) => ({
      title: toText(article.title),
      link: toText(article.link),
      pubDate: toText(article.pubDate),
      thumbnail: toText(article.thumbnail),
      excerpt: toText(article.excerpt),
    }));

const parseRss = (xml, limit) => {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("Invalid RSS XML");
  }

  return Array.from(document.querySelectorAll("item"))
    .slice(0, limit)
    .map((item) => {
      const description = getNodeText(item, "description");

      return {
        title: getNodeText(item, "title"),
        link: getNodeText(item, "link"),
        pubDate: formatDate(getNodeText(item, "pubDate")),
        thumbnail: getMediaThumbnail(item),
        excerpt: stripHtml(description).replace(/続きをみる\s*$/, "").slice(0, 100),
      };
    })
    .filter((article) => article.title && article.link);
};

export const fetchNoteArticles = async (student, { limit = DEFAULT_NOTE_LIMIT } = {}) => {
  const request = buildRequest(student);
  if (!request) return [];

  try {
    const response = await fetch(request.url);
    if (!response.ok) throw new Error(`note RSS fetch failed: ${response.status}`);

    if (request.expectsJson || response.headers.get("Content-Type")?.includes("json")) {
      const articles = await response.json();
      return normalizeArticles(Array.isArray(articles) ? articles : [], limit);
    }

    return parseRss(await response.text(), limit);
  } catch (error) {
    console.info("note RSS articles could not be loaded; falling back to links only.", error);
    return [];
  }
};

/**
 * Cloudflare Worker — note RSS proxy
 *
 * Fetches a student's note RSS, parses the XML, and returns the latest
 * 3 articles as JSON with CORS headers.
 *
 * Request examples:
 *   /?username=haruto_miyai
 *   /?url=https://note.com/haruto_miyai/rss
 *
 * Deploy:
 *   1. Install Wrangler:  npm i -g wrangler
 *   2. Login:             wrangler login
 *   3. Deploy:            wrangler deploy workers/note-rss-proxy.js --name note-rss-proxy
 *   4. Build with VITE_NOTE_RSS_PROXY_BASE set to the deployed Worker URL
 */

const DEFAULT_USERNAME = "haruto_miyai";
const NOTE_ORIGIN = "https://note.com";
const MAX_ITEMS = 3;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      const rssUrl = getRssUrl(request);
      const rssRes = await fetch(rssUrl, {
        headers: { "User-Agent": "CoIU-Students-RSSProxy/1.0" },
      });

      if (!rssRes.ok) {
        return jsonError(502, "RSS fetch failed");
      }

      const xml = await rssRes.text();
      const items = parseRSS(xml);

      return new Response(JSON.stringify(items), {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=900", // 15 min cache
        },
      });
    } catch (err) {
      return jsonError(500, "Internal error");
    }
  },
};

function getRssUrl(request) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");

  if (rawUrl) return sanitizeNoteRssUrl(rawUrl);

  const username = sanitizeUsername(requestUrl.searchParams.get("username") || DEFAULT_USERNAME);
  return `${NOTE_ORIGIN}/${username}/rss`;
}

function sanitizeUsername(value) {
  const username = String(value || "").trim();
  if (!/^[\w-]+$/.test(username)) {
    throw new Error("Invalid note username");
  }
  return username;
}

function sanitizeNoteRssUrl(value) {
  const url = new URL(value);
  if (url.origin !== NOTE_ORIGIN || !url.pathname.endsWith("/rss")) {
    throw new Error("Invalid note RSS URL");
  }
  return url.toString();
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const raw = match[1];

    items.push({
      title: extractText(raw, "title"),
      link: extractLink(raw),
      pubDate: formatDate(extractText(raw, "pubDate")),
      thumbnail: extractMediaThumbnail(raw),
      excerpt: buildExcerpt(extractDescription(raw)),
    });

    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}

// Extract plain text from a tag that may contain CDATA
function extractText(xml, tag) {
  const re = new RegExp(
    `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${tag}>`,
  );
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

// <link> in RSS 2.0 often has no attributes; handle plain URL content
function extractLink(xml) {
  const m = xml.match(/<link[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/link>/);
  return m ? m[1].trim() : "";
}

// description may contain full HTML inside CDATA
function extractDescription(xml) {
  const m = xml.match(/<description[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/description>/);
  return m ? m[1].trim() : "";
}

// <media:thumbnail url="..." />
function extractMediaThumbnail(xml) {
  const m = xml.match(/<media:thumbnail[^>]+url="([^"]+)"/);
  return m ? m[1] : "";
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExcerpt(html) {
  const text = stripHtml(html);
  // Remove trailing "続きをみる" link text
  return text.replace(/続きをみる\s*$/, "").trim().slice(0, 100);
}

function formatDate(pubDate) {
  if (!pubDate) return "";
  try {
    const d = new Date(pubDate);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return pubDate;
  }
}

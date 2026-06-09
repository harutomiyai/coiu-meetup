/**
 * Cloudflare Worker — note RSS proxy
 *
 * Fetches https://note.com/haruto_miyai/rss, parses the XML,
 * and returns the latest 6 articles as JSON with CORS headers.
 *
 * Deploy:
 *   1. Install Wrangler:  npm i -g wrangler
 *   2. Login:             wrangler login
 *   3. Deploy:            wrangler deploy workers/note-rss-proxy.js --name note-rss-proxy
 *   4. Copy the resulting Worker URL into NOTE_WORKER_ENDPOINT in src/js/render.js
 */

const RSS_URL = "https://note.com/haruto_miyai/rss";
const MAX_ITEMS = 6;

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
      const rssRes = await fetch(RSS_URL, {
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

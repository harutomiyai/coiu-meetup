export const config = { runtime: "edge" };

const toText = (value) => String(value || "").trim();

const stripHtml = (html) =>
  toText(html)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const decodeEntities = (str) =>
  toText(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

const extractTag = (xml, tag) => {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  return toText(xml.match(re)?.[1]);
};

const extractAttr = (xml, tag, attr) => {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  return toText(xml.match(re)?.[1]);
};

// note RSSの<media:thumbnail>はテキストコンテンツにURLを持つ
const extractMediaThumbnail = (item) =>
  decodeEntities(
    extractAttr(item, "media:thumbnail", "url") ||
    extractAttr(item, "thumbnail", "url") ||
    extractTag(item, "media:thumbnail") ||
    extractTag(item, "thumbnail")
  );

const formatDate = (pubDate) => {
  if (!pubDate) return "";
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return pubDate;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const parseRss = (xml) => {
  const items = xml.split(/<item[\s>]/i).slice(1);
  return items
    .slice(0, 10)
    .map((item) => {
      const description = extractTag(item, "description");
      return {
        title: extractTag(item, "title"),
        link: extractTag(item, "link"),
        pubDate: formatDate(extractTag(item, "pubDate")),
        thumbnail: extractMediaThumbnail(item),
        excerpt: stripHtml(description).replace(/続きをみる\s*$/, "").slice(0, 100),
        creatorName: extractTag(item, "note:creatorName") || extractTag(item, "creatorName"),
        creatorImage: decodeEntities(extractTag(item, "note:creatorImage") || extractTag(item, "creatorImage")),
      };
    })
    .filter((a) => a.title && a.link);
};

function cors() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const url = searchParams.get("url");

  let rssUrl;
  if (username) {
    rssUrl = `https://note.com/${encodeURIComponent(username)}/rss`;
  } else if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== "note.com") {
        return new Response(JSON.stringify([]), { status: 400, headers: cors() });
      }
      rssUrl = url;
    } catch {
      return new Response(JSON.stringify([]), { status: 400, headers: cors() });
    }
  } else {
    return new Response(JSON.stringify([]), { status: 400, headers: cors() });
  }

  try {
    const upstream = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CoIUMeetup/1.0)" },
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify([]), { status: upstream.status, headers: cors() });
    }
    const xml = await upstream.text();
    const articles = parseRss(xml);
    return new Response(JSON.stringify(articles), {
      status: 200,
      headers: { ...cors(), "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return new Response(JSON.stringify([]), { status: 500, headers: cors() });
  }
}

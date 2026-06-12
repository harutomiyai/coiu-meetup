#!/usr/bin/env node
// Generates public/sitemap.xml including static pages, student pages, and project pages.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BASE_URL = "https://coiu-meetup.vercel.app";
const TODAY = new Date().toISOString().slice(0, 10);

const studentIndex = JSON.parse(
  readFileSync(resolve(root, "public/data/students/index.json"), "utf-8")
);
const projectIndex = JSON.parse(
  readFileSync(resolve(root, "public/data/projects/index.json"), "utf-8")
);

const urls = [
  { loc: `${BASE_URL}/`, changefreq: "weekly", priority: "1.0" },
  { loc: `${BASE_URL}/students.html`, changefreq: "weekly", priority: "0.9" },
  { loc: `${BASE_URL}/coiu.html`, changefreq: "monthly", priority: "0.8" },
  { loc: `${BASE_URL}/projects.html`, changefreq: "weekly", priority: "0.8" },
  { loc: `${BASE_URL}/about.html`, changefreq: "monthly", priority: "0.6" },
  ...studentIndex.map(({ slug }) => ({
    loc: `${BASE_URL}/students/${slug}.html`,
    changefreq: "weekly",
    priority: "0.8",
  })),
  ...projectIndex.map(({ slug }) => ({
    loc: `${BASE_URL}/projects/${slug}.html`,
    changefreq: "weekly",
    priority: "0.7",
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    ({ loc, changefreq, priority }) =>
      `  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

writeFileSync(resolve(root, "public/sitemap.xml"), xml, "utf-8");
console.log(`  generated: public/sitemap.xml (${urls.length} URLs)`);

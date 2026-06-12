import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { existsSync } from "node:fs";

const IMAGES_DIR = "public/images";
const QUALITY = 80;

async function getJpgFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getJpgFiles(full)));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const files = await getJpgFiles(IMAGES_DIR);
let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const ext = extname(file);
  const webpPath = file.replace(new RegExp(`${ext}$`), ".webp");

  const meta = await sharp(file).metadata();
  const { size: before } = await import("node:fs").then(
    (m) => new Promise((res) => m.stat(file, (_, s) => res(s)))
  );

  // Resize: hero max 1200px wide, students max 800px wide, projects max 1200px wide
  let width;
  if (file.includes("/students/")) width = 800;
  else width = 1200;

  await sharp(file)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(webpPath);

  const { size: after } = await import("node:fs").then(
    (m) => new Promise((res) => m.stat(webpPath, (_, s) => res(s)))
  );

  totalBefore += before;
  totalAfter += after;
  console.log(
    `${file.replace("public/images/", "")} → ${basename(webpPath)}  ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`
  );
}

console.log(
  `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`
);

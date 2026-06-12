import { resolve } from "node:path";
import { readdirSync } from "node:fs";
import { defineConfig } from "vite";

const projectPages = Object.fromEntries(
  readdirSync(resolve(__dirname, "projects"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => [`project-${f.replace(".html", "")}`, resolve(__dirname, "projects", f)])
);

export default defineConfig({
  server: {
    proxy: {
      "/note-rss": {
        target: "https://note.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/note-rss/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        coiu: resolve(__dirname, "coiu.html"),
        students: resolve(__dirname, "students.html"),
        projects: resolve(__dirname, "projects.html"),
        ...projectPages,
      },
    },
  },
});

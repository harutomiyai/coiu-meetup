import { resolve } from "node:path";
import { defineConfig } from "vite";

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
        students: resolve(__dirname, "students.html"),
      },
    },
  },
});

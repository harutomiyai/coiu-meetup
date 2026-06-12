import "./css/main.css";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
inject();
injectSpeedInsights();
import { loadAll } from "./js/data.js";
import { getProjectBySlug } from "./js/state.js";
import { renderProjectDetail } from "./js/render.js";
import { bindDrawerEvents } from "./js/drawer.js";

const init = async () => {
  const slug = document.body.dataset.slug;
  if (!slug) return;

  await loadAll();

  const project = getProjectBySlug(slug);
  const view = document.getElementById("student-view");

  if (!project || !view) {
    if (view) view.innerHTML = "<p style='padding:60px 24px'>プロジェクトが見つかりませんでした。</p>";
    return;
  }

  renderProjectDetail(project, { backUrl: "/projects.html" });

  bindDrawerEvents({
    onSearchSubmit: (value) => {
      location.href = `/students.html${value ? `?q=${encodeURIComponent(value)}` : ""}`;
    },
  });
};

init();

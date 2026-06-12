import "./css/main.css";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
inject();
injectSpeedInsights();
import { loadAll } from "./js/data.js";
import { getStudentBySlug } from "./js/state.js";
import { renderStudentDetail } from "./js/render.js";
import { bindDrawerEvents } from "./js/drawer.js";

const init = async () => {
  const slug = document.body.dataset.slug;
  if (!slug) return;

  await loadAll();

  const student = getStudentBySlug(slug);
  const view = document.getElementById("student-view");

  if (!student || !view) {
    if (view) view.innerHTML = "<p style='padding:60px 24px'>学生プロフィールが見つかりませんでした。</p>";
    return;
  }

  renderStudentDetail(student);

  bindDrawerEvents({
    onSearchSubmit: (value) => {
      location.href = `/students.html${value ? `?q=${encodeURIComponent(value)}` : ""}`;
    },
  });
};

init();

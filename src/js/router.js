import { students, state } from "./state.js";
import { selectors } from "./selectors.js";
import { renderStudentDetail, renderTopicControls, renderPeopleGrid } from "./render.js";

export const showHome = () => {
  selectors.homeView.hidden = false;
  selectors.studentView.hidden = true;
};

export const showStudent = (slug) => {
  const student = students.find((item) => item.slug === slug);

  if (!student) {
    window.location.hash = "#topics";
    return;
  }

  renderStudentDetail(student);
  selectors.homeView.hidden = true;
  selectors.studentView.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
};

export const handleRoute = () => {
  const hash = window.location.hash.replace(/^#/, "");

  if (hash.startsWith("student/")) {
    showStudent(hash.replace("student/", ""));
    return;
  }

  showHome();
};

export const selectTopic = (topic) => {
  state.selectedTopic = topic || "すべて";
  renderTopicControls();
  renderPeopleGrid();

  if (window.location.hash !== "#topics") {
    window.location.hash = "#topics";
  }
};

export const bindEvents = () => {
  document.addEventListener("click", (event) => {
    const topicTarget = event.target.closest("[data-topic]");
    if (!topicTarget) return;
    selectTopic(topicTarget.dataset.topic);
  });

  document.addEventListener("keydown", (event) => {
    const topicTarget = event.target.closest(".story-card[data-topic]");
    if (!topicTarget || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    selectTopic(topicTarget.dataset.topic);
  });

  selectors.clearTopic?.addEventListener("click", () => selectTopic("すべて"));
  window.addEventListener("hashchange", handleRoute);
};

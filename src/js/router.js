import { students, state, getProjectBySlug } from "./state.js";
import { selectors } from "./selectors.js";
import { renderDiscoveryResults, renderStudentDetail, renderProjectDetail } from "./render.js";

export const showHome = () => {
  selectors.homeView.hidden = false;
  selectors.studentView.hidden = true;
};

export const showStudent = (slug) => {
  const student = students.find((item) => item.slug === slug);

  if (!student) {
    window.location.hash = "#feature";
    return;
  }

  renderStudentDetail(student);
  selectors.homeView.hidden = true;
  selectors.studentView.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
};

export const showProject = (slug) => {
  const project = getProjectBySlug(slug);
  if (!project) {
    window.location.hash = "#feature";
    return;
  }
  renderProjectDetail(project);
  selectors.homeView.hidden = true;
  selectors.studentView.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
};

export const handleRoute = () => {
  const hash = window.location.hash.replace(/^#/, "");

  if (hash.startsWith("student/")) {
    const slug = hash.replace("student/", "");
    window.location.replace(`/students/${slug}.html`);
    return;
  }

  if (hash.startsWith("project/")) {
    showProject(hash.replace("project/", ""));
    return;
  }

  showHome();
};

const syncSearchInput = () => {
  if (selectors.siteSearch && selectors.siteSearch.value !== state.searchQuery) {
    selectors.siteSearch.value = state.searchQuery;
  }

  if (selectors.modalSearchInput && selectors.modalSearchInput.value !== state.searchQuery) {
    selectors.modalSearchInput.value = state.searchQuery;
  }
};

const getDiscoveryTargetHash = () => "#feature";

export const openSearchModal = () => {
  if (!selectors.searchModal) return;

  selectors.searchModal.hidden = false;
  document.body.classList.add("is-search-modal-open");
  syncSearchInput();
  window.setTimeout(() => {
    selectors.modalSearchInput?.focus();
  }, 0);
};

export const closeSearchModal = () => {
  if (!selectors.searchModal) return;

  selectors.searchModal.hidden = true;
  document.body.classList.remove("is-search-modal-open");
};

export const clearDiscovery = (targetHash = getDiscoveryTargetHash()) => {
  state.selectedTopics = [];
  state.searchQuery = "";
  syncSearchInput();
  renderDiscoveryResults();

  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
};

export const toggleTopic = (topic, targetHash = getDiscoveryTargetHash()) => {
  if (!topic || topic === "すべて") {
    clearDiscovery(targetHash);
    return;
  }

  state.selectedTopics = state.selectedTopics.includes(topic)
    ? state.selectedTopics.filter((selectedTopic) => selectedTopic !== topic)
    : [...state.selectedTopics, topic];

  renderDiscoveryResults();

  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
};

export const updateSearchQuery = (query) => {
  state.searchQuery = query;
  syncSearchInput();
  renderDiscoveryResults();

  if (window.location.hash.startsWith("#student/")) {
    const slug = window.location.hash.replace("#student/", "");
    window.location.replace(`/students/${slug}.html`);
  }
};

export const searchQuestion = (query) => {
  updateSearchQuery(query);
  if (window.location.hash !== getDiscoveryTargetHash()) {
    window.location.hash = getDiscoveryTargetHash();
  }
};

const goToSearch = (q = "", tags = []) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  tags.forEach((t) => params.append("tag", t));
  const qs = params.toString();
  location.href = `/students.html${qs ? `?${qs}` : ""}`;
};

export const bindEvents = () => {
  import("./drawer.js").then(({ bindDrawerEvents }) => {
    bindDrawerEvents({
      onSearchSubmit: (value) => goToSearch(value, []),
    });
  });

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-search-modal-close]");
    if (closeTarget) { closeSearchModal(); return; }

    const topicTarget = event.target.closest("[data-topic]");
    if (topicTarget) {
      goToSearch("", [topicTarget.dataset.topic]);
      return;
    }
  });

  selectors.clearTopic?.addEventListener("click", () => clearDiscovery(getDiscoveryTargetHash()));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (selectors.searchModal && !selectors.searchModal.hidden) closeSearchModal();
    }
  });

  window.addEventListener("hashchange", handleRoute);
};

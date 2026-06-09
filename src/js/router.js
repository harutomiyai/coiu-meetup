import { students, state } from "./state.js";
import { selectors } from "./selectors.js";
import { renderDiscoveryResults, renderStudentDetail } from "./render.js";

const THEME_MODAL_STORAGE_KEY = "coiuStudentsThemeModalSeen";

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

const syncSearchInput = () => {
  if (selectors.siteSearch && selectors.siteSearch.value !== state.searchQuery) {
    selectors.siteSearch.value = state.searchQuery;
  }
};

const rememberThemeModalSeen = () => {
  try {
    window.localStorage.setItem(THEME_MODAL_STORAGE_KEY, "true");
  } catch {
    // Browsers can block localStorage; the modal still works for this session.
  }
};

const hasSeenThemeModal = () => {
  try {
    return window.localStorage.getItem(THEME_MODAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const openThemeModal = () => {
  if (!selectors.themeModal) return;

  selectors.themeModal.hidden = false;
  document.body.classList.add("is-theme-modal-open");
  window.setTimeout(() => {
    selectors.themeModal.querySelector("[data-topic], #theme-modal-skip")?.focus();
  }, 0);
};

export const closeThemeModal = ({ remember = true } = {}) => {
  if (!selectors.themeModal) return;

  selectors.themeModal.hidden = true;
  document.body.classList.remove("is-theme-modal-open");

  if (remember) {
    rememberThemeModalSeen();
  }
};

export const clearDiscovery = (targetHash = "#students") => {
  state.selectedTopics = [];
  state.searchQuery = "";
  syncSearchInput();
  renderDiscoveryResults();

  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
};

export const toggleTopic = (topic, targetHash = "#students") => {
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

export const chooseModalTopic = (topic) => {
  if (!topic || topic === "すべて") {
    closeThemeModal();
    return;
  }

  state.selectedTopics = [topic];
  renderDiscoveryResults();
  closeThemeModal();

  if (window.location.hash !== "#students") {
    window.location.hash = "#students";
  }
};

export const updateSearchQuery = (query) => {
  state.searchQuery = query;
  renderDiscoveryResults();

  if (window.location.hash.startsWith("#student/")) {
    showHome();
  }
};

export const bindEvents = () => {
  document.addEventListener("click", (event) => {
    const openTarget = event.target.closest("[data-theme-modal-open]");
    if (openTarget) {
      openThemeModal();
      return;
    }

    const closeTarget = event.target.closest("[data-theme-modal-close]");
    if (closeTarget) {
      closeThemeModal();
      return;
    }

    const topicTarget = event.target.closest("[data-topic]");
    if (!topicTarget) return;

    if (topicTarget.closest("#theme-modal")) {
      chooseModalTopic(topicTarget.dataset.topic);
      return;
    }

    const targetHash = topicTarget.closest("#topic-list") ? "#topics" : "#students";
    toggleTopic(topicTarget.dataset.topic, targetHash);
  });

  document.addEventListener("keydown", (event) => {
    const topicTarget = event.target.closest(".story-card[data-topic]");
    if (!topicTarget || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    toggleTopic(topicTarget.dataset.topic);
  });

  selectors.siteSearch?.addEventListener("input", (event) => {
    updateSearchQuery(event.currentTarget.value);
  });

  selectors.siteSearch?.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (window.location.hash !== "#students") {
      window.location.hash = "#students";
    }
  });

  selectors.clearTopic?.addEventListener("click", () => clearDiscovery("#topics"));

  selectors.themeModalSkip?.addEventListener("click", () => closeThemeModal());

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selectors.themeModal && !selectors.themeModal.hidden) {
      closeThemeModal();
    }
  });

  window.addEventListener("hashchange", handleRoute);
};

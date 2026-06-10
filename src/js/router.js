import { students, state } from "./state.js";
import { selectors } from "./selectors.js";
import { renderDiscoveryResults, renderStudentDetail } from "./render.js";

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
    showHome();
  }
};

export const searchQuestion = (query) => {
  updateSearchQuery(query);
  if (window.location.hash !== getDiscoveryTargetHash()) {
    window.location.hash = getDiscoveryTargetHash();
  }
};

export const bindEvents = () => {
  import("./drawer.js").then(({ bindDrawerEvents }) => {
    bindDrawerEvents({
      onTagClick: (tag) => toggleTopic(tag),
      onSearchInput: (value) => {
        updateSearchQuery(value);
        if (window.location.hash !== getDiscoveryTargetHash()) {
          window.location.hash = getDiscoveryTargetHash();
        }
      },
      onSearchSubmit: (value) => {
        updateSearchQuery(value);
        if (window.location.hash !== getDiscoveryTargetHash()) {
          window.location.hash = getDiscoveryTargetHash();
        }
        window.setTimeout(() => {
          document.getElementById("feature")?.scrollIntoView({ behavior: "smooth" });
        }, 320);
      },
    });
  });

  document.addEventListener("click", (event) => {
    const openTarget = event.target.closest("[data-search-modal-open]");
    if (openTarget) {
      openSearchModal();
      return;
    }

    const closeTarget = event.target.closest("[data-search-modal-close]");
    if (closeTarget) {
      closeSearchModal();
      return;
    }

    const questionTarget = event.target.closest("[data-question-search]");
    if (questionTarget) {
      searchQuestion(questionTarget.dataset.questionSearch);
      return;
    }

    const topicTarget = event.target.closest("[data-topic]");
    if (!topicTarget) return;

    if (topicTarget.closest("#search-modal")) {
      toggleTopic(topicTarget.dataset.topic, getDiscoveryTargetHash());
      return;
    }

    toggleTopic(topicTarget.dataset.topic, getDiscoveryTargetHash());
  });

  selectors.siteSearch?.addEventListener("focus", () => {
    openSearchModal();
  });

  selectors.siteSearch?.addEventListener("click", () => {
    openSearchModal();
  });

  selectors.siteSearch?.addEventListener("input", (event) => {
    updateSearchQuery(event.currentTarget.value);
  });

  selectors.siteSearch?.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    openSearchModal();
    if (window.location.hash !== getDiscoveryTargetHash()) {
      window.location.hash = getDiscoveryTargetHash();
    }
  });

  selectors.modalSearchInput?.addEventListener("input", (event) => {
    updateSearchQuery(event.currentTarget.value);
    if (window.location.hash !== getDiscoveryTargetHash()) {
      window.location.hash = getDiscoveryTargetHash();
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

import "./css/main.css";
import { loadStudents } from "./js/data.js";
import { renderHome, renderLoadError } from "./js/render.js";
import { bindEvents, handleRoute } from "./js/router.js";
import { initKeywordRunner } from "./js/keywordRunner.js";
import { initHeroSlideshow } from "./js/heroSlideshow.js";

const init = async () => {
  try {
    await loadStudents();
    renderHome();
    bindEvents();
    handleRoute();
    initKeywordRunner();
    initHeroSlideshow();
  } catch (error) {
    renderLoadError(error);
  }
};

init();

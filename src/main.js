import "./css/main.css";
import { loadAll } from "./js/data.js";
import { renderHome, renderLoadError } from "./js/render.js";
import { bindEvents, handleRoute } from "./js/router.js";
import { initHeroSlideshow } from "./js/heroSlideshow.js";
import { initProjectCarousel } from "./js/projectCarousel.js";

const init = async () => {
  try {
    await loadAll();
    renderHome();
    bindEvents();
    handleRoute();
    initHeroSlideshow();
    initProjectCarousel();
  } catch (error) {
    renderLoadError(error);
  }
};

init();

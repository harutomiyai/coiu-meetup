import "./css/main.css";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
inject();
injectSpeedInsights();
import { loadAll } from "./js/data.js";
import { renderHome, renderLoadError } from "./js/render.js";
import { bindEvents, handleRoute } from "./js/router.js";
import { initHeroSlideshow } from "./js/heroSlideshow.js";
import { initProjectCarousel } from "./js/projectCarousel.js";
import { initNoteMarquee } from "./js/noteMarquee.js";

const init = async () => {
  try {
    await loadAll();
    renderHome();
    bindEvents();
    handleRoute();
    initHeroSlideshow();
    initProjectCarousel();
    initNoteMarquee();
  } catch (error) {
    renderLoadError(error);
  }
};

init();

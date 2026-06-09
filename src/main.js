import "./css/main.css";
import { loadStudents } from "./js/data.js";
import { renderHome, renderLoadError } from "./js/render.js";
import { bindEvents, handleRoute } from "./js/router.js";

const init = async () => {
  try {
    await loadStudents();
    renderHome();
    bindEvents();
    handleRoute();
  } catch (error) {
    renderLoadError(error);
  }
};

init();

import "./css/main.css";
import { loadTagCategories } from "./js/data.js";
import { bindDrawerEvents } from "./js/drawer.js";

(async () => {
  await loadTagCategories();
  bindDrawerEvents();
})();

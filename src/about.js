import "./css/main.css";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
inject();
injectSpeedInsights();
import { loadTagCategories } from "./js/data.js";
import { bindDrawerEvents } from "./js/drawer.js";

(async () => {
  await loadTagCategories();
  bindDrawerEvents();
})();

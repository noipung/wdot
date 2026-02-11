import { initCanvasInteractions } from "./events/canvas-interactions.js";
import { initFileHandlers } from "./events/file-handlers.js";
import { initPaletteUIEvents } from "./events/palette-ui.js";
import { initSettingsUI } from "./events/settings-ui.js";
import { initThemeUI } from "./events/theme-ui.js";

export const initEventListeners = () => {
  initThemeUI();
  initCanvasInteractions();
  initFileHandlers();
  initPaletteUIEvents();
  initSettingsUI();
};

export { updateScrollClass } from "./utils.js";
export { setBgOfTerrainColorBtn } from "./palette.js";

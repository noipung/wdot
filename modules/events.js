import { initCanvasInteractions } from "./events/canvas-interactions.js";
import { initFileHandlers } from "./events/file-handlers.js";
import { initPaletteUI } from "./events/palette-ui.js";
import { initSettingsUI } from "./events/settings-ui.js";

export const initEventListeners = () => {
  initCanvasInteractions();
  initFileHandlers();
  initPaletteUI();
  initSettingsUI();
};

export { updateScrollClass } from "./utils.js";
export { setBgOfTerrainColorBtn } from "./palette.js";

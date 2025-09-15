import "./modules/events.js";
import { initPaletteUI } from "./modules/palette.js";
import { initWorkers } from "./modules/worker.js";
import "./modules/ui.js";

const initializeApp = async () => {
  initWorkers();

  try {
    await initPaletteUI();
  } catch (error) {
    console.error("애플리케이션 초기화 중 오류 발생:", error);
  }
};

initializeApp();

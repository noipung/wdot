import { state } from "./modules/state.js";
import { initPalette } from "./modules/constants.js";
import { initPaletteUI } from "./modules/palette.js";

// 상태 초기화
state.palette = initPalette;

// 팔레트 UI 초기화
initPaletteUI();

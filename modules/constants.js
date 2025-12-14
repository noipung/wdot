export const downloadBtn = document.querySelector(".download-btn");
export const total = document.querySelector(".total");
export const totalTime = document.querySelector(".total-time");
export const totalTimeWithFlag = document.querySelector(
  ".total-time-with-flag"
);
export const settingsForm = document.querySelector(".settings");
export const canvasOverlay = document.querySelector(".canvas-overlay");
export const canvasControlLayer = document.querySelector(
  ".canvas-control-layer"
);
export const canvas = document.querySelector("canvas");
export const ctx = canvas.getContext("2d", { willReadFrequently: true });
export const showOriginalInput = document.querySelector("#show-original");
export const showGridInput = document.querySelector("#show-grid");
export const aside = document.querySelector("aside");
export const basicPaletteList = document.querySelector(".palette.basic");
export const lockedPaletteList = document.querySelector(".palette.locked");
export const customPaletteList = document.querySelector(".palette.custom");
export const selectAllBtn = document.querySelector(".select-all-btn");
export const unselectAllBtn = document.querySelector(".unselect-all-btn");
export const pixelatedModeToggle = document.querySelector(
  "#pixelated-mode-toggle"
);
export const uploadBtn = document.querySelector("#upload-btn");
export const zoomInBtn = document.querySelector(".zoom-in");
export const zoomOutBtn = document.querySelector(".zoom-out");
export const zoomInput = document.querySelector("#zoom");
export const paletteDropdown = document.querySelector(".palette-dropdown");
export const paletteOptionsContainer = paletteDropdown.querySelector(
  ".dropdown-options-container"
);
export const methodDropdown = document.querySelector(".method-dropdown");
export const savePaletteBtn = document.querySelector(
  ".palette-form-group .save-palette-btn"
);
export const paletteResetBtn = document.querySelector(
  ".palette-form-group .reset-btn"
);
export const settingsResetBtn = document.querySelector(
  ".settings-form-group .reset-btn"
);
export const sizeBtns = document.querySelectorAll(".size-btn");
export const resultImage = document.querySelector(".result-image");
export const downloadDialog = document.querySelector(".download-dialog");
export const downloadFileName = document.querySelector(".file-name");
export const downloadImageSize = document.querySelector(".image-size");
export const downloadConfirmBtn = document.querySelector(
  ".download-dialog .confirm-btn"
);
export const downloadCancelBtn = document.querySelector(
  ".download-dialog .cancel-btn"
);
export const terrainColorDialog = document.querySelector(
  ".terrain-color-dialog"
);
export const showTerrainBgCheckbox = document.querySelector("#show-terrain-bg");
export const terrainColorInputs = document.querySelectorAll(
  ".terrain-color-options-container input"
);
export const terrainColorConfirmBtn = document.querySelector(
  ".terrain-color-dialog .confirm-btn"
);
export const terrainColorCancelBtn = document.querySelector(
  ".terrain-color-dialog .cancel-btn"
);
export const terrainNone = document.querySelector("#terrain-none");
export const addColorDialog = document.querySelector(".add-color-dialog");
export const addColorForm = document.querySelector(".add-color-form");
export const addColorTabSingle = document.querySelector(
  "#add-color-tab-single"
);
export const addColorTabList = document.querySelector("#add-color-tab-list");
export const addColorTextarea = document.querySelector(
  ".add-color-list textarea"
);
export const addColorConfirmBtn = document.querySelector(
  ".add-color-dialog .confirm-btn"
);
export const addColorCancelBtn = document.querySelector(
  ".add-color-dialog .cancel-btn"
);
export const colorPreviewSingle = document.querySelector(
  ".add-color-single .color-preview"
);
export const addColorPreviewContainer = document.querySelector(
  ".add-color-dialog .color-preview-container"
);
export const addColorAlert = document.querySelector(".add-color-alert");
export const inputR = document.querySelector("#add-color-input-r");
export const inputG = document.querySelector("#add-color-input-g");
export const inputB = document.querySelector("#add-color-input-b");
export const inputHex = document.querySelector("#add-color-input-hex");
export const inputColorName = document.querySelector("#add-color-input-name");
export const colorTextLoaderContainer = document.querySelector(
  ".color-text-loader-container"
);
export const savePaletteDialog = document.querySelector(".save-palette-dialog");
export const savePaletteColorPreviewContainer = document.querySelector(
  ".save-palette-dialog .color-preview-container"
);
export const savePaletteAlert = document.querySelector(".save-palette-alert");
export const savePaletteNameInput = document.querySelector(
  "#save-palette-name-input"
);
export const savePaletteColorCount = document.querySelector(
  ".save-palette-color-count"
);
export const savePaletteConfirmBtn = document.querySelector(
  ".save-palette-dialog .confirm-btn"
);
export const savePaletteCancelBtn = document.querySelector(
  ".save-palette-dialog .cancel-btn"
);

export const DRAG_THRESHOLD = 3;
export const DPR = window.devicePixelRatio || 1;
export const GA_ID = "G-3V8JLXQZ5F";
export const CLARITY_ID = "ugv6yvdo6v";

export const ZOOM_STEP = 0.1;
export const MIN_ZOOM = 10;
export const SHOW_GRID_ZOOM_THRESHOLD = 200;
export const SPEECH_BUBBLE_WIDTH = 30;
export const SPEECH_BUBBLE_HEIGHT = 30;
export const SPEECH_BUBBLE_RADIUS = 4;
export const SPEECH_BUBBLE_BORDER = 4;
export const GRID_COLOR = "#0002";
export const SPEECH_BUBBLE_BG_COLOR = "#fff";
export const SPEECH_BUBBLE_BORDER_COLOR = "#000";

export const DEFAULT_INIT_ZOOM_FACTOR = 0.75;
export const MIN_VALUE = 0;
export const MAX_VALUE = 100;
export const SECONDS_PER_PIXEL_MANUAL = 30;
export const SECONDS_PER_PIXEL_WITH_TOOL = 27;

export const LUMA_COEFF_R = 0.2126;
export const LUMA_COEFF_G = 0.7152;
export const LUMA_COEFF_B = 0.0722;
export const LUMA_THRESHOLD = 0.5;

export const PALETTE_TYPE_BASIC = "basic";
export const PALETTE_TYPE_LOCKED = "locked";
export const PALETTE_TYPE_ADDED = "added";
export const PALETTE_NAME_CUSTOM = "커스텀";

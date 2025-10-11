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
export const methodDropdown = document.querySelector(".method-dropdown");
export const paletteResetBtn = document.querySelector(
  ".palette-form-group .reset-btn"
);
export const settingsResetBtn = document.querySelector(
  ".settings-form-group .reset-btn"
);
export const sizeBtns = document.querySelectorAll(".size-btn");
export const downloadDialog = document.querySelector(".download-dialog");
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
export const addColorDialog = document.querySelector(".add-color-dialog");
export const addColorForm = document.querySelector(".add-color-form");
export const addColorTabSingle = document.querySelector(
  "#add-color-tab-single"
);
export const addColorTextarea = document.querySelector(
  ".add-color-list textarea"
);
export const addColorConfirmBtn = document.querySelector(
  ".add-color-dialog .confirm-btn"
);
export const addColorCancelBtn = document.querySelector(
  ".add-color-dialog .cancel-btn"
);
export const addColorPreviewSingle = document.querySelector(
  ".add-color-single .add-color-preview"
);
export const addColorPreviewContainer = document.querySelector(
  ".add-color-preview-container"
);
export const addColorAlert = document.querySelector(".add-color-alert");
export const inputR = document.querySelector("#add-color-input-r");
export const inputG = document.querySelector("#add-color-input-g");
export const inputB = document.querySelector("#add-color-input-b");
export const inputHex = document.querySelector("#add-color-input-hex");

export const DRAG_THRESHOLD = 3;
export const DPR = window.devicePixelRatio || 1;

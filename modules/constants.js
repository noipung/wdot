// DOM 요소들
export const downloadBtn = document.querySelector(".download-btn");
export const total = document.querySelector(".total");
export const totalTime = document.querySelector(".total-time");
export const totalTimeWithFlag = document.querySelector(
  ".total-time-with-flag"
);
export const form = document.querySelector("form");
export const canvasOverlay = document.querySelector(".canvas-overlay");
export const canvasControlLayer = document.querySelector(
  ".canvas-control-layer"
);
export const canvas = document.querySelector("canvas");
export const ctx = canvas.getContext("2d");
export const showOriginalInput = document.querySelector("#show-original");
export const basicPaletteList = document.querySelector(".palette.basic");
export const lockedPaletteList = document.querySelector(".palette.locked");
export const selectAllBtn = document.querySelector(".select-all-btn");
export const unselectAllBtn = document.querySelector(".unselect-all-btn");
export const pixelatedModeToggle = document.querySelector(
  "#pixelated-mode-toggle"
);
export const uploadBtn = document.querySelector("#upload-btn");
export const zoomInBtn = document.querySelector(".zoom-in");
export const zoomOutBtn = document.querySelector(".zoom-out");
export const zoomInput = document.querySelector("#zoom");
export const dropdownCurrentOption = document.querySelector(
  ".dropdown-current-option"
);
export const optionRadios = document.querySelectorAll(".option-item input");
export const resetBtn = document.querySelector(".reset-btn");
export const sizeBtns = document.querySelectorAll(".size-btn");
export const downloadDialog = document.querySelector(".download-dialog");
export const downloadConfirmBtn = document.querySelector(
  ".download-dialog .confirm-btn"
);
export const downloadCancelBtn = document.querySelector(
  ".download-dialog .cancel-btn"
);

// 드래그 임계값
export const DRAG_THRESHOLD = 3;

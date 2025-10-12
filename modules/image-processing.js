import { state } from "./state.js";
import {
  total,
  totalTime,
  totalTimeWithFlag,
  zoomInput,
  settingsForm,
  canvasOverlay,
  zoomInBtn,
  zoomOutBtn,
  downloadBtn,
  sizeBtns,
  settingsResetBtn,
} from "./constants.js";
import { calculateTime, formatTime, getInitZoom, validate } from "./utils.js";
import { adjust, makeOpaque, dither } from "./dithering.js";
import { draw } from "./drawing.js";
import { resetAllWorkers } from "./worker.js";

export const updateImageProcessing = async () => {
  const adjusted = document.createElement("canvas");
  const resized = document.createElement("canvas");
  const dithered = document.createElement("canvas");

  const adjustedCtx = adjusted.getContext("2d", { willReadFrequently: true });
  const resizedCtx = resized.getContext("2d", { willReadFrequently: true });
  const ditheredCtx = dithered.getContext("2d", { willReadFrequently: true });

  adjusted.width = state.image.width;
  adjusted.height = state.image.height;
  adjustedCtx.drawImage(state.image, 0, 0);

  const adjustedImageData = await adjust(adjusted);

  adjustedCtx.putImageData(adjustedImageData, 0, 0);
  state.adjusted = adjusted;

  const pw = state.width;
  const ph = state.height;

  resized.width = dithered.width = pw;
  resized.height = dithered.height = ph;

  resizedCtx.imageSmoothingEnabled = !state.isPixelMode;
  resizedCtx.drawImage(state.adjusted, 0, 0, pw, ph);

  makeOpaque(resized);

  const imageData = await dither(resized);

  state.palette.setAllColorCounts(imageData);

  const pixels = state.palette.allCount;
  const { time, timeWithFlag } = calculateTime(pixels);

  total.textContent = `${pixels} 픽셀`;
  totalTime.textContent = formatTime(time);
  totalTimeWithFlag.textContent = formatTime(timeWithFlag);

  ditheredCtx.putImageData(imageData, 0, 0);

  state.resized = resized;
  state.dithered = dithered;

  document.body.classList.add("ready");
};

export const drawUpdatedImage = async () => {
  resetAllWorkers();
  canvasOverlay.classList.add("processing");

  try {
    if (!validate()) return;

    await updateImageProcessing();
    draw();
  } finally {
    canvasOverlay.classList.remove("processing");
  }
};

const enableInputs = () => {
  zoomInBtn.disabled = false;
  zoomOutBtn.disabled = false;
  zoomInput.disabled = false;

  downloadBtn.disabled = false;
  settingsResetBtn.disabled = false;

  settingsForm.brightness.disabled = false;
  settingsForm.contrast.disabled = false;
  settingsForm.saturation.disabled = false;
  settingsForm.dither.disabled = false;
  settingsForm.width.disabled = false;
  settingsForm.height.disabled = false;

  settingsForm["brightness-range"].disabled = false;
  settingsForm["contrast-range"].disabled = false;
  settingsForm["saturation-range"].disabled = false;
  settingsForm["dither-range"].disabled = false;

  sizeBtns.forEach((btn) => (btn.disabled = false));
};

export const handleImageLoad = async (image) => {
  state.image = image;
  state.aspectRatio = image.width / image.height;

  state.width = settingsForm.width.value = image.width;
  state.height = settingsForm.height.value = image.height;
  state.movedPosition = state.position = [0, 0];

  updateZoom();

  canvasOverlay.classList.add("image-loaded");
  enableInputs();

  drawUpdatedImage();
};

export const updateZoom = (zoom) => {
  zoomInput.value = state.zoom = zoom || getInitZoom();
};

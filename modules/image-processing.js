import { state } from "./state.js";
import {
  total,
  totalTime,
  totalTimeWithFlag,
  zoomInput,
  form,
  canvasOverlay,
  zoomInBtn,
  zoomOutBtn,
  downloadBtn,
} from "./constants.js";
import { calculateTime, formatTime, getZoom } from "./utils.js";
import {
  getAdjusted,
  makeOpaque,
  dither,
  countOpaquePixels,
} from "./dithering.js";
import { draw } from "./drawing.js";

export const updateImageProcessing = () => {
  const resized = document.createElement("canvas");
  const dithered = document.createElement("canvas");

  const resizedCtx = resized.getContext("2d", { willReadFrequently: true });
  const ditheredCtx = dithered.getContext("2d");

  state.adjusted = getAdjusted(
    state.image,
    state.brightness,
    state.contrast,
    state.saturation
  );

  const pw = state.width;
  const ph = state.height;

  resized.width = dithered.width = pw;
  resized.height = dithered.height = ph;

  resizedCtx.drawImage(state.adjusted, 0, 0, pw, ph);

  makeOpaque(resized);

  const imageData = dither(resizedCtx, pw, ph);

  const pixels = countOpaquePixels(imageData);
  state.palette.setAllColorCounts(imageData);

  const { time, timeWithFlag } = calculateTime(pixels);

  total.textContent = `${pixels} 픽셀`;
  totalTime.textContent = formatTime(time);
  totalTimeWithFlag.textContent = formatTime(timeWithFlag);

  ditheredCtx.putImageData(imageData, 0, 0);

  state.resized = resized;
  state.dithered = dithered;
};

export const handleImageLoad = (image) => {
  state.image = image;
  state.aspectRatio = image.width / image.height;

  state.width = form.width.value = image.width;
  state.height = form.height.value = image.height;
  state.position = state.currentPosition = [0, 0];

  updateZoom();

  canvasOverlay.classList.add("image-loaded");
  zoomInBtn.disabled = false;
  zoomOutBtn.disabled = false;
  downloadBtn.disabled = false;

  updateImageProcessing();
  draw();
};

export const updateZoom = () => {
  zoomInput.value = state.zoom = getZoom();
};

import { state } from "./state.js";
import { DOM } from "./dom.js";
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

  DOM.ui.total.textContent = `${pixels} 픽셀`;
  DOM.ui.totalTime.textContent = formatTime(time);
  DOM.ui.totalTimeWithFlag.textContent = formatTime(timeWithFlag);

  ditheredCtx.putImageData(imageData, 0, 0);

  state.resized = resized;
  state.dithered = dithered;
  state.dataURL = dithered.toDataURL("image/png");

  DOM.ui.resultImage.src = state.dataURL;

  document.body.classList.add("ready");
};

export const drawUpdatedImage = async () => {
  resetAllWorkers();
  DOM.canvas.overlay.classList.add("processing");

  try {
    if (!validate()) return;

    await updateImageProcessing();
    draw();
  } finally {
    DOM.canvas.overlay.classList.remove("processing");
  }
};

const enableInputs = () => {
  DOM.ui.zoom.inBtn.disabled = false;
  DOM.ui.zoom.outBtn.disabled = false;
  DOM.ui.zoom.input.disabled = false;

  DOM.ui.downloadBtn.disabled = false;
  DOM.ui.settingsResetBtn.disabled = false;

  DOM.ui.settingsForm.brightness.disabled = false;
  DOM.ui.settingsForm.contrast.disabled = false;
  DOM.ui.settingsForm.saturation.disabled = false;
  DOM.ui.settingsForm.dither.disabled = false;
  DOM.ui.settingsForm.width.disabled = false;
  DOM.ui.settingsForm.height.disabled = false;

  DOM.ui.settingsForm["brightness-range"].disabled = false;
  DOM.ui.settingsForm["contrast-range"].disabled = false;
  DOM.ui.settingsForm["saturation-range"].disabled = false;
  DOM.ui.settingsForm["dither-range"].disabled = false;

  DOM.ui.sizeBtns.forEach((btn) => (btn.disabled = false));
};

export const handleImageLoad = async (image) => {
  state.image = image;
  state.aspectRatio = image.width / image.height;

  state.width = DOM.ui.settingsForm.width.value = image.width;
  state.height = DOM.ui.settingsForm.height.value = image.height;
  state.movedPosition = state.position = [0, 0];

  updateZoom();

  DOM.canvas.overlay.classList.add("image-loaded");
  enableInputs();

  drawUpdatedImage();
};

export const updateZoom = (zoom) => {
  DOM.ui.zoom.input.value = state.zoom = zoom || getInitZoom();
};

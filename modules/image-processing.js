import { state } from "./state.js";
import { DOM } from "./dom.js";
import {
  calculateTime,
  formatTime,
  formatElapsedTime,
  getInitZoom,
  validate,
} from "./utils.js";
import { makeOpaque, dither } from "./dithering.js";
import { draw } from "./drawing.js";
import { resetAllWorkers } from "./worker.js";

const updateProgress = (percentage, startTime) => {
  DOM.ui.progressPercentage.textContent = `${Math.round(percentage)}%`;

  // 예상 소요 시간 계산 (진행률이 1% 이상일 때만)
  if (percentage > 0) {
    const elapsed = (Date.now() - startTime) / 1000; // 초 단위
    const estimatedTotal = (elapsed / percentage) * 100;
    const estimatedRemaining = estimatedTotal - elapsed;

    if (estimatedRemaining > 0 && estimatedTotal > 0) {
      const formattedRemaining = formatElapsedTime(estimatedRemaining);
      DOM.ui.progressEta.textContent = `약 ${formattedRemaining} 남음`;
    } else {
      DOM.ui.progressEta.textContent = "";
    }
  } else {
    DOM.ui.progressEta.textContent = "";
  }
};

export const updateImageProcessing = async () => {
  const startTime = Date.now();
  let showProgressTimeout = null;

  // 이미 진행 중이었다면 바로 표시
  const wasAlreadyShowing =
    DOM.canvas.overlay.classList.contains("processing-over-1s");
  let shouldShowProgress = wasAlreadyShowing;

  // 처음 시작하는 경우에만 1초 후 진행률 표시 시작
  if (!wasAlreadyShowing) {
    showProgressTimeout = setTimeout(() => {
      shouldShowProgress = true;
      DOM.canvas.overlay.classList.add("processing-over-1s");
    }, 1000);
  } else {
    // 이미 표시 중이면 바로 표시
    DOM.canvas.overlay.classList.add("processing-over-1s");
  }

  const updateSVGFilter = () => {
    const filter = document.getElementById("adjust-filter");
    const feColorMatrix = filter.querySelector("feColorMatrix");

    const contrastFactor = (state.contrast - 50) * 2;
    const f = (259 * (contrastFactor + 255)) / (255 * (259 - contrastFactor));
    const brightnessOffset = ((state.brightness - 50) * 255) / 100;
    const s = state.saturation / 50;

    // Contrast & Brightness adjustment:
    // newC = f * (C - 128) + 128 + brightnessOffset
    //      = f*C - 128*f + 128 + b_off
    //      = f*C + (128*(1-f) + b_off)
    const offset = (128 * (1 - f) + brightnessOffset) / 255;

    // Saturation adjustment:
    // finalC = (newC - avg) * s + avg
    //        = newC * s + avg * (1-s)
    //        = newC * s + (R+G+B)/3 * (1-s)
    //        = (f*C + offset) * s + (R+G+B) * ((1-s)/3)

    const cMat = f * s; // diagonal elements
    const avgMat = (1 - s) / 3; // off-diagonal elements
    const finalOffset = offset * s;

    const matrix = [
      cMat + avgMat,
      avgMat,
      avgMat,
      0,
      finalOffset,
      avgMat,
      cMat + avgMat,
      avgMat,
      0,
      finalOffset,
      avgMat,
      avgMat,
      cMat + avgMat,
      0,
      finalOffset,
      0,
      0,
      0,
      1,
      0,
    ].join(" ");

    feColorMatrix.setAttribute("values", matrix);
  };

  updateSVGFilter();

  const resized = document.createElement("canvas");
  const dithered = document.createElement("canvas");

  const resizedCtx = resized.getContext("2d", { willReadFrequently: true });
  const ditheredCtx = dithered.getContext("2d", { willReadFrequently: true });

  const pw = state.width;
  const ph = state.height;

  resized.width = dithered.width = pw;
  resized.height = dithered.height = ph;

  resizedCtx.imageSmoothingEnabled = !state.isPixelMode;
  resizedCtx.filter = "url(#adjust-filter)";
  resizedCtx.drawImage(state.image, 0, 0, pw, ph);
  resizedCtx.filter = "none";

  makeOpaque(resized);

  // dither 진행률만 0-100%로 표시
  const imageData = await dither(resized, (percentage) => {
    // 진행률은 항상 업데이트하고, 1초가 지나면 표시
    if (shouldShowProgress) {
      updateProgress(percentage, startTime);
    } else {
      // 1초가 안 지났어도 진행률을 추적 (나중에 표시할 수 있도록)
      const elapsed = Date.now() - startTime;
      if (elapsed >= 1000) {
        shouldShowProgress = true;
        if (showProgressTimeout) {
          clearTimeout(showProgressTimeout);
        }
        DOM.canvas.overlay.classList.add("processing-over-1s");
        updateProgress(percentage, startTime);
      }
    }
  });

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

  // 진행률 표시 정리
  if (showProgressTimeout) {
    clearTimeout(showProgressTimeout);
  }

  // 작업 완료 시 소요 시간 표시
  const endTime = Date.now();
  const elapsedSeconds = (endTime - startTime) / 1000;
  const formattedElapsed = formatElapsedTime(elapsedSeconds, 2);

  if (shouldShowProgress) {
    DOM.ui.progressPercentage.textContent = `총 ${formattedElapsed} 소요`;
    DOM.ui.progressEta.textContent = "";

    DOM.canvas.overlay.classList.remove("processing-over-1s");
  } else {
    DOM.canvas.overlay.classList.remove("processing");
  }
};

export const drawUpdatedImage = async (cb) => {
  resetAllWorkers();
  DOM.canvas.overlay.classList.add("processing");
  DOM.ui.progressPercentage.textContent = "";
  DOM.ui.progressEta.textContent = "";

  try {
    if (!validate()) return;

    await updateImageProcessing();

    if (state.needsZoomInitialization) {
      state.movedPosition = state.position = [0, 0];
      updateZoom();
      state.needsZoomInitialization = false;
    }

    cb?.();
    draw();
  } finally {
    DOM.canvas.overlay.classList.remove("processing");
  }
};

const enableInputs = () => {
  [
    DOM.ui.zoom.inBtn,
    DOM.ui.zoom.outBtn,
    DOM.ui.zoom.input,
    DOM.ui.downloadBtn,
    DOM.ui.settingsResetBtn,
    DOM.ui.settingsForm.brightness,
    DOM.ui.settingsForm.contrast,
    DOM.ui.settingsForm.saturation,
    DOM.ui.settingsForm.dither,
    DOM.ui.settingsForm.width,
    DOM.ui.settingsForm.height,
    DOM.ui.settingsForm["brightness-range"],
    DOM.ui.settingsForm["contrast-range"],
    DOM.ui.settingsForm["saturation-range"],
    DOM.ui.settingsForm["dither-range"],
    ...DOM.ui.sizeBtns,
  ].forEach((el) => (el.disabled = false));
};

export const handleImageLoad = async (image) => {
  state.image = image;
  state.aspectRatio = image.width / image.height;

  state.width = DOM.ui.settingsForm.width.value = image.width;
  state.height = DOM.ui.settingsForm.height.value = image.height;

  DOM.canvas.overlay.classList.add("image-loaded");
  enableInputs();

  state.needsZoomInitialization = true;
  drawUpdatedImage();
};

export const updateZoom = (zoom) => {
  DOM.ui.zoom.input.value = state.zoom = zoom || getInitZoom();
};

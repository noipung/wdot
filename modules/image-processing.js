import { state } from "./state.js";
import { DOM } from "./dom.js";
import { calculateTime, formatTime, formatElapsedTime, getInitZoom, validate } from "./utils.js";
import { adjust, makeOpaque, dither } from "./dithering.js";
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
  const wasAlreadyShowing = DOM.canvas.overlay.classList.contains("processing-over-1s");
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

    if (cb) cb();

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

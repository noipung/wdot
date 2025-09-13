import { state } from "./state.js";
import { canvas, ctx } from "./constants.js";

export const preventDefaults = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

export const validate = () =>
  state.image &&
  state.brightness >= 0 &&
  state.brightness <= 100 &&
  state.contrast >= 0 &&
  state.contrast <= 100 &&
  state.saturation >= 0 &&
  state.saturation <= 100 &&
  state.dither >= 0 &&
  state.dither <= 100 &&
  state.width >= 1 &&
  state.height >= 1;

export const disableImageSmoothing = () => {
  ctx.imageSmoothingEnabled = false;
};

export const getContentColor = ([r, g, b]) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5 ? "#000" : "#fff";

export const dist = (a, b) =>
  a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0);

export const calculateTime = (pixels) => ({
  time: pixels * 30,
  timeWithFlag: pixels * 27,
});

export const formatTime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let result = [];
  if (days > 0) result.push(`${days}일`);
  if (hours > 0) result.push(`${hours}시간`);
  if (minutes > 0) result.push(`${minutes}분`);
  if (secs > 0 || seconds === 0) result.push(`${secs}초`);

  return result.join(" ");
};

export const getZoom = (size = 3 / 4) =>
  ~~(
    (state.aspectRatio > canvas.width / canvas.height
      ? canvas.width / state.width
      : canvas.height / state.height) *
    size *
    100
  );

export const getTouchDistance = (touch1, touch2) => {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getMidpoint = (touch1, touch2) => {
  return [
    (touch1.clientX + touch2.clientX) / 2,
    (touch1.clientY + touch2.clientY) / 2,
  ];
};

import { state } from "./state.js";
import { DOM } from "./dom.js";
import {
  DPR,
  MIN_VALUE,
  MAX_VALUE,
  SECONDS_PER_PIXEL_MANUAL,
  SECONDS_PER_PIXEL_WITH_TOOL,
  DEFAULT_INIT_ZOOM_FACTOR,
  LUMA_COEFF_R,
  LUMA_COEFF_G,
  LUMA_COEFF_B,
  LUMA_THRESHOLD,
  ZOOM_LEVEL_DECIMAL_PLACES,
} from "./constants.js";
import { t } from "./i18n.js";

export const preventDefaults = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

export const validate = () =>
  state.image &&
  state.brightness >= MIN_VALUE &&
  state.brightness <= MAX_VALUE &&
  state.contrast >= MIN_VALUE &&
  state.contrast <= MAX_VALUE &&
  state.saturation >= MIN_VALUE &&
  state.saturation <= MAX_VALUE &&
  state.dither >= MIN_VALUE &&
  state.dither <= MAX_VALUE &&
  state.width >= 1 &&
  state.height >= 1;

export const getContentColor = (r, g, b) =>
  (LUMA_COEFF_R * r + LUMA_COEFF_G * g + LUMA_COEFF_B * b) / 255 >
  LUMA_THRESHOLD
    ? "#000"
    : "#fff";

export const dist = (a, b) =>
  a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0);

export const calculateTime = (pixels) => ({
  time: pixels * SECONDS_PER_PIXEL_MANUAL,
  timeWithFlag: pixels * SECONDS_PER_PIXEL_WITH_TOOL,
});

export const formatTime = (
  totalSeconds,
  { fixed = 0, includeRelativeTerms = false } = {}
) => {
  const d_unit = t("TIME.d");
  const h_unit = t("TIME.h");
  const m_unit = t("TIME.m");
  const s_unit = t("TIME.s");
  const soon = t("TIME.soon");
  const suffix = t("TIME.suffix");
  const sep = t("TIME.sep");

  if (totalSeconds <= 0) return includeRelativeTerms ? soon : `0${s_unit}`;

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (days > 0) parts.push(`${days}${d_unit}`);
  if (hours > 0) parts.push(`${hours}${h_unit}`);
  if (minutes > 0) parts.push(`${minutes}${m_unit}`);

  const formattedSec =
    seconds % 1 === 0 ? Math.floor(seconds).toString() : seconds.toFixed(fixed);

  if (+formattedSec > 0 || parts.length === 0) {
    if (includeRelativeTerms && +formattedSec <= 0 && parts.length === 0) {
      return soon;
    }
    parts.push(`${formattedSec}${s_unit}`);
  }

  const result = parts.join(sep);
  return includeRelativeTerms ? t("TIME.REMAINING", { time: result }) : result;
};

export const getInitZoom = (size = DEFAULT_INIT_ZOOM_FACTOR) => {
  const { width, height } = DOM.canvas.el;

  return (
    ((state.aspectRatio > width / height
      ? width / state.width
      : height / state.height) *
      size *
      100) /
    DPR
  ).toFixed(ZOOM_LEVEL_DECIMAL_PLACES);
};

export const getTouchDistance = (touch1, touch2) => {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.hypot(dx, dy);
};

export const getMidpoint = (touch1, touch2) => {
  return [
    (touch1.clientX + touch2.clientX) / 2,
    (touch1.clientY + touch2.clientY) / 2,
  ];
};

export const hex2Rgb = (h) => {
  h = h.replace("#", "");

  if (h.length === 3) h = h.replace(/([0-9a-f])/gi, "$1$1");

  return h.match(/.{2}/g).map((c) => parseInt(c, 16));
};

export const shortenHex = (h) =>
  "#" + (/^#(.)\1(.)\2(.)\3$/.test(h) ? h[1] + h[3] + h[5] : h.slice(1));

export const rgb2Hex = (r, g, b) => {
  const toHex = (c) => c.toString(16).padStart(2, "0");
  const h = "#" + toHex(r) + toHex(g) + toHex(b);

  return shortenHex(h).toUpperCase();
};

export const isValidHex = (h) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h);

export const insertAndSelectText = (textField, textToInsert) => {
  const { value } = textField;

  textField.value =
    (value ? value.replace(/(,\s*)?$/, ", ") : value) + textToInsert + ", ";
  textField.focus();

  const end = textField.value.length;

  textField.setSelectionRange(end, end);

  dispatchEventTo(textField, "input");
  requestAnimationFrame(() => (textField.scrollTop = textField.scrollHeight));
};

export const enableAutoResize = (textarea) => {
  const resize = () => {
    textarea.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
    const maxHeight = lineHeight * 10;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
  };

  textarea.addEventListener("input", resize);

  resize();
};

export const dispatchEventTo = (element, eventType) => {
  const event = new Event(eventType, {
    bubbles: true,
    cancelable: false,
  });

  element.dispatchEvent(event);
};

const formatColorText = ({ rgb, name }) => `${rgb2Hex(...rgb)}(${name})`;

export const formatColorTexts = (colors) =>
  colors.map(formatColorText).join(", ");

export const parseColorText = (colorText, skipExisting = true) =>
  colorText
    .split(",")
    .map((str) =>
      (
        str
          .trim()
          .replace(/^#?/, "#")
          .match(/^(#(?:[a-f0-9]{3}){1,2})\s?(?:\((.+)?\)|$)?$/i) || []
      ).slice(1)
    )
    .filter(([hex]) => isValidHex(hex))
    .map(([hex, name]) => {
      const shortUpperHex = shortenHex(hex).toUpperCase();
      return [shortUpperHex, (name || shortUpperHex).trim()];
    })
    .filter(
      ([hex, name]) =>
        !skipExisting ||
        (!state.palette.getColorByRgb(...hex2Rgb(hex)) &&
          !state.palette.colors.find(
            (color) => color.name.toUpperCase() === name.toUpperCase()
          ))
    )
    .reduce(
      (acc, [hex, name]) => {
        const [colors, hexSet, nameSet] = acc;
        const upperName = name.toUpperCase();

        if (hexSet.has(hex) || nameSet.has(upperName)) return acc;

        hexSet.add(hex);
        nameSet.add(upperName);
        colors.push([hex, name]);

        return acc;
      },
      [[], new Set(), new Set()]
    )[0];

export const updateScrollClass = (container) => {
  const wrapper = container.parentNode;
  const { scrollLeft, clientWidth, scrollWidth } = container;

  const epsilon = 2;
  const atStart = scrollLeft === 0;
  const atEnd = scrollLeft + clientWidth >= scrollWidth - epsilon;

  wrapper.classList.toggle("at-start", atStart);
  wrapper.classList.toggle("at-end", atEnd);
};

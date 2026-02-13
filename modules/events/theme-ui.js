import { DOM } from "../dom.js";
import {
  THEME_ICONS,
  THEME_STORAGE_KEY,
  THEME_ICON_CONFIG,
} from "../constants.js";

export const initThemeUI = () => {
  const {
    radios: themeRadios,
    root: rootEl,
    favicon,
    iconSources,
    iconImgs,
  } = DOM.theme;
  let currentMediaQuery = null;
  let currentHandler = null;

  const cleanupListener = () => {
    if (currentMediaQuery && currentHandler) {
      currentMediaQuery.removeEventListener("change", currentHandler);
      currentMediaQuery = null;
      currentHandler = null;
    }
  };

  const updateThemeAssets = (value) => {
    cleanupListener();

    const isSystem = value === "system";
    const isDark = value === "dark";
    const lightIcon = THEME_ICONS.LIGHT;
    const darkIcon = THEME_ICONS.DARK;

    // 1. Favicon 업데이트 함수
    const setFavicon = (dark) => {
      favicon.href = dark ? darkIcon : lightIcon;
    };

    if (isSystem) {
      currentMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      currentHandler = (e) => setFavicon(e.matches);
      setFavicon(currentMediaQuery.matches);
      currentMediaQuery.addEventListener("change", currentHandler);
    } else {
      setFavicon(isDark);
    }

    // 2. Icon Sources & Images 업데이트
    const { media, srcset, src } = THEME_ICON_CONFIG[value];
    iconSources.forEach((s) => {
      s.media = media;
      s.srcset = srcset;
    });
    iconImgs.forEach((img) => {
      img.src = src;
    });
  };

  const applyTheme = (value, save = true) => {
    // dataset 처리 (null이면 속성 삭제 효과)
    rootEl.dataset.theme = value === "system" ? "" : value;
    if (!rootEl.dataset.theme) delete rootEl.dataset.theme;

    updateThemeAssets(value);
    if (save) localStorage.setItem(THEME_STORAGE_KEY, value);
  };

  // 초기화
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "system";
  applyTheme(savedTheme, false); // 초기 로드 시엔 저장 생략

  themeRadios.forEach((radio) => {
    radio.checked = radio.value === savedTheme;
    radio.addEventListener("change", (e) => {
      if (e.target.checked) applyTheme(e.target.value);
    });
  });
};

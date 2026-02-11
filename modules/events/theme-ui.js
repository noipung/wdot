import { DOM } from "../dom.js";
import { THEME_ICONS, THEME_STORAGE_KEY } from "../constants.js";

export const initThemeUI = () => {
  const themeRadios = DOM.theme.radios;
  const rootEl = DOM.theme.root;

  const updateThemeAssets = (value) => {
    const lightIcon = THEME_ICONS.LIGHT;
    const darkIcon = THEME_ICONS.DARK;

    // 파비콘: 항상 동적 파비콘 하나만으로 관리
    let dynamicFavicon = document.getElementById("favicon-dynamic");

    if (!dynamicFavicon) {
      dynamicFavicon = document.createElement("link");
      dynamicFavicon.id = "favicon-dynamic";
      dynamicFavicon.rel = "icon";
      dynamicFavicon.type = "image/svg+xml";
      document.head.appendChild(dynamicFavicon);
    }

    if (value === "system") {
      // system: 현재 OS 테마에 맞춰 즉시 파비콘을 갱신
      const prefersDark = window.matchMedia?.(
        "(prefers-color-scheme: dark)",
      ).matches;
      dynamicFavicon.href = prefersDark ? darkIcon : lightIcon;
    } else {
      // 수동(light/dark): 선택된 테마에 맞게 강제
      dynamicFavicon.href = value === "dark" ? darkIcon : lightIcon;
    }

    // about 버튼 / about 다이얼로그 로고
    const sources = DOM.theme.iconSources;
    const imgs = DOM.theme.iconImgs;

    if (value === "system") {
      // OS 기준: source는 다크 미디어쿼리, img는 라이트 아이콘
      sources.forEach((source) => {
        source.media = "(prefers-color-scheme: dark)";
        source.srcset = darkIcon;
      });
      imgs.forEach((img) => {
        img.src = lightIcon;
      });
    } else if (value === "dark") {
      // 수동 다크: source 비활성화, img를 다크 아이콘으로
      sources.forEach((source) => {
        source.media = "not all";
        source.srcset = darkIcon;
      });
      imgs.forEach((img) => {
        img.src = darkIcon;
      });
    } else {
      // 수동 라이트: source 비활성화, img를 라이트 아이콘으로
      sources.forEach((source) => {
        source.media = "not all";
        source.srcset = darkIcon;
      });
      imgs.forEach((img) => {
        img.src = lightIcon;
      });
    }
  };

  const applyTheme = (value) => {
    if (value === "light") {
      rootEl.dataset.theme = "light";
    } else if (value === "dark") {
      rootEl.dataset.theme = "dark";
    } else {
      // system: 명시적인 테마 설정 제거 → CSS light-dark() + prefers-color-scheme 사용
      delete rootEl.dataset.theme;
    }

    updateThemeAssets(value);
    localStorage.setItem(THEME_STORAGE_KEY, value);
  };

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "system";
  applyTheme(savedTheme);

  themeRadios.forEach((radio) => {
    radio.checked = radio.value === savedTheme;

    radio.addEventListener("change", (e) => {
      if (!e.target.checked) return;
      applyTheme(e.target.value);
    });
  });
};


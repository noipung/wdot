import "../modules/events.js";
import { initEventListeners } from "../modules/events.js";
import { initPaletteUI } from "../modules/palette.js";
import "../modules/ui.js";

const initGaAnalytics = () => {
  if (!import.meta.env.PROD) return;

  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${
    import.meta.env.VITE_GA_ID
  }`;
  document.head.appendChild(s1);

  const s2 = document.createElement("script");
  s2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${import.meta.env.VITE_GA_ID}');
  `;
  document.head.appendChild(s2);
};

const initApp = async () => {
  initGaAnalytics();

  try {
    await initPaletteUI();
    initEventListeners();
  } catch (error) {
    console.error("애플리케이션 초기화 중 오류 발생:", error);
  }
};

initApp();

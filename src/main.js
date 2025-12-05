import "../modules/events.js";
import { initEventListeners } from "../modules/events.js";
import { initPaletteUI } from "../modules/palette.js";
import { GA_ID, CLARITY_ID } from "../modules/constants.js";
import "../modules/ui.js";

const initAnalytics = () => {
  if (!import.meta.env.PROD) return;

  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s1);

  const s2 = document.createElement("script");
  s2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  `;
  document.head.appendChild(s2);

  const c1 = document.createElement("script");
  c1.innerHTML = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${CLARITY_ID}");
  `;
  document.head.appendChild(c1);
};

const initApp = async () => {
  initAnalytics();

  try {
    await initPaletteUI();
    initEventListeners();
  } catch (error) {
    console.error("애플리케이션 초기화 중 오류 발생:", error);
  }
};

initApp();

import ko from "./locales/ko.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

export const TRANSLATIONS = { ko, en, ja };

export const getLanguage = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const langQuery = urlParams.get("lang");

  if (langQuery && TRANSLATIONS[langQuery]) {
    return langQuery;
  }

  const browserLang = navigator.language.split("-")[0];
  return TRANSLATIONS[browserLang] ? browserLang : "en";
};

export const t = (path, params = {}) => {
  const lang = getLanguage();
  const keys = path.split(".");
  let result = TRANSLATIONS[lang];

  for (const key of keys) {
    if (result[key] === undefined) {
      // Fallback to English
      result = TRANSLATIONS["en"];
      for (const enKey of keys) {
        if (result[enKey] === undefined) return path;
        result = result[enKey];
      }
      break;
    }
    result = result[key];
  }

  if (typeof result !== "string") return path;

  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, value);
  });

  return result;
};

export const initI18n = () => {
  const lang = getLanguage();
  document.documentElement.lang = lang;

  const url = new URL(window.location);
  const query = url.searchParams.get("lang");
  if (lang !== "ko" && query !== lang) {
    url.searchParams.set("lang", lang);
    window.history.replaceState({}, "", url);
  }

  const elements = document.querySelectorAll("[data-i18n]");
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const translation = t(key);
    if (translation !== key) {
      if (
        el.tagName === "INPUT" &&
        (el.type === "button" || el.type === "submit")
      ) {
        el.value = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  const attrElements = document.querySelectorAll("[data-i18n-attr]");
  attrElements.forEach((el) => {
    const config = el.getAttribute("data-i18n-attr").split(":");
    if (config.length === 2) {
      const [attr, key] = config;
      const translation = t(key);
      if (translation !== key) {
        el.setAttribute(attr, translation);
      }
    }
  });
};

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Translations
import translationEN from "../translations/en.json";
import translationID from "../translations/id.json";
import translationFR from "../translations/fr.json";
import translationNL from "../translations/nl.json";
import translationRU from "../translations/ru.json";
import translationZH from "../translations/zh.json";

const resources = {
  en: {
    translation: translationEN,
  },
  id: {
    translation: translationID,
  },
  fr: {
    translation: translationFR,
  },
  nl: {
    translation: translationNL,
  },
  ru: {
    translation: translationRU,
  },
  zh: {
    translation: translationZH,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

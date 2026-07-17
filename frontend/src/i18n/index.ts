import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "./locales/fr.json";
import en from "./locales/en.json";
import rn from "./locales/rn.json";
import sw from "./locales/sw.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      rn: { translation: rn },
      sw: { translation: sw },
    },
    fallbackLng: "fr",
    supportedLngs: ["fr", "en", "rn", "sw"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "isoko_lang",
    },
  });

export default i18n;

export const SUPPORTED_LANGUAGES = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "rn", label: "Kirundi", flag: "🇧🇮" },
  { code: "sw", label: "Kiswahili", flag: "🇹🇿" },
];

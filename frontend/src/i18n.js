import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import English translations
import enTranslations from './locales/en.json';

i18n
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next — English only
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;

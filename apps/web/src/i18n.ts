import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import hu from './translations/hu.json';
import en from './translations/en.json';

// Initialize i18next with translations and default language
i18n
  .use(initReactI18next)
  .init({
    resources: {
      hu: { translation: hu },
      en: { translation: en },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

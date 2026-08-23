import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// Client-only init (this file is imported by a 'use client' provider). We
// don't use i18next-browser-languagedetector here on purpose: the source of
// truth for which language a signed-in user sees is their own saved
// UserSettings.language from the database (set from the Settings page,
// persisted server-side, synced on login) — not the browser's Accept-
// Language header or localStorage, which would disagree with what the
// account actually has saved the moment they use a different device.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng: 'en', // overwritten immediately once the signed-in user's saved language is known — see components/providers.tsx
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes — double-escaping would show literal &amp; etc.
    react: { useSuspense: false }, // avoids a suspense flash on every page that reads a translation before resources are attached
  });
}

export default i18n;

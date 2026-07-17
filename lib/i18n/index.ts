import id from './id';
import en from './en';

export type Locale = 'id' | 'en';
export type Translations = typeof id;

const translations: Record<Locale, Translations> = { id, en };

export function getTranslations(locale: Locale): Translations {
  return translations[locale] ?? translations.id;
}

export { id, en };

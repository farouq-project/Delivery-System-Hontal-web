import id from './id';
import en from './en';

export type Locale = 'id' | 'en';

// Use a mapped type with string leaves so both id and en satisfy it.
type DeepStringify<T> = T extends string
  ? string
  : { readonly [K in keyof T]: DeepStringify<T[K]> };

export type Translations = DeepStringify<typeof id>;

const translations: Record<Locale, Translations> = {
  id: id as Translations,
  en: en as Translations,
};

export function getTranslations(locale: Locale): Translations {
  return translations[locale] ?? translations.id;
}

export { id, en };

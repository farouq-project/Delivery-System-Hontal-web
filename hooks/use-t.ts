'use client';

import { useLocaleStore } from '@/store/locale';
import { getTranslations, type Translations } from '@/lib/i18n';

export function useT(): Translations {
  const locale = useLocaleStore((s) => s.locale);
  return getTranslations(locale);
}

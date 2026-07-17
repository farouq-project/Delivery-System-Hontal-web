'use client';

import { useLocaleStore } from '@/store/locale';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <button
      onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
      title={locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
    >
      <span className="text-base leading-none">{locale === 'id' ? '🇮🇩' : '🇬🇧'}</span>
      <span className="font-medium">{locale.toUpperCase()}</span>
    </button>
  );
}

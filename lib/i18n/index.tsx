'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { en, type TranslationKey } from './en';
import { ur } from './ur';

export type Locale = 'en' | 'ur';

const dictionaries = { en, ur };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'hz-locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ur') return saved;
    } catch {}
    return 'en';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try { localStorage.setItem(STORAGE_KEY, newLocale); } catch {}
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ur' ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
  }, [locale]);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let str = dictionaries[locale][key] || dictionaries.en[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }, [locale]);

  const dir = locale === 'ur' ? 'rtl' : 'ltr';

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useTranslation() {
  const { t } = useI18n();
  return t;
}

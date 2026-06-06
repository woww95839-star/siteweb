'use client';
import React, { useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import '../i18n/config';

interface RtlContextValue {
  isRtl: boolean;
  language: string;
  setLanguage: (lang: 'ar' | 'fr') => void;
}

const RtlContext = createContext<RtlContextValue>({
  isRtl: false,
  language: 'fr',
  setLanguage: () => {},
});

export const useRtl = () => useContext(RtlContext);

// ── RtlProvider ───────────────────────────────────────────
export function RtlProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    const html = document.documentElement;
    html.dir = isRtl ? 'rtl' : 'ltr';
    html.lang = i18n.language;
    document.body.style.fontFamily = isRtl
      ? "'Noto Sans Arabic', sans-serif"
      : "'Inter', sans-serif";
  }, [i18n.language, isRtl]);

  const setLanguage = (lang: 'ar' | 'fr') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('sokplus-lang', lang);
  };

  return (
    <RtlContext.Provider value={{ isRtl, language: i18n.language, setLanguage }}>
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen">
        {children}
      </div>
    </RtlContext.Provider>
  );
}

// ── LanguageSwitcher ──────────────────────────────────────
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const { setLanguage } = useRtl();
  const isAr = i18n.language === 'ar';

  const toggle = () => setLanguage(isAr ? 'fr' : 'ar');

  if (compact) {
    return (
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.92 }}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full
                   bg-surface-100 border border-border hover:bg-surface-200
                   transition-colors text-sm font-medium text-text-secondary
                   select-none cursor-pointer"
        title={isAr ? 'Passer au Français' : 'التحويل إلى العربية'}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={i18n.language}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1.5"
          >
            <span className="text-base leading-none">{isAr ? '🇩🇿' : '🇫🇷'}</span>
            <span className="font-semibold tracking-wide">
              {isAr ? 'عربي' : 'FR'}
            </span>
          </motion.span>
        </AnimatePresence>
      </motion.button>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-surface-100 border border-border">
      {(['fr', 'ar'] as const).map((lang) => (
        <motion.button
          key={lang}
          onClick={() => setLanguage(lang)}
          whileTap={{ scale: 0.94 }}
          className={`relative px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors select-none cursor-pointer ${
            i18n.language === lang
              ? 'text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {i18n.language === lang && (
            <motion.span
              layoutId="lang-pill"
              className="absolute inset-0 rounded-full bg-brand-600"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10">
            {lang === 'ar' ? 'العربية' : 'Français'}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

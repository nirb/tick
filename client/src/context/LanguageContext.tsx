import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionaries, type Language, type Translations } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  direction: 'ltr' | 'rtl';
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof Translations, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('tick_lang') as Language;
    if (saved === 'en' || saved === 'he') return saved;
    // Auto-detect browser language
    if (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('he')) {
      return 'he';
    }
    return 'en';
  });

  const direction = language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem('tick_lang', language);
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'he' : 'en'));
  };

  const t = (key: keyof Translations, vars?: Record<string, string | number>): string => {
    const dict = dictionaries[language] || dictionaries.en;
    let text = dict[key] || dictionaries.en[key] || (key as string);

    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction,
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

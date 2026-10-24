import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LANGUAGE_STORAGE_KEY = 'copaculmeu_lang';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'ro' || stored === 'en') {
        return stored;
      }
      // Check browser language preference
      const browserLang = navigator.language?.toLowerCase();
      if (browserLang.startsWith('en')) {
        return 'en';
      }
    } catch {
      // Fallback
    }
    return 'ro';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ro' ? 'en' : 'ro');
  }, [language, setLanguage]);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // Ignore
    }
  }, [language]);

  /**
   * Translate key path (e.g. 'header.searchPlaceholder') with optional parameter interpolation
   */
  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      let currentVal: any = translations[language];

      for (const k of keys) {
        if (currentVal && typeof currentVal === 'object' && k in currentVal) {
          currentVal = currentVal[k];
        } else {
          currentVal = undefined;
          break;
        }
      }

      // Fallback to Romanian if missing in target language
      if (currentVal === undefined) {
        currentVal = translations['ro'];
        for (const k of keys) {
          if (currentVal && typeof currentVal === 'object' && k in currentVal) {
            currentVal = currentVal[k];
          } else {
            currentVal = undefined;
            break;
          }
        }
      }

      if (typeof currentVal !== 'string') {
        return path;
      }

      if (!params) {
        return currentVal;
      }

      // Replace {paramName} placeholders
      return Object.entries(params).reduce((res, [paramKey, paramVal]) => {
        return res.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }, currentVal);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

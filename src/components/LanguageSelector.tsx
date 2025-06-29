import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';

interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

interface LanguageSelectorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export default function LanguageSelector({ variant = 'default', className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  const handleLanguageChange = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
          title={t('auth.language')}
        >
          <span className="text-lg">{currentLanguage.flag}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[140px] z-20">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm text-gray-700">{lang.name}</span>
                  {language === lang.code && (
                    <Check className="w-4 h-4 text-blue-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('auth.language')}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="text-gray-900">{currentLanguage.name}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-gray-900">{lang.name}</span>
                {language === lang.code && (
                  <Check className="w-4 h-4 text-blue-600 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
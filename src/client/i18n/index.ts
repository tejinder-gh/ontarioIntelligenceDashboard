import enCA from './locales/en-CA.json';
import frCA from './locales/fr-CA.json';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  formatDate, 
  SupportedLocale 
} from '../utils/formatters.js';

export * from '../utils/formatters.js';

const translations: Record<SupportedLocale, any> = {
  'en-CA': enCA,
  'fr-CA': frCA,
};

let currentLocale: SupportedLocale = 'en-CA';
const listeners = new Set<(locale: SupportedLocale) => void>();

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function setLocale(locale: SupportedLocale): void {
  if (locale !== currentLocale && (locale === 'en-CA' || locale === 'fr-CA')) {
    currentLocale = locale;
    listeners.forEach((listener) => listener(currentLocale));
  }
}

export function subscribeLocale(listener: (locale: SupportedLocale) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Nested key lookup translation helper
 * Supports both t('key', 'Fallback') and t('key', 'en-CA')
 */
export function t(
  key: string,
  fallbackOrLocale?: string | SupportedLocale,
  maybeLocale?: SupportedLocale
): string {
  let locale: SupportedLocale = currentLocale;
  let fallback: string = key;

  if (fallbackOrLocale === 'en-CA' || fallbackOrLocale === 'fr-CA') {
    locale = fallbackOrLocale;
  } else if (typeof fallbackOrLocale === 'string') {
    fallback = fallbackOrLocale;
    if (maybeLocale === 'en-CA' || maybeLocale === 'fr-CA') {
      locale = maybeLocale;
    }
  }

  const dict = translations[locale] || translations['en-CA'];
  const segments = key.split('.');
  
  let current: any = dict;
  for (const seg of segments) {
    if (current && typeof current === 'object' && seg in current) {
      current = current[seg];
    } else {
      // Fallback to en-CA if missing in fr-CA
      let fbDict: any = translations['en-CA'];
      for (const fSeg of segments) {
        if (fbDict && typeof fbDict === 'object' && fSeg in fbDict) {
          fbDict = fbDict[fSeg];
        } else {
          return fallback;
        }
      }
      return typeof fbDict === 'string' ? fbDict : fallback;
    }
  }

  return typeof current === 'string' ? current : fallback;
}

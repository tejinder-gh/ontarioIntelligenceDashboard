import { describe, it, expect } from 'bun:test';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  formatDate 
} from '../src/client/utils/formatters.js';
import { t, setLocale, getLocale, subscribeLocale } from '../src/client/i18n/index.js';
import enCA from '../src/client/i18n/locales/en-CA.json';
import frCA from '../src/client/i18n/locales/fr-CA.json';

describe('T-007 Internationalization & Locale-Aware Formatters Suite', () => {
  it('AC1 & AC2: formats currency correctly for en-CA and fr-CA', () => {
    const enCurrency = formatCurrency(116000, 'en-CA');
    expect(enCurrency).toBe('$116,000');

    const frCurrency = formatCurrency(116000, 'fr-CA');
    // fr-CA puts $ after the number with non-breaking spaces (e.g., 116 000 $)
    expect(frCurrency).toContain('116');
    expect(frCurrency).toContain('$');
    // Normalize spaces to verify 116 000 $
    const normalizedFr = frCurrency.replace(/[\s\u00A0\u202F]/g, ' ');
    expect(normalizedFr).toBe('116 000 $');

    // Handles null / undefined / NaN gracefully
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency(NaN)).toBe('—');
  });

  it('AC1: formats numbers, percentages, and dates according to Canadian locale norms', () => {
    // Number formatting
    const enNum = formatNumber(186948, 'en-CA');
    expect(enNum).toBe('186,948');

    const frNum = formatNumber(186948, 'fr-CA');
    const normalizedFrNum = frNum.replace(/[\s\u00A0\u202F]/g, ' ');
    expect(normalizedFrNum).toBe('186 948');

    // Percentage formatting
    expect(formatPercent(2.5, 'en-CA')).toBe('2.5%');
    expect(formatPercent(2.5, 'fr-CA').replace(/[\s\u00A0\u202F]/g, ' ')).toContain('2,5');

    // Date formatting
    const sampleDate = new Date('2026-01-15T12:00:00Z');
    const enDate = formatDate(sampleDate, 'en-CA');
    expect(enDate).toContain('2026');
  });

  it('AC3: translation resource structure has parity between en-CA and fr-CA', () => {
    expect(enCA.brand.title).toBe('Ontario Intel');
    expect(frCA.brand.title).toBe('Intel Ontario');

    // Navigation categories
    expect(enCA.nav.categories.executive_strategy).toBe('Executive & Strategy');
    expect(frCA.nav.categories.executive_strategy).toBe('Direction et Stratégie');

    // Navigation tabs
    expect(enCA.nav.tabs.overview).toBe('Executive Overview');
    expect(frCA.nav.tabs.overview).toBe('Aperçu exécutif');
    expect(enCA.nav.tabs.opportunity_lab).toBe('Opportunity Lab');
    expect(frCA.nav.tabs.opportunity_lab).toBe("Laboratoire d'opportunités");

    // Action buttons
    expect(enCA.actions.compare).toBe('Compare Mode');
    expect(frCA.actions.compare).toBe('Mode comparatif');
  });

  it('AC4: t() helper translates keys dynamically and reacts to locale changes', () => {
    setLocale('en-CA');
    expect(getLocale()).toBe('en-CA');
    expect(t('nav.tabs.overview')).toBe('Executive Overview');

    // Test subscription listener
    let notifiedLocale = '';
    const unsubscribe = subscribeLocale((loc) => {
      notifiedLocale = loc;
    });

    setLocale('fr-CA');
    expect(getLocale()).toBe('fr-CA');
    expect(notifiedLocale).toBe('fr-CA');
    expect(t('nav.tabs.overview')).toBe('Aperçu exécutif');
    expect(t('actions.compare')).toBe('Mode comparatif');

    // Fallback for non-existent key returns key itself
    expect(t('non.existent.key')).toBe('non.existent.key');

    // Cleanup back to en-CA
    unsubscribe();
    setLocale('en-CA');
    expect(getLocale()).toBe('en-CA');
  });
});

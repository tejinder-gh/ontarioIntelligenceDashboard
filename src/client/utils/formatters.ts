export type SupportedLocale = 'en-CA' | 'fr-CA';

/**
 * Locale-aware Canadian currency formatter
 * @param amount Numeric value in CAD
 * @param locale Target locale ('en-CA' or 'fr-CA'), defaults to 'en-CA'
 * @param maxDecimals Decimal precision, defaults to 0 for whole dollars
 */
export function formatCurrency(
  amount: number | null | undefined,
  locale: SupportedLocale = 'en-CA',
  maxDecimals: number = 0
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(amount);
}

/**
 * Locale-aware number formatter with standard thousands separators
 * (e.g., '186,948' in en-CA vs '186 948' in fr-CA)
 */
export function formatNumber(
  value: number | null | undefined,
  locale: SupportedLocale = 'en-CA',
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Locale-aware percentage formatter
 * (e.g., '2.5%' in en-CA vs '2,5 %' in fr-CA)
 */
export function formatPercent(
  value: number | null | undefined,
  locale: SupportedLocale = 'en-CA',
  decimals: number = 1
): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Locale-aware date formatter
 */
export function formatDate(
  date: string | Date | null | undefined,
  locale: SupportedLocale = 'en-CA',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat(locale, options).format(d);
}

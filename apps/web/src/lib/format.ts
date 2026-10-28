/** Locale-aware money formatter with sensible defaults for MENA currencies. */
export function formatMoney(value: number | null | undefined, currency = 'SAR', locale = 'ar-SA'): string {
  if (value == null) return '—';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

export function formatDate(value: string | Date | null | undefined, locale = 'ar-SA'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return formatDate(value);
}

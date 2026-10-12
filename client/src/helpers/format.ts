const LOCALE = 'en-AU';

const wholeDollars = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const dollarsAndCents = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'AUD' });
const timeOfDay = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' });

export function formatMoney(cents: number): string {
  return (cents % 100 === 0 ? wholeDollars : dollarsAndCents).format(cents / 100);
}

export function formatMoneyDelta(cents: number): string {
  if (cents === 0) return 'Same price';
  return `${cents > 0 ? '+' : '−'}${formatMoney(Math.abs(cents))}`;
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return timeOfDay.formatRange(new Date(startIso), new Date(endIso));
}

export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateParts(iso: string) {
  const date = new Date(iso);
  return {
    weekday: date.toLocaleDateString(LOCALE, { weekday: 'short' }),
    day: date.getDate(),
    month: date.toLocaleDateString(LOCALE, { month: 'short' }),
  };
}

export function relativeDay(iso: string): string {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);
  if (days < 0) return 'Finished';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 14) return `In ${days} days`;
  return `In ${Math.round(days / 7)} weeks`;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

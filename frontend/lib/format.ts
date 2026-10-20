const currency0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const formatCurrency = (value: number) => currency0.format(Math.round(value));
export const formatInteger = (value: number) => integer.format(value);

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/** Axis label: 0 -> "0k", 750 -> "0.75k", 1500 -> "1.5k". */
export function formatAxisK(value: number): string {
  const k = Math.round((value / 1000) * 100) / 100;
  return `${k}k`;
}

/** Monday date string -> "Oct 13 – Oct 19, 2026" */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: withYear ? 'numeric' : undefined, timeZone: 'UTC' });
  return `${fmt(start, false)} – ${fmt(end, true)}`;
}

import type { TrendDay } from '@/lib/types';
import { formatCurrency, formatInteger } from '@/lib/format';
import type { BarSpec } from './series';

/** Monday 'YYYY-MM-DD' + day index -> "Friday, Oct 23" */
export function dayDateLabel(weekStart: string, dayIndex: number): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

interface DayTooltipProps {
  id: string;
  day: TrendDay;
  bars: BarSpec[];
  align: 'left' | 'right';
  weekStart: string;
}

export default function DayTooltip({ id, day, bars, align, weekStart }: DayTooltipProps) {
  const rows = bars.flatMap((b) => b.segments);
  return (
    <div id={id} className={`rt-tooltip rt-tooltip-${align}`} role="tooltip" data-export-ignore="true">
      <div className="rt-tooltip-title">{dayDateLabel(weekStart, day.dayIndex)}</div>
      {rows.map((seg) => (
        <div key={seg.label} className="rt-tooltip-row">
          <span className="rt-dot" style={{ background: seg.color }} />
          <span className="rt-tooltip-label">{seg.label}</span>
          <span className="rt-tooltip-value">{formatCurrency(seg.value)}</span>
        </div>
      ))}
      <div className="rt-tooltip-row rt-tooltip-muted">
        <span className="rt-tooltip-label">Covers</span>
        <span className="rt-tooltip-value">
          {formatInteger(day.covers)}
          {day.previous ? ` (prev ${formatInteger(day.previous.covers)})` : ''}
        </span>
      </div>
      {day.eventImpact && (
        <div className={`rt-tooltip-event ${day.eventImpact === 'positive' ? 'rt-up' : 'rt-down'}`}>
          {day.eventImpact === 'positive' ? '▲' : '▼'}{' '}
          {day.eventNote || (day.eventImpact === 'positive' ? 'Positive event' : 'Negative event')}
        </div>
      )}
    </div>
  );
}

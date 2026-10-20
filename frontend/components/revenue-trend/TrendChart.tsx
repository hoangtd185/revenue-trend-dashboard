'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { TrendDay } from '@/lib/types';
import { formatAxisK, formatCurrency } from '@/lib/format';
import { niceScale } from '@/lib/chart';
import { TrendDownIcon, TrendUpIcon } from '../icons';
import DayTooltip, { dayDateLabel } from './DayTooltip';
import { barTotal, type BarSpec } from './series';

/** Grows from 0 on mount, then animates whenever its height changes. */
function AnimatedBar({ bar, max }: { bar: BarSpec; max: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const total = barTotal(bar);
  const pct = max > 0 ? Math.min(100, (total / max) * 100) : 0;
  return (
    <div className="rt-bar" style={{ height: ready ? `${pct}%` : '0%' }}>
      {total > 0 &&
        bar.segments.map((seg) => <div key={seg.key} className="rt-seg" style={{ flexGrow: seg.value, background: seg.color }} />)}
    </div>
  );
}

function EventMarker({ impact, note }: { impact: 'positive' | 'negative'; note: string | null }) {
  const title = `${impact === 'positive' ? 'Positive' : 'Negative'} event impact${note ? `: ${note}` : ''}`;
  return (
    <div className={`rt-event rt-event-${impact}`} title={title}>
      {impact === 'positive' ? <TrendUpIcon size={13} /> : <TrendDownIcon size={13} />}
    </div>
  );
}

/** Text alternative for one day column (read by screen readers, shown on focus as the tooltip). */
function describeDay(day: TrendDay, bars: BarSpec[], weekStart: string): string {
  const values = bars.flatMap((b) => b.segments).map((s) => `${s.label} ${formatCurrency(s.value)}`);
  const event = day.eventImpact ? `, ${day.eventImpact} event${day.eventNote ? `: ${day.eventNote}` : ''}` : '';
  return `${dayDateLabel(weekStart, day.dayIndex)}: ${values.join(', ') || 'no series selected'}${event}`;
}

interface TrendChartProps {
  days: TrendDay[];
  bars: BarSpec[][];
  weekStart: string;
}

export default function TrendChart({ days, bars, weekStart }: TrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipId = useId();

  const scale = useMemo(() => niceScale(Math.max(0, ...bars.flat().map(barTotal))), [bars]);
  const ticks = useMemo(() => Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step), [scale]);
  const toPct = (value: number) => (scale.max > 0 ? (value / scale.max) * 100 : 0);

  return (
    <div className="rt-chart" onMouseLeave={() => setActiveIndex(null)}>
      <div className="rt-yaxis" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className="rt-ytick" style={{ bottom: `${toPct(t)}%` }}>
            {formatAxisK(t)}
          </span>
        ))}
      </div>

      <div className="rt-plot-wrap">
        <div className="rt-plot" role="list" aria-label="Daily revenue and labour costs">
          {ticks.map((t) => (
            <div key={t} className="rt-hgrid" style={{ bottom: `${toPct(t)}%` }} aria-hidden="true" />
          ))}

          {days.map((day, i) => {
            const dayBars = bars[i];
            const isActive = activeIndex === i;
            return (
              <div
                key={day.dayIndex}
                role="listitem"
                tabIndex={0}
                aria-label={describeDay(day, dayBars, weekStart)}
                aria-describedby={isActive ? `${tooltipId}-${i}` : undefined}
                className={`rt-col${isActive ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
                onKeyDown={(e) => e.key === 'Escape' && setActiveIndex(null)}
              >
                <div className="rt-vgrid-center" aria-hidden="true" />
                <div className={`rt-bars rt-bars-${dayBars.length}`}>
                  {dayBars.map((bar) => (
                    <AnimatedBar key={bar.key} bar={bar} max={scale.max} />
                  ))}
                </div>
                {day.eventImpact && (
                  <div
                    className="rt-event-anchor"
                    style={{ bottom: `calc(${toPct(Math.max(0, ...dayBars.map(barTotal)))}% + 18px)` }}
                  >
                    <EventMarker impact={day.eventImpact} note={day.eventNote} />
                  </div>
                )}
                {isActive && (
                  <DayTooltip id={`${tooltipId}-${i}`} day={day} bars={dayBars} align={i >= 4 ? 'right' : 'left'} weekStart={weekStart} />
                )}
              </div>
            );
          })}
        </div>
        <div className="rt-xaxis" aria-hidden="true">
          {days.map((d) => (
            <span key={d.dayIndex}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

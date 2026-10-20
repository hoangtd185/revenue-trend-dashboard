'use client';

import { useMemo, useRef, useState } from 'react';
import type { TrendResponse } from '@/lib/types';
import { formatWeekRange } from '@/lib/format';
import TrendHeader from './revenue-trend/TrendHeader';
import KpiCards from './revenue-trend/KpiCards';
import TrendChart from './revenue-trend/TrendChart';
import TrendLegend from './revenue-trend/TrendLegend';
import { buildBars, type SeriesKey, type Visible } from './revenue-trend/series';
import { useExportPng } from './revenue-trend/useExportPng';

/**
 * "This Week's Revenue Trend vs Previous Period" card.
 * Owns the UI state (visible series, compare mode); the pieces below are presentational.
 */
export default function RevenueTrendCard({ data }: { data: TrendResponse }) {
  const cardRef = useRef<HTMLElement>(null);
  const canCompare = Boolean(data.previousWeek && data.summary.previous);
  const [visible, setVisible] = useState<Visible>({ pos: true, eatclub: true, labour: true });
  const [compareOn, setCompareOn] = useState(true);
  const compare = compareOn && canCompare;

  const bars = useMemo(() => data.days.map((d) => buildBars(d, visible, compare)), [data.days, visible, compare]);
  const { exportPng, exporting, error } = useExportPng(
    cardRef,
    `revenue-trend-${data.week.weekStart}${compare ? '-vs-previous' : ''}.png`,
  );

  const toggleSeries = (key: SeriesKey) => setVisible((v) => ({ ...v, [key]: !v[key] }));

  return (
    <section ref={cardRef} className="rt-card" aria-label={`Revenue trend, week of ${formatWeekRange(data.week.weekStart)}`}>
      <TrendHeader
        compare={compare}
        canCompare={canCompare}
        visible={visible}
        exporting={exporting}
        onToggleSeries={toggleSeries}
        onToggleCompare={() => setCompareOn((c) => !c)}
        onExport={exportPng}
      />
      {error && (
        <p className="rt-error" role="alert" data-export-ignore="true">
          {error}
        </p>
      )}
      <KpiCards summary={data.summary} compare={compare} />
      <TrendChart days={data.days} bars={bars} weekStart={data.week.weekStart} />
      <TrendLegend visible={visible} compare={compare} />
    </section>
  );
}

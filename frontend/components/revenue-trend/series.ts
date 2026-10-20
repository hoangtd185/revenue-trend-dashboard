import type { TrendDay } from '@/lib/types';

export type SeriesKey = 'pos' | 'eatclub' | 'labour';
export type Visible = Record<SeriesKey, boolean>;

/** Colours live in CSS tokens (globals.css :root --chart-*), referenced here by name. */
export const COLORS = {
  pos: 'var(--chart-pos)',
  eatclub: 'var(--chart-eatclub)',
  labour: 'var(--chart-labour)',
  prevPos: 'var(--chart-prev-pos)',
  prevEatclub: 'var(--chart-prev-eatclub)',
  prevLabour: 'var(--chart-prev-labour)',
} as const;

export const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: 'pos', label: 'POS Revenue', color: COLORS.pos },
  { key: 'eatclub', label: 'Eatclub Revenue', color: COLORS.eatclub },
  { key: 'labour', label: 'Labour Costs', color: COLORS.labour },
];

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface BarSpec {
  key: string;
  segments: Segment[];
}

function revenueSegments(pos: number, eatclub: number, visible: Visible, previous: boolean): Segment[] {
  const segments: Segment[] = [];
  if (visible.pos) {
    segments.push({
      key: 'pos',
      label: previous ? 'Direct Revenue (Previous)' : 'POS Revenue',
      value: pos,
      color: previous ? COLORS.prevPos : COLORS.pos,
    });
  }
  if (visible.eatclub) {
    segments.push({
      key: 'eatclub',
      label: previous ? 'Total Revenue (Previous)' : 'Eatclub Revenue', // naming follows the design's legend
      value: eatclub,
      color: previous ? COLORS.prevEatclub : COLORS.eatclub,
    });
  }
  return segments;
}

/**
 * Bars drawn for one day, left to right:
 * current revenue stack, current labour, [previous revenue stack, previous labour].
 */
export function buildBars(day: TrendDay, visible: Visible, compare: boolean): BarSpec[] {
  const showRevenue = visible.pos || visible.eatclub;
  const bars: BarSpec[] = [];

  if (showRevenue) bars.push({ key: 'cur-rev', segments: revenueSegments(day.posRevenue, day.eatclubRevenue, visible, false) });
  if (visible.labour) {
    bars.push({ key: 'cur-lab', segments: [{ key: 'labour', label: 'Labour Costs', value: day.labourCost, color: COLORS.labour }] });
  }

  if (compare && day.previous) {
    const p = day.previous;
    if (showRevenue) bars.push({ key: 'prev-rev', segments: revenueSegments(p.posRevenue, p.eatclubRevenue, visible, true) });
    if (visible.labour) {
      bars.push({
        key: 'prev-lab',
        segments: [{ key: 'labour', label: 'Labour Costs (Previous)', value: p.labourCost, color: COLORS.prevLabour }],
      });
    }
  }
  return bars;
}

export const barTotal = (bar: BarSpec) => bar.segments.reduce((sum, seg) => sum + seg.value, 0);

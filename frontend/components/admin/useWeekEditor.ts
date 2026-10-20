'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi, ApiError, errorMessage, type DayInput } from '@/lib/admin-api';
import type { AdminWeek, EventImpact } from '@/lib/types';

/** Form state for one day: inputs are kept as strings so partially typed values ("12.") survive re-renders. */
export interface DayRow {
  dayIndex: number;
  label: string;
  posRevenue: string;
  eatclubRevenue: string;
  labourCost: string;
  covers: string;
  eventImpact: '' | 'positive' | 'negative';
  eventNote: string;
}

export const NUMERIC_FIELDS = ['posRevenue', 'eatclubRevenue', 'labourCost', 'covers'] as const;
export type NumericField = (typeof NUMERIC_FIELDS)[number];
export type RowErrors = Partial<Record<NumericField, string>>;

const toNumber = (v: string) => (v.trim() === '' ? 0 : Number(v));

const toRows = (week: AdminWeek): DayRow[] =>
  week.days.map((d) => ({
    dayIndex: d.dayIndex,
    label: d.label,
    posRevenue: String(d.posRevenue),
    eatclubRevenue: String(d.eatclubRevenue),
    labourCost: String(d.labourCost),
    covers: String(d.covers),
    eventImpact: d.eventImpact ?? '',
    eventNote: d.eventNote ?? '',
  }));

const toInput = (r: DayRow): DayInput => ({
  dayIndex: r.dayIndex,
  posRevenue: toNumber(r.posRevenue),
  eatclubRevenue: toNumber(r.eatclubRevenue),
  labourCost: toNumber(r.labourCost),
  covers: toNumber(r.covers),
  eventImpact: (r.eventImpact || null) as EventImpact,
  eventNote: r.eventImpact ? r.eventNote.trim() || null : null,
});

function validateRow(r: DayRow): RowErrors {
  const errors: RowErrors = {};
  for (const field of NUMERIC_FIELDS) {
    const n = toNumber(r[field]);
    if (!Number.isFinite(n)) errors[field] = 'Not a number';
    else if (n < 0) errors[field] = 'Must be 0 or more';
    else if (field === 'covers' && !Number.isInteger(n)) errors[field] = 'Must be a whole number';
  }
  return errors;
}

export type Notice = { kind: 'success' | 'error'; text: string; details?: string[] } | null;

export function useWeekEditor(weekId: number, initialNotice: Notice) {
  const [week, setWeek] = useState<AdminWeek | null>(null);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [savedRows, setSavedRows] = useState<DayRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(initialNotice);
  const [saving, setSaving] = useState(false);

  function applyWeek(w: AdminWeek) {
    const r = toRows(w);
    setWeek(w);
    setRows(r);
    setSavedRows(r);
  }

  useEffect(() => {
    adminApi
      .getWeek(weekId)
      .then(({ week: w }) => applyWeek(w))
      .catch((err) => setLoadError(errorMessage(err, 'Could not load week')));
  }, [weekId]);

  const changedRows = useMemo(
    () => rows.filter((r, i) => JSON.stringify(r) !== JSON.stringify(savedRows[i])),
    [rows, savedRows],
  );
  const dirty = changedRows.length > 0;
  const errors = useMemo(() => rows.map(validateRow), [rows]);
  const hasErrors = errors.some((e) => Object.keys(e).length > 0);

  const totals = useMemo(
    () =>
      rows.reduce(
        (t, r) => ({
          pos: t.pos + (toNumber(r.posRevenue) || 0),
          eatclub: t.eatclub + (toNumber(r.eatclubRevenue) || 0),
          labour: t.labour + (toNumber(r.labourCost) || 0),
          covers: t.covers + (toNumber(r.covers) || 0),
        }),
        { pos: 0, eatclub: 0, labour: 0, covers: 0 },
      ),
    [rows],
  );

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function updateRow(index: number, patch: Partial<DayRow>) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setNotice(null);
  }

  /** Sends only the days that changed (PATCH semantics). */
  async function save() {
    if (!dirty || hasErrors) return;
    setSaving(true);
    setNotice(null);
    try {
      const { week: w } = await adminApi.updateDays(weekId, changedRows.map(toInput));
      applyWeek(w);
      setNotice({ kind: 'success', text: 'Saved. The dashboard now shows these numbers.' });
    } catch (err) {
      const details = err instanceof ApiError ? err.details : undefined;
      setNotice({ kind: 'error', text: errorMessage(err, 'Could not save'), details });
    } finally {
      setSaving(false);
    }
  }

  /** Lets the caller navigate away after delete without the unsaved-changes prompt. */
  const discardChanges = () => setRows(savedRows);

  return { week, rows, errors, totals, dirty, hasErrors, saving, notice, loadError, updateRow, save, setNotice, discardChanges };
}

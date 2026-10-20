'use client';

import { formatCurrency, formatInteger } from '@/lib/format';
import { NUMERIC_FIELDS, type DayRow, type NumericField, type RowErrors } from './useWeekEditor';

const FIELD_LABELS: Record<NumericField, string> = {
  posRevenue: 'POS revenue',
  eatclubRevenue: 'Eatclub revenue',
  labourCost: 'Labour costs',
  covers: 'Covers',
};

interface WeekDaysTableProps {
  rows: DayRow[];
  errors: RowErrors[];
  totals: { pos: number; eatclub: number; labour: number; covers: number };
  onChange: (index: number, patch: Partial<DayRow>) => void;
}

export default function WeekDaysTable({ rows, errors, totals, onChange }: WeekDaysTableProps) {
  const revenue = totals.pos + totals.eatclub;
  return (
    <div className="a-panel a-table-scroll">
      <table className="a-table a-edit-table">
        <caption className="rt-sr-only">Daily figures, Monday to Sunday</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col" className="num">POS revenue ($)</th>
            <th scope="col" className="num">Eatclub revenue ($)</th>
            <th scope="col" className="num">Labour costs ($)</th>
            <th scope="col" className="num">Covers</th>
            <th scope="col">Event impact</th>
            <th scope="col">Event note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.dayIndex}>
              <th scope="row" className="day">
                {r.label}
              </th>
              {NUMERIC_FIELDS.map((field) => {
                const error = errors[i]?.[field];
                const errorId = `err-${r.dayIndex}-${field}`;
                return (
                  <td key={field} className="num">
                    <input
                      className={`a-input num${error ? ' has-error' : ''}`}
                      type="number"
                      inputMode={field === 'covers' ? 'numeric' : 'decimal'}
                      min={0}
                      step={field === 'covers' ? 1 : 0.01}
                      value={r[field]}
                      onChange={(e) => onChange(i, { [field]: e.target.value } as Partial<DayRow>)}
                      aria-label={`${r.label} ${FIELD_LABELS[field]}`}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                    />
                    {error && (
                      <span id={errorId} className="a-field-error">
                        {error}
                      </span>
                    )}
                  </td>
                );
              })}
              <td>
                <select
                  className={`a-input a-select impact-${r.eventImpact || 'none'}`}
                  value={r.eventImpact}
                  onChange={(e) => onChange(i, { eventImpact: e.target.value as DayRow['eventImpact'] })}
                  aria-label={`${r.label} event impact`}
                >
                  <option value="">None</option>
                  <option value="positive">▲ Positive</option>
                  <option value="negative">▼ Negative</option>
                </select>
              </td>
              <td>
                <input
                  className="a-input"
                  type="text"
                  maxLength={200}
                  placeholder={r.eventImpact ? 'e.g. Local festival' : '—'}
                  disabled={!r.eventImpact}
                  value={r.eventNote}
                  onChange={(e) => onChange(i, { eventNote: e.target.value })}
                  aria-label={`${r.label} event note`}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td className="num">{formatCurrency(totals.pos)}</td>
            <td className="num">{formatCurrency(totals.eatclub)}</td>
            <td className="num">{formatCurrency(totals.labour)}</td>
            <td className="num">{formatInteger(totals.covers)}</td>
            <td colSpan={2} className="muted">
              Revenue {formatCurrency(revenue)} · avg/day {formatCurrency(revenue / 7)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

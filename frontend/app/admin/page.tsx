'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, errorMessage } from '@/lib/admin-api';
import type { AdminWeekSummary } from '@/lib/types';
import { formatCurrency, formatInteger, formatWeekRange } from '@/lib/format';
import { TableSkeleton } from '@/components/admin/Skeletons';

/** Monday (YYYY-MM-DD) of the week containing the given YYYY-MM-DD date. */
function toMonday(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** This week if it doesn't exist yet, otherwise the week after the latest one. */
function suggestNextWeek(weeks: AdminWeekSummary[]): string {
  const thisWeek = toMonday(new Date().toISOString().slice(0, 10));
  if (!weeks.some((w) => w.weekStart === thisWeek)) return thisWeek;
  const d = new Date(`${weeks[0].weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function AdminWeeksPage() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<AdminWeekSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    adminApi
      .listWeeks()
      .then(({ weeks: list }) => {
        setWeeks(list);
        setNewDate(suggestNextWeek(list));
      })
      .catch((err) => setError(errorMessage(err, 'Could not load weeks')));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!newDate) return;
    setCreating(true);
    setError(null);
    try {
      const { week } = await adminApi.createWeek(toMonday(newDate));
      router.push(`/admin/weeks/${week.id}?created=1`);
    } catch (err) {
      setError(errorMessage(err, 'Could not create week'));
      setCreating(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Weekly revenue data</h1>
          <p className="muted">
            The dashboard shows the most recent week and compares it with the week before. Each week has 7 days of POS
            revenue, Eatclub revenue, labour costs, covers and optional event markers.
          </p>
        </div>
      </div>

      <form className="a-panel a-create" onSubmit={onCreate}>
        <div>
          <h2>Add a week</h2>
          <p className="muted small">Pick any date — the week will start on its Monday.</p>
        </div>
        <label className="a-field a-field-inline">
          <span>Week of</span>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
        </label>
        {newDate && <span className="muted small">{formatWeekRange(toMonday(newDate))}</span>}
        <button type="submit" className="a-btn a-btn-primary" disabled={creating || !newDate}>
          {creating ? 'Creating…' : 'Create & edit'}
        </button>
      </form>

      {error && (
        <div className="a-alert a-alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="a-panel a-table-scroll">
        {weeks === null ? (
          <TableSkeleton />
        ) : weeks.length === 0 ? (
          <div className="a-empty" role="status">
            <strong>No weeks yet</strong>
            <p className="muted">Add your first week above — the dashboard will show it straight away.</p>
          </div>
        ) : (
          <table className="a-table">
            <thead>
              <tr>
                <th scope="col">Week</th>
                <th scope="col" className="num">Total revenue</th>
                <th scope="col" className="num">Covers</th>
                <th scope="col">Last updated</th>
                <th scope="col">
                  <span className="rt-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={w.id}>
                  <td>
                    <Link href={`/admin/weeks/${w.id}`} className="a-link">
                      {formatWeekRange(w.weekStart)}
                    </Link>
                    {i === 0 && <span className="a-badge">Shown on dashboard</span>}
                  </td>
                  <td className="num">{formatCurrency(w.totalRevenue)}</td>
                  <td className="num">{formatInteger(w.totalCovers)}</td>
                  <td className="muted">{new Date(w.updatedAt).toLocaleString()}</td>
                  <td className="actions">
                    <Link href={`/admin/weeks/${w.id}`} className="a-btn a-btn-small">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

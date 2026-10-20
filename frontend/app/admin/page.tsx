'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, errorMessage } from '@/lib/admin-api';
import type { AdminWeekSummary, Paginated } from '@/lib/types';
import { TableSkeleton } from '@/components/admin/Skeletons';
import { formatCurrency, formatInteger, formatWeekRange } from '@/lib/format';

/** Monday (YYYY-MM-DD) of the week containing the given YYYY-MM-DD date. */
function toMonday(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function suggestNextWeek(weeks: AdminWeekSummary[]): string {
  const today = toMonday(new Date().toISOString().slice(0, 10));
  const taken = new Set(weeks.map((w) => w.weekStart));
  if (!taken.has(today)) return today;
  const latest = weeks[0]?.weekStart ?? today;
  const d = new Date(`${latest}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

const PAGE_SIZE = 10;

export default function AdminWeeksPage() {
  const router = useRouter();
  const [result, setResult] = useState<Paginated<AdminWeekSummary> | null>(null);
  const [page, setPage] = useState(1);
  const weeks = result?.data ?? null;
  const [error, setError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [creating, setCreating] = useState(false);

  async function load(targetPage = page) {
    try {
      const res = await adminApi.listWeeks(targetPage, PAGE_SIZE);
      // deleting the last item of a page: step back one page
      if (res.data.length === 0 && targetPage > 1) return load(targetPage - 1);
      setResult(res);
      setPage(targetPage);
      if (targetPage === 1) setNewDate((d) => d || suggestNextWeek(res.data));
    } catch (err) {
      setError(errorMessage(err, 'Could not load weeks'));
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function onDelete(week: AdminWeekSummary) {
    if (!window.confirm(`Delete the week of ${formatWeekRange(week.weekStart)}? This cannot be undone.`)) return;
    try {
      await adminApi.deleteWeek(week.id);
      await load(page);
    } catch (err) {
      setError(errorMessage(err, 'Could not delete week'));
    }
  }

  const monday = newDate ? toMonday(newDate) : '';

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
        {monday && <span className="muted small">{formatWeekRange(monday)}</span>}
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
                <th>Week</th>
                <th className="num">Total revenue</th>
                <th className="num">Covers</th>
                <th>Last updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={w.id}>
                  <td>
                    <Link href={`/admin/weeks/${w.id}`} className="a-link">
                      {formatWeekRange(w.weekStart)}
                    </Link>
                    {page === 1 && i === 0 && <span className="a-badge">Shown on dashboard</span>}
                  </td>
                  <td className="num">{formatCurrency(w.totalRevenue)}</td>
                  <td className="num">{formatInteger(w.totalCovers)}</td>
                  <td className="muted">{new Date(w.updatedAt).toLocaleString()}</td>
                  <td className="actions">
                    <Link href={`/admin/weeks/${w.id}`} className="a-btn a-btn-small">
                      Edit
                    </Link>
                    <Link href={`/?week=${w.weekStart}`} target="_blank" className="a-btn a-btn-small a-btn-ghost">
                      Preview
                    </Link>
                    <button type="button" className="a-btn a-btn-small a-btn-danger" onClick={() => onDelete(w)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {result && result.pagination.totalPages > 1 && (
          <nav className="a-pager" aria-label="Weeks pagination">
            <button type="button" className="a-btn a-btn-small" disabled={page <= 1} onClick={() => load(page - 1)}>
              ← Newer
            </button>
            <span className="muted small">
              Page {result.pagination.page} of {result.pagination.totalPages} · {result.pagination.totalItems} weeks
            </span>
            <button
              type="button"
              className="a-btn a-btn-small"
              disabled={page >= result.pagination.totalPages}
              onClick={() => load(page + 1)}
            >
              Older →
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

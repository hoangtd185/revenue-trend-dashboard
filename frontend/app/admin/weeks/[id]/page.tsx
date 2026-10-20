'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { formatWeekRange } from '@/lib/format';
import WeekDaysTable from '@/components/admin/WeekDaysTable';
import { useWeekEditor } from '@/components/admin/useWeekEditor';
import { EditorSkeleton } from '@/components/admin/Skeletons';

function EditWeek() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const editor = useWeekEditor(
    Number(id),
    search.get('created') ? { kind: 'success', text: 'Week created. Fill in the daily numbers and save.' } : null,
  );
  const { week, notice } = editor;

  if (editor.loadError) {
    return (
      <div className="admin-page">
        <div className="a-alert a-alert-error" role="alert">
          {editor.loadError}
        </div>
        <Link href="/admin" className="a-link">
          ← Back to weeks
        </Link>
      </div>
    );
  }
  if (!week) return <EditorSkeleton />;

  return (
    <div className="admin-page">
      <Link href="/admin" className="a-link small">
        ← All weeks
      </Link>
      <div className="admin-page-head">
        <div>
          <h1>Week of {formatWeekRange(week.weekStart)}</h1>
          <p className="muted small">Last updated {new Date(week.updatedAt).toLocaleString()}</p>
        </div>
        <div className="a-head-actions">
          <Link href="/" target="_blank" className="a-btn a-btn-ghost">
            View dashboard ↗
          </Link>
          <button
            type="button"
            className="a-btn a-btn-primary"
            onClick={editor.save}
            disabled={editor.saving || !editor.dirty || editor.hasErrors}
          >
            {editor.saving ? 'Saving…' : editor.dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {notice && (
        <div className={`a-alert ${notice.kind === 'success' ? 'a-alert-success' : 'a-alert-error'}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
          {notice.details && notice.details.length > 0 && (
            <ul>
              {notice.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <WeekDaysTable rows={editor.rows} errors={editor.errors} totals={editor.totals} onChange={editor.updateRow} />
    </div>
  );
}

export default function EditWeekPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditWeek />
    </Suspense>
  );
}

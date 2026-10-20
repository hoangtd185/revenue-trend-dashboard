'use client';

/** Error boundary for the dashboard: an unexpected render/runtime error shows this instead of a blank page. */
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page">
      <div className="empty-state" role="alert">
        <h2>Something went wrong</h2>
        <p>The dashboard could not be displayed.</p>
        <button type="button" className="rt-btn rt-btn-export" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

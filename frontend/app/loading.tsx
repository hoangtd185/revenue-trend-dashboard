/** Skeleton shown while the server fetches the trend data. */
export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-label="Loading revenue dashboard">
      <div className="page-top">
        <span className="skeleton skeleton-text" />
      </div>
      <div className="rt-card">
        <div className="skeleton" style={{ height: 28, width: 280 }} />
        <div className="rt-kpis">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 300, marginTop: 52 }} />
      </div>
    </main>
  );
}

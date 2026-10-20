/** Loading placeholders that keep the layout stable while admin data loads. */

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 36, marginBottom: 12 }} />
      ))}
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="admin-page" aria-busy="true" aria-label="Loading week">
      <div className="skeleton" style={{ height: 14, width: 80, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 28, width: 320, marginBottom: 28 }} />
      <div className="a-panel">
        <TableSkeleton rows={7} />
      </div>
    </div>
  );
}

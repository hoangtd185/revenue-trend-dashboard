import Link from 'next/link';
import RevenueTrendCard from '@/components/RevenueTrendCard';
import AutoRefresh from '@/components/AutoRefresh';
import { fetchTrend } from '@/lib/server-api';
import { formatWeekRange } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const result = await fetchTrend();

  return (
    <main className="page">
      <h1 className="rt-sr-only">Revenue dashboard</h1>
      <AutoRefresh />
      <div className="page-top">
        <span>{result.ok ? `Week of ${formatWeekRange(result.data.week.weekStart)}` : 'Revenue dashboard'}</span>
        <Link href="/admin">Admin →</Link>
      </div>

      {result.ok ? (
        // key forces a fresh mount (and grow-in animation) when a new week becomes the latest
        <RevenueTrendCard key={result.data.week.weekStart} data={result.data} />
      ) : (
        <div className="empty-state" role="status">
          <h2>{result.status === 404 ? 'No data yet' : 'Something went wrong'}</h2>
          <p>{result.message}</p>
          {result.status === 404 && (
            <p>
              Sign in to the <Link href="/admin">admin panel</Link> to add a week of revenue data.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

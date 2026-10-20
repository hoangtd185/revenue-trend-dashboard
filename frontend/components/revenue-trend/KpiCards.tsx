import type { TrendResponse } from '@/lib/types';
import { formatCurrency, formatInteger, formatPercent } from '@/lib/format';

interface KpiProps {
  label: string;
  value: string;
  previous?: string;
  change?: number | null;
  showCompare: boolean;
}

function KpiCard({ label, value, previous, change, showCompare }: KpiProps) {
  return (
    <div className="rt-kpi">
      <div className="rt-kpi-label">{label}</div>
      <div className="rt-kpi-row">
        <span className="rt-kpi-value">{value}</span>
        {showCompare && previous !== undefined && (
          <span className="rt-kpi-compare">
            vs {previous}
            {change !== null && change !== undefined && (
              <span className={change >= 0 ? 'rt-up' : 'rt-down'}> ({formatPercent(change)})</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KpiCards({ summary, compare }: { summary: TrendResponse['summary']; compare: boolean }) {
  const { current, previous, change } = summary;
  return (
    <div className="rt-kpis">
      <KpiCard
        label="Total Revenue"
        value={formatCurrency(current.totalRevenue)}
        previous={previous ? formatCurrency(previous.totalRevenue) : undefined}
        change={change?.totalRevenue}
        showCompare={compare}
      />
      <KpiCard
        label="Average per Day"
        value={formatCurrency(current.averagePerDay)}
        previous={previous ? formatCurrency(previous.averagePerDay) : undefined}
        change={change?.averagePerDay}
        showCompare={compare}
      />
      <KpiCard
        label="Total Covers"
        value={formatInteger(current.totalCovers)}
        previous={previous ? formatInteger(previous.totalCovers) : undefined}
        change={change?.totalCovers}
        showCompare={compare}
      />
    </div>
  );
}

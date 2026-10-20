import { BarChartIcon, CheckIcon, DownloadIcon } from '../icons';
import { SERIES, type SeriesKey, type Visible } from './series';

interface TrendHeaderProps {
  compare: boolean;
  canCompare: boolean;
  visible: Visible;
  exporting: boolean;
  onToggleSeries: (key: SeriesKey) => void;
  onToggleCompare: () => void;
  onExport: () => void;
}

function SeriesCheckbox({ checked, color, label, onChange }: { checked: boolean; color: string; label: string; onChange: () => void }) {
  return (
    <label className="rt-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className={`rt-check-box${checked ? ' is-checked' : ''}`} aria-hidden="true">
        {checked && <CheckIcon size={12} />}
      </span>
      <span className="rt-check-line" style={{ background: color }} aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export default function TrendHeader({
  compare,
  canCompare,
  visible,
  exporting,
  onToggleSeries,
  onToggleCompare,
  onExport,
}: TrendHeaderProps) {
  return (
    <header className="rt-header">
      <h2 className="rt-title">This Week&apos;s Revenue Trend{compare ? ' vs Previous Period' : ''}</h2>
      <div className="rt-controls">
        <fieldset className="rt-series">
          <legend className="rt-sr-only">Series shown on the chart</legend>
          {SERIES.map((s) => (
            <SeriesCheckbox key={s.key} checked={visible[s.key]} color={s.color} label={s.label} onChange={() => onToggleSeries(s.key)} />
          ))}
        </fieldset>
        <button
          type="button"
          className={`rt-btn rt-btn-compare${compare ? ' is-active' : ''}`}
          onClick={onToggleCompare}
          disabled={!canCompare}
          aria-pressed={compare}
          title={canCompare ? 'Toggle comparison with the previous week' : 'No data for the previous week yet'}
        >
          <BarChartIcon size={15} />
          Compare to Previous
        </button>
        <button type="button" className="rt-btn rt-btn-export" onClick={onExport} disabled={exporting} data-export-ignore="true">
          <DownloadIcon size={15} />
          {exporting ? 'Exporting…' : 'Export PNG'}
        </button>
      </div>
    </header>
  );
}

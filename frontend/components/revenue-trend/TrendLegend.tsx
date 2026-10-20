import { TrendDownIcon, TrendUpIcon } from '../icons';
import { COLORS, SERIES, type Visible } from './series';

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="rt-legend-item">
      <span className="rt-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function TrendLegend({ visible, compare }: { visible: Visible; compare: boolean }) {
  return (
    <div className="rt-legend">
      {compare ? (
        <>
          {visible.pos && <LegendDot color={COLORS.pos} label="POS Revenue (Current)" />}
          {visible.eatclub && <LegendDot color={COLORS.eatclub} label="Eatclub Revenue (Current)" />}
          {visible.labour && <LegendDot color={COLORS.labour} label="Labour Costs (Current)" />}
          {visible.pos && <LegendDot color={COLORS.prevPos} label="Direct Revenue (Previous)" />}
          {visible.eatclub && <LegendDot color={COLORS.prevEatclub} label="Total Revenue (Previous)" />}
          {visible.labour && <LegendDot color={COLORS.prevLabour} label="Labour Costs (Previous)" />}
        </>
      ) : (
        SERIES.filter((s) => visible[s.key]).map((s) => <LegendDot key={s.key} color={s.color} label={s.label} />)
      )}
      <span className="rt-legend-group">
        <span className="rt-legend-sep" aria-hidden="true" />
        <span className="rt-legend-item rt-up-icon">
          <TrendUpIcon size={13} /> Positive Event Impact
        </span>
        <span className="rt-legend-item rt-down-icon">
          <TrendDownIcon size={13} /> Negative Event Impact
        </span>
      </span>
    </div>
  );
}

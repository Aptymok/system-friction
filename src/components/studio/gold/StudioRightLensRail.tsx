import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';

function point(cx: number, cy: number, radius: number, angle: number, value: number) {
  const safe = Math.max(0, Math.min(1, value));
  return [
    cx + Math.cos(angle - Math.PI / 2) * radius * safe,
    cy + Math.sin(angle - Math.PI / 2) * radius * safe,
  ];
}

function RadarLens({ values }: { values: number[] }) {
  const cx = 72;
  const cy = 72;
  const radius = 52;
  const angles = values.map((_, index) => (index / values.length) * Math.PI * 2);
  const polygon = values.map((value, index) => point(cx, cy, radius, angles[index], value).join(',')).join(' ');

  return (
    <svg viewBox="0 0 144 144" className="sfi-studio-gold__radar" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon key={ring} points={angles.map((angle) => point(cx, cy, radius, angle, ring).join(',')).join(' ')} />
      ))}
      {angles.map((angle) => {
        const end = point(cx, cy, radius, angle, 1);
        return <line key={angle} x1={cx} y1={cy} x2={end[0]} y2={end[1]} />;
      })}
      <polygon className="is-live" points={polygon} />
      <circle cx={cx} cy={cy} r="4" />
    </svg>
  );
}

function DiamondStack({ values }: { values: number[] }) {
  return (
    <svg viewBox="0 0 160 150" className="sfi-studio-gold__diamond" aria-hidden="true">
      {values.map((value, index) => {
        const y = 22 + index * 24;
        const width = 54 + value * 34;
        const opacity = 0.22 + value * 0.55;
        return (
          <g key={index} opacity={opacity}>
            <polygon points={`80,${y} ${80 + width / 2},${y + 15} 80,${y + 30} ${80 - width / 2},${y + 15}`} />
            <circle cx="80" cy={y + 15} r={2 + value * 4} />
          </g>
        );
      })}
      <line x1="80" y1="16" x2="80" y2="140" />
    </svg>
  );
}

function value(value: number) {
  return value.toFixed(2);
}

export function StudioRightLensRail({ state }: { state: StudioGoldState }) {
  const wsv = [
    ['ECONOMICO', state.wsvLens.economic],
    ['POLITICO', state.wsvLens.political],
    ['TECNOLOGICO', state.wsvLens.technological],
    ['CULTURAL', state.wsvLens.cultural],
    ['ECOLOGICO', state.wsvLens.ecological],
  ] as const;

  const mihm = [
    ['NIVEL INDIVIDUAL', state.mihmModel.individual],
    ['NIVEL GRUPAL', state.mihmModel.group],
    ['NIVEL INSTITUCIONAL', state.mihmModel.institutional],
    ['NIVEL SISTEMICO', state.mihmModel.systemic],
    ['NIVEL CIVILIZACIONAL', state.mihmModel.civilizational],
  ] as const;

  return (
    <aside className="sfi-studio-gold__right-rail">
      <section className="sfi-studio-gold__panel sfi-studio-gold__lens-panel">
        <h2><span>WSV</span> / LENTE</h2>
        <p>WORLD SYSTEMS VECTOR</p>
        <div className="sfi-studio-gold__lens-body">
          <RadarLens values={wsv.map(([, item]) => item)} />
          <div className="sfi-studio-gold__lens-values">
            {wsv.map(([label, item]) => (
              <div key={label}><span>{label}</span><strong>{value(item)}</strong></div>
            ))}
          </div>
        </div>
      </section>

      <section className="sfi-studio-gold__panel sfi-studio-gold__lens-panel">
        <h2><span>MIHM</span> / MODELO</h2>
        <p>MARCO INTEGRADO HOLONICO MULTINIVEL</p>
        <div className="sfi-studio-gold__lens-body">
          <DiamondStack values={mihm.map(([, item]) => item)} />
          <div className="sfi-studio-gold__lens-values">
            {mihm.map(([label, item]) => (
              <div key={label}><span>{label}</span><strong>{value(item)}</strong></div>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}

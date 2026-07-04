import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';

function EngineGlyph({ value }: { value: number }) {
  const r = 26;
  const cx = 34;
  const cy = 34;
  const points = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
    const radius = r * (0.42 + value * 0.48 + (index % 2) * 0.08);
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 68 68" className="sfi-studio-gold__engine-icon" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.62} />
      <polygon points={points} />
      <circle cx={cx} cy={cy} r={3 + value * 5} />
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return <line key={index} x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r} />;
      })}
    </svg>
  );
}

export function StudioEnginesBar({ state }: { state: StudioGoldState }) {
  return (
    <section className="sfi-studio-gold__engines sfi-studio-gold__panel">
      <h2>MOTORES DEL STUDIO</h2>
      <div className="sfi-studio-gold__engine-grid">
        {state.engines.map((engine) => (
          <div key={engine.id} className={`sfi-studio-gold__engine is-${engine.state}`}>
            <EngineGlyph value={engine.value} />
            <div>
              <h3>{engine.label}</h3>
              <p>{engine.description}</p>
              <strong>{engine.value.toFixed(2)}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

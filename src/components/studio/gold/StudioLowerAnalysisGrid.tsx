import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';

function axisPoint(cx: number, cy: number, radius: number, index: number, total: number, value: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const safe = Math.max(0, Math.min(1, value));
  return `${cx + Math.cos(angle) * radius * safe},${cy + Math.sin(angle) * radius * safe}`;
}

function MatrixRadar({ matrix }: { matrix: StudioGoldState['observablesMatrix'] }) {
  const values = [
    matrix.symbolic,
    matrix.cognitive,
    matrix.affective,
    matrix.conductual,
    matrix.institutional,
    matrix.technological,
  ];
  const labels = ['SIMBOLICO', 'COGNITIVO', 'AFECTIVO', 'CONDUCTUAL', 'INSTITUCIONAL', 'TECNOLOGICO'];
  const cx = 120;
  const cy = 92;
  const radius = 68;

  return (
    <svg viewBox="0 0 240 188" className="sfi-studio-gold__matrix-radar" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon key={ring} points={values.map((_, index) => axisPoint(cx, cy, radius, index, values.length, ring)).join(' ')} />
      ))}
      {values.map((_, index) => (
        <line key={index} x1={cx} y1={cy} x2={axisPoint(cx, cy, radius, index, values.length, 1).split(',')[0]} y2={axisPoint(cx, cy, radius, index, values.length, 1).split(',')[1]} />
      ))}
      <polygon className="is-live" points={values.map((item, index) => axisPoint(cx, cy, radius, index, values.length, item)).join(' ')} />
      <circle cx={cx} cy={cy} r="7" />
      {labels.map((label, index) => {
        const [x, y] = axisPoint(cx, cy, radius + 20, index, labels.length, 1).split(',').map(Number);
        return <text key={label} x={x} y={y}>{label}</text>;
      })}
    </svg>
  );
}

function RadialField({ field }: { field: StudioGoldState['pmv']['field'] }) {
  return (
    <svg viewBox="0 0 230 132" className="sfi-studio-gold__pmv-field" aria-hidden="true">
      {[18, 34, 50].map((ring) => <circle key={ring} cx="150" cy="66" r={ring} />)}
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return <line key={index} x1="150" y1="66" x2={150 + Math.cos(angle) * 58} y2={66 + Math.sin(angle) * 58} />;
      })}
      <polyline points="0,86 30,78 58,84 86,64 112,72 138,60 168,64 198,48 228,54" />
      {field.map((item, index) => (
        <circle
          key={index}
          cx={150 + Math.cos(item.angle) * item.radius * 58}
          cy={66 + Math.sin(item.angle) * item.radius * 58}
          r={2 + item.intensity * 4}
        />
      ))}
    </svg>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 96;
    const y = 24 - Math.max(0, Math.min(1, value)) * 20;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 96 28" className="sfi-studio-gold__spark" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function dec(value: number) {
  return value.toFixed(2);
}

export function StudioLowerAnalysisGrid({ state }: { state: StudioGoldState }) {
  return (
    <section className="sfi-studio-gold__lower-grid">
      <article className="sfi-studio-gold__panel">
        <h2>OBSERVABLES</h2>
        <p>MATRIZ MULTIDIMENSIONAL</p>
        <MatrixRadar matrix={state.observablesMatrix} />
        <div className="sfi-studio-gold__panel-foot">
          <span>TOTAL OBSERVABLES <strong>{state.observablesMatrix.totalObservables}</strong></span>
          <span>ACTIVOS <strong>{pct(state.observablesMatrix.activePercentage)}</strong></span>
        </div>
      </article>

      <article className="sfi-studio-gold__panel">
        <h2>PERTURBACION MINIMA VIABLE</h2>
        <p>DISENO E HIPOTESIS</p>
        <div className="sfi-studio-gold__pmv-meta">
          <span>PMV {state.pmv.state.toUpperCase()}</span>
          <strong>{state.pmv.id}</strong>
          <em>INTENSIDAD {state.pmv.intensity.toUpperCase()}</em>
        </div>
        <RadialField field={state.pmv.field} />
        <div className="sfi-studio-gold__hypothesis compact">
          <span>HIPOTESIS</span>
          <p>{state.pmv.hypothesis}</p>
        </div>
        <div className="sfi-studio-gold__mini-metrics">
          <span>ALCANCE <strong>{dec(state.pmv.reach)}</strong></span>
          <span>COBERTURA <strong>{pct(state.pmv.coverage)}</strong></span>
          <span>IMPACTO ESP. <strong>{dec(state.pmv.expectedImpact)}</strong></span>
          <span>ESTADO <strong>{state.pmv.state.toUpperCase()}</strong></span>
        </div>
      </article>

      <article className="sfi-studio-gold__panel">
        <div className="sfi-studio-gold__panel-title">
          <div>
            <h2>SEGUIMIENTO LONGITUDINAL</h2>
            <p>TRAYECTORIAS DE SENALES</p>
          </div>
          <button type="button">90 DIAS</button>
        </div>
        <div className="sfi-studio-gold__trajectory-list">
          {state.longitudinalTracking.length ? state.longitudinalTracking.map((item) => (
            <div key={item.id}>
              <span><strong>{item.id}</strong>{item.label}</span>
              <Sparkline values={item.series} />
              <em>{dec(item.value)}</em>
            </div>
          )) : <p className="sfi-studio-gold__empty">Sin trayectoria longitudinal conectada.</p>}
        </div>
        <button className="sfi-studio-gold__action" type="button">VER TODAS LAS TRAYECTORIAS →</button>
      </article>

      <article className="sfi-studio-gold__panel sfi-studio-gold__synthesis">
        <h2>SINTESIS</h2>
        <p>NOTAS Y CONCLUSIONES</p>
        <div><span>NOTA DE INVESTIGACION</span><p>{state.synthesis.researchNote}</p></div>
        <div><span>IMPLICACION</span><p>{state.synthesis.implication}</p></div>
        <div><span>PROXIMA ACCION</span><p>{state.synthesis.nextAction}</p></div>
        <footer><span>CONFIANZA DE SINTESIS</span><strong>{dec(state.synthesis.confidence)}</strong></footer>
      </article>
    </section>
  );
}

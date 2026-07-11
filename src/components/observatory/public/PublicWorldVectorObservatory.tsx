import type { ObservatoryGoldState, ObservatoryGoldTrend } from '@/lib/observatory/gold/observatoryGoldState';
import './public-world-vector-observatory.css';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function pct(value: number | null, digits = 0) {
  return value === null ? 'NO DISPONIBLE' : `${(clamp01(value) * 100).toFixed(digits)}%`;
}

function dec(value: number | null, digits = 3) {
  return value === null ? 'n/d' : value.toFixed(digits);
}

function signed(value: number | null, digits = 3) {
  if (value === null) return 'SIN COMPARABLE';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}`;
}

function dateTime(value: string | null) {
  if (!value) return 'SIN OBSERVACIÓN';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC';
}

function dateOnly(value: string | null) {
  if (!value) return 'SIN FECHA';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function trendLabel(trend: ObservatoryGoldTrend | 'unavailable') {
  if (trend === 'up') return 'ASCENDENTE';
  if (trend === 'down') return 'DESCENDENTE';
  if (trend === 'stable') return 'ESTABLE';
  return 'SIN SERIE COMPARABLE';
}

function trendClass(trend: ObservatoryGoldTrend | 'unavailable') {
  return `is-${trend}`;
}

function linePoints(
  points: ObservatoryGoldState['longitudinal']['points'],
  key: 'wsi' | 'nti' | 'confidence',
  width = 1000,
  height = 300,
  padding = 28,
) {
  const observed = points
    .map((point, index) => ({ index, value: point[key] }))
    .filter((item): item is { index: number; value: number } => item.value !== null);
  if (!observed.length) return '';
  const denominator = Math.max(1, points.length - 1);
  return observed.map((item) => {
    const x = padding + (item.index / denominator) * (width - padding * 2);
    const y = padding + (1 - clamp01(item.value)) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function MetricBlock({ label, value, meta, tone = 'neutral' }: { label: string; value: string; meta: string; tone?: 'neutral' | 'copper' | 'magenta' | 'cyan' | 'warn' }) {
  return (
    <div className={`sfi-public-observatory__metric is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
  );
}

function LongitudinalChart({ state }: { state: ObservatoryGoldState }) {
  const points = state.longitudinal.points;
  const width = 1000;
  const height = 300;
  const wsi = linePoints(points, 'wsi', width, height);
  const nti = linePoints(points, 'nti', width, height);
  const confidence = linePoints(points, 'confidence', width, height);

  return (
    <section id="longitud" className="sfi-public-observatory__panel sfi-public-observatory__longitudinal">
      <header className="sfi-public-observatory__panel-head">
        <div>
          <span>OBSERVACIÓN LONGITUDINAL</span>
          <h2>{state.longitudinal.horizonDays} DÍAS · {state.longitudinal.sampleCount} OBSERVACIONES</h2>
        </div>
        <div className="sfi-public-observatory__legend" aria-label="Leyenda de series">
          <span className="is-wsi">WSV</span>
          <span className="is-nti">NTI</span>
          <span className="is-confidence">CONFIANZA</span>
        </div>
      </header>

      {points.length ? (
        <div className="sfi-public-observatory__chart-wrap">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Serie longitudinal de WSV, NTI y confianza">
            {[0, 0.25, 0.5, 0.75, 1].map((level) => {
              const y = 28 + (1 - level) * (height - 56);
              return (
                <g key={level}>
                  <line x1="28" x2={width - 28} y1={y} y2={y} className="sfi-public-observatory__gridline" />
                  <text x="4" y={y + 4} className="sfi-public-observatory__axis-label">{level.toFixed(2)}</text>
                </g>
              );
            })}
            {wsi ? <polyline points={wsi} className="sfi-public-observatory__line is-wsi" /> : null}
            {nti ? <polyline points={nti} className="sfi-public-observatory__line is-nti" /> : null}
            {confidence ? <polyline points={confidence} className="sfi-public-observatory__line is-confidence" /> : null}
            {points.map((point, index) => {
              const x = 28 + (index / Math.max(1, points.length - 1)) * (width - 56);
              return point.wsi === null ? null : (
                <circle key={`${point.observedAt}-${index}`} cx={x} cy={28 + (1 - point.wsi) * (height - 56)} r="2.4" className="sfi-public-observatory__point" />
              );
            })}
          </svg>
          <div className="sfi-public-observatory__chart-dates">
            <span>{dateOnly(state.longitudinal.firstObservedAt)}</span>
            <span>{dateOnly(state.longitudinal.lastObservedAt)}</span>
          </div>
        </div>
      ) : (
        <div className="sfi-public-observatory__empty">NO EXISTEN SNAPSHOTS LONGITUDINALES PERSISTIDOS EN EL HORIZONTE ACTUAL.</div>
      )}

      <div className="sfi-public-observatory__delta-strip">
        <MetricBlock label="CAMBIO WSV" value={signed(state.longitudinal.deltas.wsi)} meta="primera observación → última" tone="copper" />
        <MetricBlock label="CAMBIO NTI" value={signed(state.longitudinal.deltas.nti)} meta="primera observación → última" tone="magenta" />
        <MetricBlock label="CAMBIO CONFIANZA" value={signed(state.longitudinal.deltas.confidence)} meta="sin interpolar días ausentes" tone="cyan" />
      </div>
    </section>
  );
}

function VectorField({ state }: { state: ObservatoryGoldState }) {
  return (
    <section id="world-vector" className="sfi-public-observatory__panel sfi-public-observatory__vectors">
      <header className="sfi-public-observatory__panel-head">
        <div>
          <span>FULL WORLD VECTOR</span>
          <h2>DIEZ DOMINIOS CANÓNICOS</h2>
        </div>
        <strong>{state.vectors.filter((vector) => vector.active).length}/{state.vectors.length} ACTIVOS</strong>
      </header>

      <div className="sfi-public-observatory__vector-list">
        {state.vectors.map((vector, index) => (
          <article key={vector.id} className={`sfi-public-observatory__vector ${vector.active ? 'is-active' : 'is-missing'}`}>
            <div className="sfi-public-observatory__vector-index">{String(index + 1).padStart(2, '0')}</div>
            <div className="sfi-public-observatory__vector-name">
              <span>{vector.domainKeys.join(' · ')}</span>
              <strong>{vector.label}</strong>
              <small>{vector.sourceCount} fuentes · {vector.sourceState.toUpperCase()}</small>
            </div>
            <div className="sfi-public-observatory__vector-bar" aria-label={`${vector.label} ${pct(vector.value, 1)}`}>
              <i style={{ width: `${clamp01(vector.value) * 100}%` }} />
              <b style={{ left: `${clamp01(vector.trust ?? 0) * 100}%` }} />
            </div>
            <div className="sfi-public-observatory__vector-value">
              <strong>{vector.active ? vector.value.toFixed(3) : 'n/d'}</strong>
              <span className={trendClass(vector.trend)}>{trendLabel(vector.trend)}</span>
              <small>{signed(vector.delta)} / {state.longitudinal.horizonDays}d</small>
            </div>
            <div className="sfi-public-observatory__vector-submetrics">
              <span>PERSISTENCIA <strong>{dec(vector.persistence)}</strong></span>
              <span>VOLATILIDAD <strong>{dec(vector.volatility)}</strong></span>
              <span>TRUST <strong>{dec(vector.trust)}</strong></span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DailyReading({ state }: { state: ObservatoryGoldState }) {
  const reading = state.dailyReading;
  return (
    <article id="lectura-del-dia" className="sfi-public-observatory__daily">
      <header>
        <div>
          <span>LECTURA DEL DÍA</span>
          <small>{reading.institution}</small>
        </div>
        <time dateTime={reading.date}>{dateTime(reading.date)}</time>
      </header>
      <div className="sfi-public-observatory__daily-body">
        <div className="sfi-public-observatory__daily-kicker">{reading.byline}</div>
        <h1>{reading.title}</h1>
        <p>{reading.summary}</p>
      </div>
      <div className="sfi-public-observatory__daily-metrics">
        <MetricBlock label="TENSIÓN" value={reading.tensionIndex.toFixed(3)} meta={`estabilidad ${reading.stability}`} tone="magenta" />
        <MetricBlock label="CONFIANZA" value={pct(reading.confidence, 1)} meta={reading.sourceState.toUpperCase()} tone="cyan" />
        <MetricBlock label="EVIDENCIA" value={String(reading.evidenceCount)} meta="fuentes + observaciones" tone="copper" />
      </div>
      <div className="sfi-public-observatory__daily-evidence">
        <section>
          <h3>BASE OBSERVABLE</h3>
          {reading.evidence.map((item) => <p key={item}>{item}</p>)}
        </section>
        <section>
          <h3>LÍMITES DE LA LECTURA</h3>
          {reading.limits.map((item) => <p key={item}>{item}</p>)}
        </section>
      </div>
      {reading.fullReadingUrl ? <a href={reading.fullReadingUrl}>ABRIR INSTRUMENTO WORLDSPECT</a> : null}
    </article>
  );
}

function TensionRegister({ state }: { state: ObservatoryGoldState }) {
  return (
    <section className="sfi-public-observatory__panel sfi-public-observatory__register">
      <header className="sfi-public-observatory__panel-head">
        <div><span>TENSIONES DOMINANTES</span><h2>REGISTRO ACTUAL</h2></div>
        <strong>{state.worldTensions.length}</strong>
      </header>
      <div className="sfi-public-observatory__rank-list">
        {state.worldTensions.length ? state.worldTensions.map((tension) => (
          <div key={`${tension.rank}-${tension.domain}`}>
            <b>{String(tension.rank).padStart(2, '0')}</b>
            <span>{tension.label}<small>{tension.domain}</small></span>
            <i><em style={{ width: `${clamp01(tension.value) * 100}%` }} /></i>
            <strong>{tension.value.toFixed(3)}</strong>
          </div>
        )) : <p className="sfi-public-observatory__empty">SIN TENSIONES CALCULABLES.</p>}
      </div>
    </section>
  );
}

function SignalRegister({ state }: { state: ObservatoryGoldState }) {
  return (
    <section className="sfi-public-observatory__panel sfi-public-observatory__register">
      <header className="sfi-public-observatory__panel-head">
        <div><span>SEÑALES DESTACADAS</span><h2>FUENTES ACTIVAS</h2></div>
        <strong>{state.highlightedSignals.length}</strong>
      </header>
      <div className="sfi-public-observatory__signal-list">
        {state.highlightedSignals.length ? state.highlightedSignals.map((signal, index) => (
          <div key={`${signal.label}-${index}`}>
            <time>{signal.time}</time>
            <span>{signal.label}</span>
            <strong>{signal.domain.toUpperCase()}</strong>
            <i style={{ width: `${clamp01(signal.intensity) * 100}%` }} />
          </div>
        )) : <p className="sfi-public-observatory__empty">SIN SEÑALES CON FUENTE UTILIZABLE.</p>}
      </div>
    </section>
  );
}

export function PublicWorldVectorObservatory({ state }: { state: ObservatoryGoldState }) {
  return (
    <main className="sfi-public-observatory">
      <header className="sfi-public-observatory__header">
        <a href="/" className="sfi-public-observatory__brand">
          <span>SFI</span>
          <strong>SYSTEM FRICTION INSTITUTE</strong>
        </a>
        <div className="sfi-public-observatory__title">
          <span>PUBLIC OBSERVATORY</span>
          <strong>WORLD VECTOR</strong>
        </div>
        <nav aria-label="Secciones del observatorio">
          <a href="#world-vector">VECTOR</a>
          <a href="#longitud">LONGITUD</a>
          <a href="#lectura-del-dia">LECTURA DEL DÍA</a>
          <a href="#metodo">MÉTODO</a>
        </nav>
        <div className="sfi-public-observatory__system">
          <span>{state.publicContract.scope}</span>
          <strong className={`is-${state.systemState}`}>{state.systemState.toUpperCase()}</strong>
          <small>{dateTime(state.publicContract.observedAt)}</small>
        </div>
      </header>

      <section className="sfi-public-observatory__hero">
        <div className="sfi-public-observatory__hero-copy">
          <span>WORLD SPECTRUM VECTOR · {state.wsv.regime}</span>
          <h1>{state.wsv.globalIndex.toFixed(3)}</h1>
          <p>{state.explanation.body}</p>
          <div className="sfi-public-observatory__hero-meta">
            <span>HORIZONTE <strong>{state.publicContract.horizonDays} DÍAS</strong></span>
            <span>OBSERVACIONES <strong>{state.longitudinal.sampleCount}</strong></span>
            <span>FUENTE <strong>{state.publicContract.sourceState.toUpperCase()}</strong></span>
          </div>
        </div>
        <div className="sfi-public-observatory__hero-grid">
          <MetricBlock label="COHERENCIA" value={state.wsv.coherence.toFixed(3)} meta="consistencia del campo" tone="copper" />
          <MetricBlock label="RESILIENCIA" value={state.wsv.resilience.toFixed(3)} meta="capacidad observable" tone="cyan" />
          <MetricBlock label="ALINEACIÓN" value={state.wsv.alignment.toFixed(3)} meta="convergencia vectorial" tone="neutral" />
          <MetricBlock label="TENSIÓN" value={state.wsv.tension.toFixed(3)} meta={state.dailyReading.stability.toUpperCase()} tone="magenta" />
        </div>
      </section>

      <div className="sfi-public-observatory__layout">
        <div className="sfi-public-observatory__primary">
          <VectorField state={state} />
          <LongitudinalChart state={state} />
          <DailyReading state={state} />
        </div>
        <aside className="sfi-public-observatory__secondary">
          <TensionRegister state={state} />
          <SignalRegister state={state} />
          <section id="metodo" className="sfi-public-observatory__panel sfi-public-observatory__method">
            <header className="sfi-public-observatory__panel-head">
              <div><span>PROVENANCE</span><h2>MÉTODO Y LÍMITES</h2></div>
            </header>
            <h3>BASADO EN</h3>
            {state.provenance.basedOn.map((item) => <p key={item}>{item}</p>)}
            <h3>FUENTES DEGRADADAS</h3>
            {state.provenance.degradedSources.length
              ? state.provenance.degradedSources.map((item) => <p key={item}>{item}</p>)
              : <p>NINGUNA DECLARADA</p>}
            <h3>LÍMITES</h3>
            {state.provenance.limits.map((item) => <p key={item}>{item}</p>)}
            <a href="/world-vector">CONSULTAR WORLDSPECT</a>
          </section>
        </aside>
      </div>

      <footer className="sfi-public-observatory__footer">
        <span>SYSTEM FRICTION INSTITUTE · PUBLIC OBSERVATORY</span>
        <strong>OBSERVE · UNDERSTAND · TRACE</strong>
        <time>{dateTime(state.generatedAt)}</time>
      </footer>
    </main>
  );
}

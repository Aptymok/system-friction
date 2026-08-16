import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';
import { PublicObservatoryDerivedLayers } from './PublicObservatoryDerivedLayers';
import { PublicObservatoryTimelineNavigator } from './PublicObservatoryTimelineNavigator';
import './public-observatory-unified.css';

function dec(value: number | null, digits = 3) {
  return value === null ? 'n/d' : value.toFixed(digits);
}

function dateTime(value: string | null) {
  if (!value) return 'SIN OBSERVACIÓN';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
}

export function PublicObservatoryUnified({ state }: { state: ObservatoryGoldState }) {
  const active = state.vectors.filter((vector) => vector.active);
  return (
    <main className="pou-root">
      <header className="pou-header" data-sfi-field-anchor="observatory-header">
        <a href="/" className="pou-brand"><span>SFI</span><strong>SYSTEM FRICTION INSTITUTE</strong></a>
        <nav aria-label="Capas del Observatorio">
          <a href="#state">ESTADO</a>
          <a href="#trajectories">TRAYECTORIAS</a>
          <a href="#phenomena">FENÓMENOS</a>
          <a href="#time-movement">TIEMPO</a>
          <a href="#reading">LECTURA</a>
          <a href="#method">MÉTODO</a>
        </nav>
        <div className="pou-health"><span>PUBLIC</span><strong data-state={state.systemState}>{state.systemState.toUpperCase()}</strong><small>{dateTime(state.publicContract.observedAt)}</small></div>
      </header>

      <section id="state" className="pou-hero" data-sfi-field-anchor="world-state">
        <div>
          <span>PUBLIC OBSERVATORY · WORLD STATE</span>
          <h1>{state.wsv.globalIndex.toFixed(3)}</h1>
          <h2>{state.wsv.regime}</h2>
          <p>{state.explanation.body}</p>
        </div>
        <dl>
          <div><dt>COHERENCIA</dt><dd>{state.wsv.coherence.toFixed(3)}</dd></div>
          <div><dt>RESILIENCIA</dt><dd>{state.wsv.resilience.toFixed(3)}</dd></div>
          <div><dt>ALINEACIÓN</dt><dd>{state.wsv.alignment.toFixed(3)}</dd></div>
          <div><dt>TENSIÓN</dt><dd>{state.wsv.tension.toFixed(3)}</dd></div>
          <div><dt>OBSERVACIONES</dt><dd>{state.longitudinal.sampleCount}</dd></div>
          <div><dt>HORIZONTE</dt><dd>{state.longitudinal.horizonDays}d</dd></div>
        </dl>
      </section>

      <section className="pou-vector" data-sfi-field-anchor="world-vector">
        <header><div><span>CAPA I · ESTADO</span><h2>Vector mundial observado.</h2></div><strong>{active.length}/{state.vectors.length} DOMINIOS ACTIVOS</strong></header>
        <div className="pou-vector-grid">
          {state.vectors.map((vector, index) => (
            <article key={vector.id} data-active={vector.active} data-sfi-field-anchor={vector.active ? `vector-${vector.id}` : undefined}>
              <span>{String(index + 1).padStart(2, '0')} · {vector.domainKeys.join(' · ')}</span>
              <h3>{vector.label}</h3>
              <strong>{vector.active ? vector.value.toFixed(3) : 'n/d'}</strong>
              <div><i style={{ width: `${Math.max(0, Math.min(1, vector.value)) * 100}%` }} /></div>
              <small>{vector.sourceCount} fuentes · persistencia {dec(vector.persistence)} · trust {dec(vector.trust)} · Δ {dec(vector.delta)}</small>
            </article>
          ))}
        </div>
      </section>

      <div data-sfi-field-anchor="derived-layers"><PublicObservatoryDerivedLayers state={state} /></div>
      <div data-sfi-field-anchor="timeline"><PublicObservatoryTimelineNavigator /></div>

      <section id="reading" className="pou-reading" data-sfi-field-anchor="reading">
        <div>
          <span>LECTURA DEL DÍA</span>
          <h2>{state.dailyReading.title}</h2>
          <p>{state.dailyReading.summary}</p>
        </div>
        <dl>
          <div><dt>CONFIANZA</dt><dd>{dec(state.dailyReading.confidence)}</dd></div>
          <div><dt>EVIDENCIA</dt><dd>{state.dailyReading.evidenceCount}</dd></div>
          <div><dt>ESTABILIDAD</dt><dd>{state.dailyReading.stability.toUpperCase()}</dd></div>
        </dl>
        <div className="pou-reading-detail">
          <article><h3>BASE OBSERVABLE</h3>{state.dailyReading.evidence.length ? state.dailyReading.evidence.map((item) => <p key={item}>{item}</p>) : <p>SIN EVIDENCIA PUBLICABLE EN ESTE CORTE.</p>}</article>
          <article><h3>LÍMITES</h3>{state.dailyReading.limits.map((item) => <p key={item}>{item}</p>)}</article>
        </div>
      </section>

      <section id="method" className="pou-method" data-sfi-field-anchor="method">
        <header><span>PROVENANCE</span><h2>Método y límites.</h2></header>
        <div><article><h3>BASADO EN</h3>{state.provenance.basedOn.map((item) => <p key={item}>{item}</p>)}</article><article><h3>FUENTES DEGRADADAS</h3>{state.provenance.degradedSources.length ? state.provenance.degradedSources.map((item) => <p key={item}>{item}</p>) : <p>NINGUNA DECLARADA</p>}</article><article><h3>LÍMITES</h3>{state.provenance.limits.map((item) => <p key={item}>{item}</p>)}</article></div>
      </section>

      <footer><span>SYSTEM FRICTION INSTITUTE · PUBLIC OBSERVATORY</span><strong>STATE → TRAJECTORY → PHENOMENA → TIME</strong><time>{dateTime(state.generatedAt)}</time></footer>
    </main>
  );
}

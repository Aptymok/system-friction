import type { ObservatoryGoldState, ObservatoryGoldTrend } from '@/lib/observatory/gold/observatoryGoldState';
import './public-observatory-derived-layers.css';

function signed(value: number | null) {
  if (value === null) return 'SIN COMPARABLE';
  return `${value > 0 ? '+' : ''}${value.toFixed(3)}`;
}

function dec(value: number | null) {
  return value === null ? 'n/d' : value.toFixed(3);
}

function trendLabel(trend: ObservatoryGoldTrend | 'unavailable') {
  if (trend === 'up') return 'ASCENDENTE';
  if (trend === 'down') return 'DESCENDENTE';
  if (trend === 'stable') return 'ESTABLE';
  return 'SIN SERIE';
}

function time(value: string | null) {
  if (!value) return 'SIN FECHA';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC';
}

export function PublicObservatoryDerivedLayers({ state }: { state: ObservatoryGoldState }) {
  const trajectories = state.vectors
    .filter((vector) => vector.active && vector.delta !== null)
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

  const phenomenonCandidates = state.vectors
    .filter((vector) => vector.active && vector.sourceCount > 0 && vector.persistence !== null)
    .sort((a, b) => (b.persistence ?? 0) - (a.persistence ?? 0));

  return (
    <>
      <section id="trajectories" className="sfi-observatory-layer">
        <header>
          <div>
            <span>CAPA II · TRAYECTORIAS</span>
            <h2>Qué está cambiando y en qué dirección.</h2>
          </div>
          <strong>{trajectories.length} COMPARABLES</strong>
        </header>
        <p className="sfi-observatory-layer__boundary">
          Derivado exclusivamente de snapshots públicos persistidos. Un cambio de vector describe movimiento observable del instrumento; no demuestra causalidad ni pronostica el siguiente estado.
        </p>
        {trajectories.length ? (
          <div className="sfi-observatory-layer__rows">
            {trajectories.map((vector) => (
              <article key={vector.id}>
                <div className="sfi-observatory-layer__name">
                  <span>{vector.domainKeys.join(' · ')}</span>
                  <strong>{vector.label}</strong>
                  <small>{vector.sourceCount} fuentes · {time(vector.observedAt)}</small>
                </div>
                <div><span>DIRECCIÓN</span><strong>{trendLabel(vector.trend)}</strong></div>
                <div><span>Δ {state.longitudinal.horizonDays}D</span><strong>{signed(vector.delta)}</strong></div>
                <div><span>PERSISTENCIA</span><strong>{dec(vector.persistence)}</strong></div>
                <div><span>TRUST</span><strong>{dec(vector.trust)}</strong></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="sfi-observatory-layer__empty">SIN DOS OBSERVACIONES COMPARABLES. NO SE FABRICA UNA TRAYECTORIA.</div>
        )}
      </section>

      <section id="phenomena" className="sfi-observatory-layer is-phenomena">
        <header>
          <div>
            <span>CAPA III · FENÓMENOS CANDIDATOS</span>
            <h2>Qué configuraciones muestran persistencia suficiente para seguir observando.</h2>
          </div>
          <strong>{phenomenonCandidates.length} CANDIDATOS</strong>
        </header>
        <p className="sfi-observatory-layer__boundary">
          Candidato derivado ≠ fenómeno registrado. Esta vista no crea <code>sfi_phenomena</code>, no promueve PPOI, no atribuye causas y no expone fenómenos privados. Sólo muestra lecturas que ya tienen fuente pública utilizable y una medida de persistencia disponible.
        </p>
        {phenomenonCandidates.length ? (
          <div className="sfi-observatory-layer__cards">
            {phenomenonCandidates.map((vector) => (
              <article key={vector.id}>
                <span>CANDIDATO DERIVADO</span>
                <h3>{vector.label}</h3>
                <p>{vector.domainKeys.join(' · ')}</p>
                <dl>
                  <div><dt>ESTADO</dt><dd>{vector.value.toFixed(3)}</dd></div>
                  <div><dt>PERSISTENCIA</dt><dd>{dec(vector.persistence)}</dd></div>
                  <div><dt>TRAYECTORIA</dt><dd>{trendLabel(vector.trend)}</dd></div>
                  <div><dt>CAMBIO</dt><dd>{signed(vector.delta)}</dd></div>
                  <div><dt>TRUST</dt><dd>{dec(vector.trust)}</dd></div>
                  <div><dt>FUENTES</dt><dd>{vector.sourceCount}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="sfi-observatory-layer__empty">NO HAY CONFIGURACIONES PÚBLICAS CON PERSISTENCIA CALCULABLE EN ESTE CORTE.</div>
        )}
      </section>
    </>
  );
}

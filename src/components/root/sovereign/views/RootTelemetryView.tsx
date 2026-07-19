import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { TelemetryPhenomenon } from '@/lib/root/sovereign/readers/readRootTelemetry';
import type { RootSelection } from '../sovereignTypes';

const PLOT_W = 640;
const PLOT_H = 420;
const MARGIN = 36;

function plotX(attractorPull: number) {
  return MARGIN + attractorPull * (PLOT_W - MARGIN * 2);
}

function plotY(ejectorPull: number) {
  return PLOT_H - MARGIN - ejectorPull * (PLOT_H - MARGIN * 2);
}

function sparkline(history: TelemetryPhenomenon['history']) {
  if (history.length < 2) return null;
  const values = history.map((point) => point.composite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 120;
  const h = 24;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * w;
      const y = h - ((value - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return { points, w, h, last: values[values.length - 1], first: values[0] };
}

function directionSelection(phenomenon: TelemetryPhenomenon): RootSelection {
  return {
    kind: 'ppoi phenomenon',
    id: phenomenon.id,
    title: `${phenomenon.fpCode} · ${phenomenon.name}`,
    source: 'ppoi_phenomena + ppoi_hypotheses',
    observedAt: phenomenon.history.length ? phenomenon.history[phenomenon.history.length - 1].at : null,
    confidence: null,
    evidenceIds: [],
    warning: null,
    data: phenomenon,
  };
}

export function RootTelemetryView({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const telemetry = state.telemetry;
  const instruments = telemetry.data.instruments;
  const phenomena = telemetry.data.phenomena;

  return (
    <div className="rs-view">
      <header className="rs-view-title">
        <span>TELEMETRÍA</span>
        <h1>PLANO DE FASE · ATRACTOR / EYECTOR</h1>
        <p>Posición real, no decorativa — derivada de los 8 scores de dirección que ya sostienen cada hipótesis PPOI.</p>
      </header>

      {telemetry.error ? <div className="rs-source-warning">{telemetry.error}</div> : null}

      <div className="rt-instrument-strip">
        {instruments.map((instrument) => (
          <div key={instrument.id} className="rt-instrument" data-status={instrument.status}>
            <span>{instrument.label}</span>
            <strong>{instrument.value !== null ? instrument.value.toFixed(3) : '—'}</strong>
            <em>{instrument.symbol}</em>
            {instrument.warning ? <small>{instrument.warning}</small> : null}
          </div>
        ))}
      </div>

      {phenomena.length === 0 ? (
        <div className="rs-empty">
          <b>SIN LECTURA</b>
          <p>Ningún expediente PPOI tiene evidencia calibrada todavía. El plano no genera puntos sintéticos.</p>
        </div>
      ) : (
        <div className="rt-phase-wrap">
          <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} role="img" aria-label="Plano de fase atractor / eyector">
            <line x1={MARGIN} y1={PLOT_H - MARGIN} x2={PLOT_W - MARGIN} y2={PLOT_H - MARGIN} className="rt-axis" />
            <line x1={MARGIN} y1={MARGIN} x2={MARGIN} y2={PLOT_H - MARGIN} className="rt-axis" />
            <text x={PLOT_W - MARGIN} y={PLOT_H - MARGIN + 16} className="rt-axis-label" textAnchor="end">ATRACCIÓN →</text>
            <text x={MARGIN - 8} y={MARGIN - 8} className="rt-axis-label" textAnchor="start">↑ EYECCIÓN</text>
            {phenomena.map((phenomenon) => {
              const x = plotX(phenomenon.attractorPull);
              const y = plotY(phenomenon.ejectorPull);
              const radius = 5 + Math.min(10, Math.abs(phenomenon.composite ?? 0) * 2);
              return (
                <g
                  key={phenomenon.id}
                  role="button"
                  tabIndex={0}
                  transform={`translate(${x} ${y})`}
                  className="rt-point"
                  data-direction={phenomenon.direction ?? 'unknown'}
                  onClick={() => onSelect(directionSelection(phenomenon))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') event.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  }}
                >
                  <circle r={radius} />
                  <text y={-radius - 6}>{phenomenon.fpCode}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {phenomena.length > 0 ? (
        <>
          <header className="rs-view-title secondary">
            <span>HISTORIAL</span>
            <h2>SPARKLINES · Φ𝒻 POR EXPEDIENTE</h2>
            <p>Cada punto es una recalibración real registrada en ppoi_hypotheses — no interpolación.</p>
          </header>
          <div className="rt-spark-grid">
            {phenomena.map((phenomenon) => {
              const spark = sparkline(phenomenon.history);
              return (
                <button key={phenomenon.id} type="button" className="rt-spark-card" onClick={() => onSelect(directionSelection(phenomenon))}>
                  <span>{phenomenon.fpCode}</span>
                  <strong>{phenomenon.composite !== null ? phenomenon.composite.toFixed(2) : '—'}</strong>
                  {spark ? (
                    <svg viewBox={`0 0 ${spark.w} ${spark.h}`} className="rt-sparkline" preserveAspectRatio="none">
                      <polyline points={spark.points} />
                    </svg>
                  ) : (
                    <em>Una sola lectura — sin historial todavía.</em>
                  )}
                  <em>{phenomenon.direction ?? '—'} · rival {phenomenon.rivalDirection ?? '—'}</em>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
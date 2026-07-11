'use client';

import type { CSSProperties } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

type Tone = 'copper' | 'magenta' | 'cyan' | 'green' | 'amber' | 'red';

type GaugeProps = {
  label: string;
  value: number | null;
  detail?: string;
  tone?: Tone;
  compact?: boolean;
};

type Tension = {
  between: [string, string];
  magnitude: number;
  description: string;
};

type Attractor = {
  id: string;
  label: string;
  description: string;
  confidence: number;
};

type MihmVariable = {
  key: string;
  label: string;
  value: number | null;
  status: string;
};

type Route = {
  id: string;
  title: string;
  suitability: number;
  confidence: number;
  rationale: string;
};

function clamp01(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function pct(value: number | null | undefined, digits = 0) {
  const normalized = clamp01(value);
  return normalized === null ? 'N/A' : `${(normalized * 100).toFixed(digits)}%`;
}

function normalizeSeries(values: number[], maxPoints = 72) {
  if (!values.length) return [];
  const step = Math.max(1, Math.ceil(values.length / maxPoints));
  const reduced: number[] = [];
  for (let index = 0; index < values.length; index += step) {
    const slice = values.slice(index, index + step).filter(Number.isFinite);
    if (slice.length) reduced.push(slice.reduce((sum, item) => sum + item, 0) / slice.length);
  }
  const absolute = reduced.map((value) => Math.abs(value));
  const max = Math.max(...absolute, 0);
  return max > 0 ? absolute.map((value) => value / max) : absolute.map(() => 0);
}

function toneForStatus(status: string): Tone {
  const normalized = status.toUpperCase();
  if (normalized === 'COMPLETE' || normalized === 'OBSERVED' || normalized === 'ACTIVE' || normalized === 'READY') return 'green';
  if (normalized === 'DERIVED' || normalized === 'EXPERIMENTAL' || normalized === 'PARTIAL') return 'cyan';
  if (normalized === 'FAILED' || normalized === 'CRITICAL' || normalized === 'BLOCKED') return 'red';
  if (normalized === 'MISSING' || normalized === 'DEGRADED' || normalized === 'PENDING') return 'amber';
  return 'magenta';
}

export function ConsoleGauge({ label, value, detail, tone = 'magenta', compact = false }: GaugeProps) {
  const normalized = clamp01(value);
  const dash = normalized === null ? 0 : normalized * 100;
  return (
    <figure className={`sfi-console-gauge is-${tone}${compact ? ' is-compact' : ''}`}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`${label}: ${pct(normalized, 1)}`}>
        <circle className="sfi-console-gauge__track" cx="60" cy="60" r="45" pathLength="100" />
        <circle className="sfi-console-gauge__value" cx="60" cy="60" r="45" pathLength="100" strokeDasharray={`${dash} ${100 - dash}`} />
        <line x1="60" y1="13" x2="60" y2="22" className="sfi-console-gauge__tick" />
        <line x1="107" y1="60" x2="98" y2="60" className="sfi-console-gauge__tick" />
        <line x1="60" y1="107" x2="60" y2="98" className="sfi-console-gauge__tick" />
        <line x1="13" y1="60" x2="22" y2="60" className="sfi-console-gauge__tick" />
      </svg>
      <figcaption>
        <span>{label}</span>
        <strong>{pct(normalized, 1)}</strong>
        {detail ? <small>{detail}</small> : null}
      </figcaption>
    </figure>
  );
}

export function ConsoleSignalStrip({ values, label, secondary }: { values: number[]; label: string; secondary?: string }) {
  const series = normalizeSeries(values);
  return (
    <div className="sfi-console-signal">
      <header><span>{label}</span>{secondary ? <small>{secondary}</small> : null}</header>
      <div className="sfi-console-signal__bars" aria-label={`${series.length} muestras representadas`}>
        {series.length ? series.map((value, index) => (
          <i key={`${index}-${value}`} style={{ '--signal': `${Math.max(3, value * 100)}%` } as CSSProperties} />
        )) : <em>SIN SERIE PERSISTIDA</em>}
      </div>
    </div>
  );
}

export function StudioTelemetryRail({ state }: { state: StudioProductionState }) {
  const confidence = Math.max(...state.metricValues.map((metric) => metric.confidence), 0);
  const phaseObserved = state.phaseStates.filter((phase) => ['COMPLETE', 'OBSERVED', 'DERIVED'].includes(phase.status)).length;
  const phaseCoverage = state.phaseStates.length ? phaseObserved / state.phaseStates.length : 0;
  const health = state.systemState === 'nominal' ? 1 : state.systemState === 'degraded' ? 0.62 : state.systemState === 'critical' ? 0.28 : 0;
  const readiness = state.activeObject.readiness === 'ready' ? 1 : state.activeObject.readiness === 'partial' ? 0.62 : state.activeObject.readiness === 'blocked' ? 0.2 : 0;
  const clipping = clamp01(state.audioFeatures.clippingRisk);
  const dynamicRange = state.audioFeatures.dynamicRange;
  const keyMetrics = state.metricValues
    .filter((metric) => metric.value !== null)
    .slice(0, 6);

  return (
    <aside className="sfi-production__telemetry" aria-label="Telemetría de Studio">
      <section className="sfi-telemetry__block is-primary">
        <header><span>SYSTEM OUTPUT</span><strong>{state.systemState.toUpperCase()}</strong></header>
        <div className="sfi-telemetry__gauges">
          <ConsoleGauge label="HEALTH" value={health} detail="runtime" tone={toneForStatus(state.systemState)} compact />
          <ConsoleGauge label="READINESS" value={readiness} detail={state.activeObject.readiness} tone={toneForStatus(state.activeObject.readiness)} compact />
        </div>
      </section>

      <section className="sfi-telemetry__block">
        <header><span>EVIDENCE COVERAGE</span><strong>{state.evidence.length}</strong></header>
        <div className="sfi-telemetry__bars">
          <div><span>PHASES</span><i><b style={{ width: `${phaseCoverage * 100}%` }} /></i><em>{pct(phaseCoverage)}</em></div>
          <div><span>MAX CONF</span><i><b style={{ width: `${confidence * 100}%` }} /></i><em>{pct(confidence)}</em></div>
          <div><span>GRAPH</span><i><b style={{ width: `${Math.min(100, state.objectFeatures.graph.nodes.length * 5)}%` }} /></i><em>{state.objectFeatures.graph.nodes.length}</em></div>
        </div>
      </section>

      <section className="sfi-telemetry__block">
        <header><span>OBJECT SIGNAL</span><strong>{state.activeObject.type.toUpperCase()}</strong></header>
        <ConsoleSignalStrip values={state.audioFeatures.energySegments.length ? state.audioFeatures.energySegments : state.audioFeatures.waveform} label="ENERGY / WAVEFORM" secondary={`${state.audioFeatures.energySegments.length || state.audioFeatures.waveform.length} samples`} />
        <dl className="sfi-telemetry__readout">
          <dt>DYNAMIC RANGE</dt><dd>{dynamicRange === null ? 'N/A' : `${dynamicRange.toFixed(2)} dB`}</dd>
          <dt>CLIPPING RISK</dt><dd>{clipping === null ? 'N/A' : pct(clipping, 2)}</dd>
          <dt>STEREO IMAGE</dt><dd>{state.audioFeatures.stereoImage === null ? 'N/A' : state.audioFeatures.stereoImage.toFixed(3)}</dd>
          <dt>SPECTRAL CENTER</dt><dd>{state.audioFeatures.spectralCentroid === null ? 'N/A' : `${Math.round(state.audioFeatures.spectralCentroid)} Hz`}</dd>
        </dl>
      </section>

      <section className="sfi-telemetry__block">
        <header><span>LIVE METRICS</span><strong>{keyMetrics.length}</strong></header>
        <div className="sfi-telemetry__metric-list">
          {keyMetrics.map((metric) => (
            <div key={metric.key}>
              <span>{metric.label}</span>
              <strong>{typeof metric.value === 'number' ? Number(metric.value.toFixed(3)) : metric.value}</strong>
              <small>{metric.status}</small>
            </div>
          ))}
          {!keyMetrics.length ? <p>SIN MÉTRICAS PERSISTIDAS</p> : null}
        </div>
      </section>

      <section className="sfi-telemetry__block is-action">
        <header><span>NEXT OPERATION</span><strong>{state.nextAction.code}</strong></header>
        <p>{state.nextAction.action}</p>
        <small>{state.nextAction.reason}</small>
      </section>
    </aside>
  );
}

export function StudioTimelineStrip({ state }: { state: StudioProductionState }) {
  const series = normalizeSeries(state.audioFeatures.energySegments.length ? state.audioFeatures.energySegments : state.audioFeatures.waveform, 96);
  return (
    <section className="sfi-production__transport" aria-label="Estado temporal del objeto">
      <div className="sfi-production__transport-meta">
        <span>ACTIVE OBJECT</span>
        <strong>{state.activeObject.title}</strong>
        <small>{state.activeObject.version ?? 'NO VERSION'} · {state.activeObject.analysisStatus}</small>
      </div>
      <div className="sfi-production__transport-timeline">
        <header><span>OBJECT SIGNAL TIMELINE</span><em>{series.length} bins</em></header>
        <div>{series.length ? series.map((value, index) => <i key={index} style={{ '--signal': `${Math.max(4, value * 100)}%` } as CSSProperties} />) : <em>SIN SEÑAL TEMPORAL</em>}</div>
      </div>
      <div className="sfi-production__transport-state">
        <span>GENERATED</span>
        <strong>{new Date(state.generatedAt).toISOString().slice(11, 19)} UTC</strong>
        <small>{state.session.status.toUpperCase()} · {state.systemState.toUpperCase()}</small>
      </div>
    </section>
  );
}

function domainPosition(domain: string, index: number, total: number) {
  const fixed: Record<string, { x: number; y: number }> = {
    CULTURAL: { x: 720, y: 95 },
    MEMETIC: { x: 825, y: 230 },
    AFFECTIVE: { x: 690, y: 365 },
  };
  if (fixed[domain]) return fixed[domain];
  const angle = (index / Math.max(1, total)) * Math.PI * 2;
  return { x: 710 + Math.cos(angle) * 150, y: 230 + Math.sin(angle) * 150 };
}

export function StudioVectorConsole({
  dominantDomain,
  tensions,
  attractors,
  variables,
}: {
  dominantDomain: string | null;
  tensions: Tension[];
  attractors: Attractor[];
  variables: MihmVariable[];
}) {
  const domains = Array.from(new Set([dominantDomain, ...tensions.flatMap((tension) => tension.between)].filter((item): item is string => Boolean(item))));
  const activeVariables = variables.filter((variable) => variable.value !== null).slice(0, 8);
  const missingVariables = variables.filter((variable) => variable.value === null).slice(0, 5);
  const positions = new Map(domains.map((domain, index) => [domain, domainPosition(domain, index, domains.length)]));

  return (
    <section className="sfi-vector-console">
      <header>
        <div><span>OBJECT–WORLD SIGNAL MAP</span><strong>{dominantDomain ?? 'INDETERMINATE'}</strong></div>
        <p>{domains.length} vectores · {activeVariables.length} variables MIHM activas · {attractors.length} atractores</p>
      </header>
      <div className="sfi-vector-console__body">
        <svg viewBox="0 0 920 460" role="img" aria-label="Relación visual entre objeto, MIHM, vectores y atractores">
          <defs>
            <filter id="sfiGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <g className="sfi-vector-console__grid">
            {Array.from({ length: 13 }).map((_, index) => <line key={`v-${index}`} x1={index * 76.6} y1="0" x2={index * 76.6} y2="460" />)}
            {Array.from({ length: 8 }).map((_, index) => <line key={`h-${index}`} x1="0" y1={index * 65.7} x2="920" y2={index * 65.7} />)}
          </g>

          {tensions.map((tension) => {
            const start = positions.get(tension.between[0]);
            const end = positions.get(tension.between[1]);
            if (!start || !end) return null;
            return <line key={tension.between.join(':')} className="sfi-vector-console__tension" x1={start.x} y1={start.y} x2={end.x} y2={end.y} style={{ '--strength': Math.max(1, tension.magnitude * 10) } as CSSProperties} />;
          })}

          {activeVariables.map((variable, index) => {
            const y = 52 + index * 46;
            const strength = clamp01(variable.value) ?? 0;
            return (
              <g key={variable.key} className="sfi-vector-console__variable">
                <line x1="130" y1={y} x2="385" y2="230" style={{ opacity: 0.2 + strength * 0.7 }} />
                <rect x="20" y={y - 14} width={90 + strength * 55} height="28" />
                <text x="30" y={y + 4}>{variable.key}</text>
                <text x="172" y={y + 4}>{strength.toFixed(3)}</text>
              </g>
            );
          })}

          <g className="sfi-vector-console__object" filter="url(#sfiGlow)">
            <circle cx="385" cy="230" r="78" />
            <circle cx="385" cy="230" r="47" />
            <circle cx="385" cy="230" r="6" />
            <text x="385" y="222" textAnchor="middle">OBJECT</text>
            <text x="385" y="244" textAnchor="middle">MIHM FIELD</text>
          </g>

          {domains.map((domain) => {
            const position = positions.get(domain)!;
            const isDominant = domain === dominantDomain;
            return (
              <g key={domain} className={`sfi-vector-console__domain${isDominant ? ' is-dominant' : ''}`} filter={isDominant ? 'url(#sfiGlow)' : undefined}>
                <line x1="463" y1="230" x2={position.x} y2={position.y} />
                <circle cx={position.x} cy={position.y} r={isDominant ? 38 : 29} />
                <circle cx={position.x} cy={position.y} r="6" />
                <text x={position.x} y={position.y + 56} textAnchor="middle">{domain}</text>
              </g>
            );
          })}
        </svg>

        <aside className="sfi-vector-console__readout">
          <section>
            <span>ATTRACTORS</span>
            {attractors.map((attractor) => (
              <div key={attractor.id}>
                <strong>{attractor.label}</strong>
                <i><b style={{ width: `${clamp01(attractor.confidence)! * 100}%` }} /></i>
                <small>{pct(attractor.confidence, 1)}</small>
              </div>
            ))}
            {!attractors.length ? <p>NINGUNO INFERIBLE</p> : null}
          </section>
          <section>
            <span>MIHM MISSING</span>
            {missingVariables.map((variable) => <div key={variable.key}><strong>{variable.key}</strong><small>{variable.label}</small></div>)}
            {!missingVariables.length ? <p>CORE COMPLETO</p> : null}
          </section>
        </aside>
      </div>
    </section>
  );
}

export function StudioProjectionConsole({
  compatibility,
  compatibilityConfidence,
  coverage,
  prediction,
  predictionConfidence,
  lower,
  upper,
  worldConfidence,
}: {
  compatibility: number | null;
  compatibilityConfidence: number | null;
  coverage: number | null;
  prediction: number | null;
  predictionConfidence: number | null;
  lower: number | null;
  upper: number | null;
  worldConfidence: number | null;
}) {
  const boundedLower = clamp01(lower) ?? 0;
  const boundedUpper = clamp01(upper) ?? 0;
  const boundedPrediction = clamp01(prediction) ?? 0;
  return (
    <section className="sfi-projection-console">
      <div className="sfi-projection-console__gauges">
        <ConsoleGauge label="FIELD FIT" value={compatibility} detail={`confidence ${pct(compatibilityConfidence, 1)}`} tone="magenta" />
        <ConsoleGauge label="30D RESPONSE" value={prediction} detail={`confidence ${pct(predictionConfidence, 1)}`} tone="copper" />
        <ConsoleGauge label="WORLD" value={worldConfidence} detail="WorldSpect" tone="cyan" />
      </div>
      <div className="sfi-projection-console__interval">
        <header><span>PREDICTIVE INTERVAL</span><strong>{pct(lower, 1)} — {pct(upper, 1)}</strong></header>
        <div className="sfi-projection-console__scale">
          <i className="is-range" style={{ left: `${boundedLower * 100}%`, width: `${Math.max(0, boundedUpper - boundedLower) * 100}%` }} />
          <i className="is-center" style={{ left: `${boundedPrediction * 100}%` }} />
          {Array.from({ length: 11 }).map((_, index) => <b key={index} style={{ left: `${index * 10}%` }}>{index * 10}</b>)}
        </div>
        <div className="sfi-projection-console__channels">
          <div><span>FIELD COVERAGE</span><i><b style={{ width: `${(clamp01(coverage) ?? 0) * 100}%` }} /></i><em>{pct(coverage, 1)}</em></div>
          <div><span>FIELD CONFIDENCE</span><i><b style={{ width: `${(clamp01(compatibilityConfidence) ?? 0) * 100}%` }} /></i><em>{pct(compatibilityConfidence, 1)}</em></div>
          <div><span>MODEL CONFIDENCE</span><i><b style={{ width: `${(clamp01(predictionConfidence) ?? 0) * 100}%` }} /></i><em>{pct(predictionConfidence, 1)}</em></div>
        </div>
      </div>
    </section>
  );
}

export function StudioRouteConsole({ routes, selectedRouteId }: { routes: Route[]; selectedRouteId: string | null }) {
  return (
    <section className="sfi-route-console">
      <header><span>STRATEGY ROUTING MATRIX</span><strong>{routes.length} ROUTES</strong></header>
      <div className="sfi-route-console__tracks">
        {routes.map((route, index) => {
          const suitability = clamp01(route.suitability) ?? 0;
          const confidence = clamp01(route.confidence) ?? 0;
          const selected = route.id === selectedRouteId;
          return (
            <article key={route.id} className={selected ? 'is-selected' : ''}>
              <div><span>{String(index + 1).padStart(2, '0')}</span><strong>{route.title}</strong><em>{pct(suitability)}</em></div>
              <i className="is-suitability"><b style={{ width: `${suitability * 100}%` }} /></i>
              <i className="is-confidence"><b style={{ width: `${confidence * 100}%` }} /></i>
              <small>{route.rationale}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function StudioReturnConsole({
  prediction,
  actual,
  confidence,
  fidelity,
  learningCount,
  outcomeCount,
}: {
  prediction: number | null;
  actual: number | null;
  confidence: number | null;
  fidelity: number | null;
  learningCount: number;
  outcomeCount: number;
}) {
  const predicted = clamp01(prediction) ?? 0;
  const observed = clamp01(actual);
  const residual = observed === null ? null : predicted - observed;
  return (
    <section className="sfi-return-console">
      <header><span>PREDICTION / OUTCOME ERROR FIELD</span><strong>{observed === null ? 'AWAITING OUTCOME' : `RESIDUAL ${residual!.toFixed(3)}`}</strong></header>
      <div className="sfi-return-console__track">
        <i className="is-prediction" style={{ left: `${predicted * 100}%` }}><span>P {pct(prediction, 1)}</span></i>
        {observed !== null ? <i className="is-actual" style={{ left: `${observed * 100}%` }}><span>O {pct(observed, 1)}</span></i> : null}
        {Array.from({ length: 11 }).map((_, index) => <b key={index} style={{ left: `${index * 10}%` }}>{index * 10}</b>)}
      </div>
      <div className="sfi-return-console__metrics">
        <ConsoleGauge label="CONFIDENCE" value={confidence} tone="amber" compact />
        <ConsoleGauge label="FIDELITY" value={fidelity} tone="cyan" compact />
        <div><span>OUTCOMES</span><strong>{outcomeCount}</strong><small>persistidos</small></div>
        <div><span>LEARNING EVENTS</span><strong>{learningCount}</strong><small>auditables</small></div>
      </div>
    </section>
  );
}

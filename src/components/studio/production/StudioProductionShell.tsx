'use client';

import { useMemo, useState } from 'react';
import type { MetricStatus, MetricValue, PhaseState, StudioFieldNode, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioEvaluationStrip } from './StudioEvaluationStrip';
import { StudioFooterTransport } from './StudioFooterTransport';
import { StudioHeader } from './StudioHeader';
import { StudioObjectIntake } from './StudioObjectIntake';
import { StudioPixiStage } from './pixi/StudioPixiStage';
import { StudioSidebar, type StudioProductionScreen } from './StudioSidebar';

const STATUS_LABEL: Record<MetricStatus, string> = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  OBSERVED: 'OBSERVED',
  DERIVED: 'DERIVED',
  DEGRADED: 'DEGRADED',
  MISSING: 'MISSING',
  FAILED: 'FAILED',
  COMPLETE: 'COMPLETE',
  EXPERIMENTAL: 'EXPERIMENTAL',
};

function statusClass(status: MetricStatus) {
  return `is-${status.toLowerCase()}`;
}

function formatMetricValue(metric: MetricValue) {
  if (metric.value === null) return 'SIN DATO';
  if (typeof metric.value === 'number') return `${Number(metric.value.toFixed(3))}${metric.unit ? ` ${metric.unit}` : ''}`;
  return metric.unit ? `${metric.value} ${metric.unit}` : metric.value;
}

function metricByKey(state: StudioProductionState, key: string) {
  return state.metricValues.find((metric) => metric.key === key) ?? null;
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="sfi-production__panel">
      <header>
        <span>{title}</span>
        {action}
      </header>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: MetricStatus }) {
  return <b className={`sfi-production__status ${statusClass(status)}`}>{STATUS_LABEL[status]}</b>;
}

function MetricCard({ metric }: { metric: MetricValue }) {
  return (
    <article className={`sfi-production__metric-card ${statusClass(metric.status)}`}>
      <div>
        <span>{metric.label}</span>
        <StatusPill status={metric.status} />
      </div>
      <strong>{formatMetricValue(metric)}</strong>
      <p>{metric.explanation}</p>
      <dl>
        <dt>Source</dt>
        <dd>{metric.source ?? 'NO_SOURCE'}</dd>
        <dt>Confidence</dt>
        <dd>{metric.status === 'MISSING' || metric.source === null ? 'UNKNOWN' : Number(metric.confidence.toFixed(3))}</dd>
        <dt>Formula</dt>
        <dd>{metric.formulaVersion ?? 'NO_FORMULA'}</dd>
        <dt>Evidence</dt>
        <dd>{metric.evidenceIds.length ? metric.evidenceIds.join(', ') : 'NO_EVIDENCE'}</dd>
      </dl>
      {metric.warnings.length ? <p className="sfi-production__warning">{metric.warnings.join(' / ')}</p> : null}
    </article>
  );
}

function AudioPlayback({ state }: { state: StudioProductionState }) {
  const canPlay = Boolean(state.activeObject.id && state.activeObject.type === 'music' && state.activeObject.storageStatus === 'OBSERVED');
  if (!canPlay) {
    return <p>Playback unavailable: an audio object with verified storage is required.</p>;
  }

  return (
    <div className="sfi-production__audio-player">
      <span>AUDIO PLAYBACK</span>
      <audio controls preload="metadata" src={`/api/studio/objects/${encodeURIComponent(state.activeObject.id as string)}/audio`} />
    </div>
  );
}

function PhaseList({ phases }: { phases: PhaseState[] }) {
  return (
    <ol className="sfi-production__phase-list">
      {phases.map((item) => (
        <li key={item.key} className={statusClass(item.status)}>
          <div>
            <span>{item.label}</span>
            <StatusPill status={item.status} />
          </div>
          <p>{item.details ?? item.error ?? item.nextAction ?? item.requirements.join(', ')}</p>
          {item.progress !== null ? <i><b style={{ width: `${Math.round(item.progress * 100)}%` }} /></i> : null}
        </li>
      ))}
    </ol>
  );
}

function EvidenceMatrix({ state }: { state: StudioProductionState }) {
  const counts = state.metricValues.reduce<Record<MetricStatus, number>>((acc, metric) => {
    acc[metric.status] += 1;
    return acc;
  }, {
    PENDING: 0,
    RUNNING: 0,
    OBSERVED: 0,
    DERIVED: 0,
    DEGRADED: 0,
    MISSING: 0,
    FAILED: 0,
    COMPLETE: 0,
    EXPERIMENTAL: 0,
  });

  return (
    <div className="sfi-production__evidence-matrix">
      {(['OBSERVED', 'DERIVED', 'DEGRADED', 'MISSING', 'FAILED'] as MetricStatus[]).map((status) => (
        <details key={status} open={status === 'MISSING' || status === 'OBSERVED'}>
          <summary><span>{status}</span><strong>{counts[status]}</strong></summary>
          {state.metricValues.filter((metric) => metric.status === status).map((metric) => (
            <p key={metric.key}>{metric.label}: {metric.source ?? metric.explanation}</p>
          ))}
          {!state.metricValues.some((metric) => metric.status === status) ? <p>NO_ITEMS</p> : null}
        </details>
      ))}
    </div>
  );
}

function NextAction({ state, onOpenIntake }: { state: StudioProductionState; onOpenIntake: () => void }) {
  const [actionState, setActionState] = useState<'idle' | 'running' | 'complete' | 'failed'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const action = state.nextAction;

  async function execute() {
    if (!action.endpoint || action.method !== 'POST') return;
    setActionState('running');
    setMessage('Ejecutando accion contra endpoint POST real.');
    const response = await fetch(action.endpoint, { method: 'POST' });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok === false) {
      setActionState('failed');
      setMessage(body?.details || body?.reason || body?.error || `HTTP_${response.status}`);
      return;
    }
    setActionState('complete');
    setMessage(body?.status || 'Accion completada.');
  }

  const canOpenIntake = action.code === 'UPLOAD_OBJECT';
  const canExecute = Boolean(action.endpoint && action.method === 'POST' && !action.disabledReason);

  return (
    <Panel title="NEXT ACTION">
      <div className="sfi-production__next-action">
        <strong>{action.action}</strong>
        <p>{action.reason}</p>
        <span>{action.requirement ?? 'NO_REQUIREMENT'}</span>
        {canOpenIntake ? <button type="button" onClick={onOpenIntake}>CARGAR OBJETO</button> : null}
        {canExecute ? <button type="button" onClick={execute} disabled={actionState === 'running'}>EJECUTAR ACCION</button> : null}
        {!canOpenIntake && !canExecute ? <em>{action.disabledReason ?? action.code}</em> : null}
        {message ? <p className={`sfi-production__action-result is-${actionState}`}>{message}</p> : null}
      </div>
    </Panel>
  );
}

function ActiveObject({ state, onOpenIntake }: { state: StudioProductionState; onOpenIntake: () => void }) {
  return (
    <Panel title="ACTIVE OBJECT" action={<button type="button" onClick={onOpenIntake}>CARGAR</button>}>
      <dl className="sfi-production__object-grid">
        <dt>Title</dt><dd>{state.activeObject.title}</dd>
        <dt>Type</dt><dd>{state.activeObject.type}</dd>
        <dt>Source URI</dt><dd>{state.activeObject.sourceUri ?? 'MISSING'}</dd>
        <dt>MIME</dt><dd>{state.activeObject.mimeType ?? 'MISSING'}</dd>
        <dt>Size</dt><dd>{state.activeObject.sizeBytes === null ? 'MISSING' : `${state.activeObject.sizeBytes} bytes`}</dd>
        <dt>Created</dt><dd>{state.activeObject.uploadedAt ?? 'MISSING'}</dd>
        <dt>Session</dt><dd>{state.activeObject.sessionId ?? state.session.id ?? 'MISSING'}</dd>
        <dt>Storage</dt><dd><StatusPill status={state.activeObject.storageStatus} /></dd>
        <dt>Analysis</dt><dd><StatusPill status={state.activeObject.analysisStatus} /></dd>
        <dt>Version</dt><dd>{state.activeObject.version ?? 'MISSING'}</dd>
      </dl>
      {state.activeObject.id ? (
        <a href={`/api/studio/objects/${encodeURIComponent(state.activeObject.id)}/content`} target="_blank" rel="noreferrer">
          OPEN PRIVATE OBJECT
        </a>
      ) : null}
    </Panel>
  );
}

function ExecutiveReading({ state }: { state: StudioProductionState }) {
  const hasEvidence = state.evidence.length > 0 && state.metricValues.some((metric) => metric.status === 'OBSERVED' || metric.status === 'DERIVED');
  const dominantHypothesis = state.fieldGraph.nodes.find((node) => node.type === 'hypothesis');
  const cultural = metricByKey(state, 'cultural_resonance');
  const mihm = metricByKey(state, 'mihm_activation');

  if (!hasEvidence || !dominantHypothesis) {
    return (
      <Panel title="EXECUTIVE READING">
        <p>No existe evidencia suficiente para generar lectura ejecutiva.</p>
        <p>Limitaciones: {state.provenance.limits.join(' / ') || 'NO_LIMITS_DECLARED'}</p>
      </Panel>
    );
  }

  return (
    <Panel title="EXECUTIVE READING">
      <div className="sfi-production__reading">
        <span>Tension principal</span><strong>{dominantHypothesis.label}</strong>
        <span>Direccion observada</span><p>{cultural?.explanation ?? 'MISSING'}</p>
        <span>Atractor declarado</span><p>{state.culturalLens?.dominantSignal ?? 'MISSING'}</p>
        <span>Hipotesis dominante</span><p>{dominantHypothesis.explanation}</p>
        <span>Confidence</span><p>{Number(Math.min(cultural?.confidence ?? 0, mihm?.confidence ?? 0).toFixed(3))}</p>
        <span>Limitaciones</span><p>{state.provenance.limits.join(' / ') || 'NO_LIMITS_DECLARED'}</p>
      </div>
    </Panel>
  );
}

function FieldGraphInspector({ state }: { state: StudioProductionState }) {
  const [selectedId, setSelectedId] = useState<string | null>(state.fieldGraph.nodes[0]?.id ?? null);
  const selected = state.fieldGraph.nodes.find((node) => node.id === selectedId) ?? null;

  return (
    <Panel title="FIELD NODE INSPECTOR">
      <div className="sfi-production__node-layout">
        <div className="sfi-production__node-list">
          {state.fieldGraph.nodes.map((node) => (
            <button key={node.id} type="button" className={node.id === selectedId ? 'is-active' : ''} onClick={() => setSelectedId(node.id)}>
              {node.label}
            </button>
          ))}
          {!state.fieldGraph.nodes.length ? <p>No renderable nodes: every node requires source, status, confidence and explanation.</p> : null}
        </div>
        {selected ? (
          <dl className="sfi-production__object-grid">
            <dt>Label</dt><dd>{selected.label}</dd>
            <dt>Type</dt><dd>{selected.type}</dd>
            <dt>Value</dt><dd>{selected.value ?? 'MISSING'}</dd>
            <dt>Status</dt><dd><StatusPill status={selected.status} /></dd>
            <dt>Source</dt><dd>{selected.source ?? 'NO_SOURCE'}</dd>
            <dt>Formula</dt><dd>{selected.formulaVersion ?? 'NO_FORMULA'}</dd>
            <dt>Confidence</dt><dd>{selected.status === 'MISSING' || selected.source === null ? 'UNKNOWN' : Number(selected.confidence.toFixed(3))}</dd>
            <dt>Explanation</dt><dd>{selected.explanation}</dd>
            <dt>Evidence IDs</dt><dd>{selected.evidenceIds.join(', ') || 'NO_EVIDENCE'}</dd>
          </dl>
        ) : null}
      </div>
    </Panel>
  );
}

function Overview({ state, onOpenIntake }: { state: StudioProductionState; onOpenIntake: () => void }) {
  return (
    <div className="sfi-production__module">
      <div className="sfi-production__overview-grid">
        <ActiveObject state={state} onOpenIntake={onOpenIntake} />
        <Panel title="PIPELINE REAL"><PhaseList phases={state.phaseStates} /></Panel>
        <Panel title="EVIDENCE MATRIX"><EvidenceMatrix state={state} /></Panel>
        <ExecutiveReading state={state} />
        <NextAction state={state} onOpenIntake={onOpenIntake} />
      </div>
      <section className="sfi-production__field-panel">
        <header><span>VISUAL FIELD</span><strong>OBSERVED / DERIVED NODES ONLY</strong></header>
        <StudioPixiStage state={state} variant="overview" label="Studio overview field" />
      </section>
      <FieldGraphInspector state={state} />
    </div>
  );
}

function Measure({ state }: { state: StudioProductionState }) {
  const technicalKeys = ['rms_dbfs', 'peak_dbfs', 'clipping_risk', 'spectral_centroid_hz', 'dynamic_range_db', 'crest_factor_db', 'headroom_db'];
  const technicalMetrics = technicalKeys.map((key) => metricByKey(state, key)).filter((metric): metric is MetricValue => Boolean(metric));
  const hasAudioData = state.audioFeatures.waveform.length > 0 || technicalMetrics.some((metric) => metric.status !== 'MISSING');

  return (
    <div className="sfi-production__module">
      <Panel title="LIVE SIGNAL">
        <AudioPlayback state={state} />
        {hasAudioData ? <StudioPixiStage state={state} variant="waveform" label="Live signal waveform" /> : <p>No animar waveform: no hay audio analizable persistido ni buffer Web Audio activo.</p>}
        <div className="sfi-production__metric-grid">
          {technicalMetrics.length ? technicalMetrics.map((metric) => <MetricCard key={metric.key} metric={metric} />) : <MetricCard metric={{ key: 'live_signal_missing', label: 'Live Signal', value: null, unit: null, status: 'MISSING', source: null, evidenceIds: [], confidence: 0, observedAt: null, formulaVersion: null, warnings: ['AUDIO_EVIDENCE_REQUIRED'], explanation: 'No persisted audio features or active browser audio analysis are available.' }} />}
        </div>
      </Panel>
      <Panel title="COMPOSITION">
        <p>{state.timeCoordinateFeatures.placeLabel ? `Persisted ${state.timeCoordinateFeatures.placeLabel} marker at ${state.timeCoordinateFeatures.timeRange ?? 'MISSING_TIME_RANGE'}.` : 'Segmentation unavailable. Manual markers require a persistence endpoint before controls are shown.'}</p>
        {state.textFeatures.motifs.map((item) => <p key={item}>{item}</p>)}
      </Panel>
      <Panel title="SOUND DESIGN">
        <div className="sfi-production__metric-grid">
          {['spectral_centroid_hz', 'spectral_rolloff_hz', 'spectral_flux', 'noise_floor_dbfs', 'dynamic_range_db', 'harmonic_stability', 'percussive_load', 'transient_density', 'stereo_width'].map((key) => metricByKey(state, key) ?? {
            key,
            label: key.replace(/_/g, ' ').toUpperCase(),
            value: null,
            unit: null,
            status: 'MISSING' as MetricStatus,
            source: null,
            evidenceIds: [],
            confidence: 0,
            observedAt: null,
            formulaVersion: null,
            warnings: ['ACOUSTIC_FEATURE_REQUIRED'],
            explanation: 'No persisted acoustic feature row exists for this value.',
          }).map((metric) => <MetricCard key={metric.key} metric={metric} />)}
        </div>
      </Panel>
      <Panel title="MASTERING TECHNICAL">
        <div className="sfi-production__metric-grid">
          {['lufs_integrated', 'true_peak_dbtp', 'loudness_range_lu', 'crest_factor_db', 'clipping_risk', 'headroom_db', 'stereo_width', 'tonal_balance'].map((key) => metricByKey(state, key) ?? {
            key,
            label: key.replace(/_/g, ' ').toUpperCase(),
            value: null,
            unit: null,
            status: 'MISSING' as MetricStatus,
            source: null,
            evidenceIds: [],
            confidence: 0,
            observedAt: null,
            formulaVersion: null,
            warnings: ['MASTERING_FEATURE_REQUIRED'],
            explanation: 'No persisted mastering technical feature row exists for this value.',
          }).map((metric) => <MetricCard key={metric.key} metric={metric} />)}
        </div>
      </Panel>
    </div>
  );
}

function Structure({ state }: { state: StudioProductionState }) {
  return (
    <div className="sfi-production__module">
      <Panel title="LAYERS">
        <p>{state.objectFeatures.layers.length ? 'Persisted generic feature rows exist, but no stem/layer evidence is connected.' : 'MULTILAYER_EVIDENCE_REQUIRED'}</p>
        <StatusPill status="MISSING" />
      </Panel>
      <Panel title="ARRANGEMENTS">
        <p>{state.timeCoordinateFeatures.timeRange ? `Observed marker: ${state.timeCoordinateFeatures.placeLabel ?? 'marker'} / ${state.timeCoordinateFeatures.timeRange}` : 'Blocked until stems, layers, sections or events are persisted.'}</p>
      </Panel>
      <Panel title="MIX">
        <p>No faders rendered: real channels are required for mute, solo, meter, masking, panorama, correlation and energy controls.</p>
      </Panel>
      <Panel title="WAVEFORM / ENERGY">
        {state.audioFeatures.waveform.length ? <StudioPixiStage state={state} variant="waveform" label="Persisted waveform peaks" /> : <p>MISSING: waveform peaks require decoded audio evidence.</p>}
        <p>{state.audioFeatures.energySegments.length ? `${state.audioFeatures.energySegments.length} energy segments persisted.` : 'MISSING: energy segments require decoded audio evidence.'}</p>
      </Panel>
      <Panel title="NEURAL GRAPH">
        <FieldGraphInspector state={state} />
      </Panel>
    </div>
  );
}

function Field({ state }: { state: StudioProductionState }) {
  const internal = ['mihm_activation', 'feature_coverage'].map((key) => metricByKey(state, key)).filter((metric): metric is MetricValue => Boolean(metric));
  const cultural = metricByKey(state, 'cultural_resonance');

  return (
    <div className="sfi-production__module">
      <Panel title="INTERNAL SIGNAL">
        <p>INTERNAL_SIGNAL_RANKING / NOT_EXTERNAL_PREDICTION / PROVISIONAL_NO_TRACEABILITY_NO_HISTORICAL_CALIBRATION</p>
        <div className="sfi-production__metric-grid">{internal.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</div>
      </Panel>
      <Panel title="CULTURAL FIELD">
        <MetricCard metric={cultural ?? { key: 'cultural_resonance', label: 'Cultural Resonance', value: null, unit: null, status: 'MISSING', source: null, evidenceIds: [], confidence: 0, observedAt: null, formulaVersion: null, warnings: ['CULTURAL_VECTOR_REQUIRED'], explanation: 'Cultural Vector evidence is unavailable.' }} />
      </Panel>
      <Panel title="WORLD TIMING">
        <dl className="sfi-production__object-grid">
          <dt>Snapshot ID</dt><dd>MISSING</dd>
          <dt>Observed At</dt><dd>{state.culturalLens?.observedAt ?? 'MISSING'}</dd>
          <dt>Confidence</dt><dd>{state.culturalLens ? Number(state.culturalLens.confidence.toFixed(3)) : 'MISSING'}</dd>
          <dt>Degraded Sources</dt><dd>{state.culturalLens?.warnings.join(', ') || 'MISSING'}</dd>
          <dt>Regime</dt><dd>MISSING</dd>
          <dt>Timing Fit</dt><dd>{state.culturalLens ? state.culturalLens.status.toUpperCase() : 'MISSING'}</dd>
        </dl>
      </Panel>
      <Panel title="FIELD TENSIONS">
        {state.fieldGraph.nodes.filter((node) => node.type === 'hypothesis').map((node) => <MetricCard key={node.id} metric={{ key: node.id, label: node.label, value: node.value, unit: null, status: node.status, source: node.source, evidenceIds: node.evidenceIds, confidence: node.confidence, observedAt: null, formulaVersion: node.formulaVersion, warnings: [], explanation: node.explanation }} />)}
        {!state.fieldGraph.nodes.some((node) => node.type === 'hypothesis') ? <p>No tensions generated: relationships require MIHM, Cultural Vector, WSV, external evidence or declared attractor evidence.</p> : null}
      </Panel>
    </div>
  );
}

function Intervention({ state }: { state: StudioProductionState }) {
  const hypotheses = state.fieldGraph.nodes.filter((node) => node.type === 'hypothesis');
  return (
    <div className="sfi-production__module">
      <Panel title="MINIMUM PERTURBATION">
        {!hypotheses.length ? <p>No mostrar intervencion: no existe hipotesis activa.</p> : hypotheses.map((node) => <p key={node.id}>{node.explanation}</p>)}
      </Panel>
      <Panel title="CANDIDATE ACTIONS">
        {state.interventions.length ? state.interventions.map((item) => <p key={item.id}>{item.title} / {item.state} / {item.source}</p>) : <p>NO_VERIFIED_INTERVENTION_QUEUE</p>}
      </Panel>
      <Panel title="SIMULATION">
        <p>SIMULATION_NOT_AVAILABLE</p>
        <p>El endpoint POST existe, pero declara `simulation_engine_not_connected`; no se muestra boton.</p>
      </Panel>
      <Panel title="VERIFICATION WINDOW">
        <p>72 h, 7 d y 30 d se habilitan solo cuando una hipotesis persistida declara tipo y expectedSignal.</p>
      </Panel>
      <Panel title="OUTCOME REGISTRATION">
        <p>Registrar outcome requiere endpoint de persistencia explicito. No se muestra control hasta que exista.</p>
      </Panel>
    </div>
  );
}

function Memory({ state }: { state: StudioProductionState }) {
  return (
    <div className="sfi-production__module">
      <Panel title="SESSIONS">
        <table className="sfi-production__table">
          <thead><tr><th>Session</th><th>Object</th><th>Date</th><th>Phase</th><th>Status</th><th>Evidence</th><th>Hypothesis</th><th>Intervention</th><th>Outcome</th><th>Confidence</th></tr></thead>
          <tbody>
            <tr>
              <td>{state.session.id ?? 'MISSING'}</td>
              <td>{state.activeObject.id ?? 'MISSING'}</td>
              <td>{state.session.updatedAt ?? state.generatedAt}</td>
              <td>{state.phaseStates.find((item) => item.status !== 'COMPLETE' && item.status !== 'OBSERVED')?.label ?? 'COMPLETE'}</td>
              <td>{state.systemState}</td>
              <td>{state.evidence.length}</td>
              <td>{state.fieldGraph.nodes.filter((node) => node.type === 'hypothesis').length}</td>
              <td>{state.interventions.length}</td>
              <td>{state.archive.events.filter((event) => event.label.toLowerCase().includes('outcome')).length}</td>
              <td>{Number(Math.max(...state.metricValues.map((metric) => metric.confidence), 0).toFixed(3))}</td>
            </tr>
          </tbody>
        </table>
      </Panel>
      <Panel title="TIMELINE"><PhaseList phases={state.phaseStates} /></Panel>
      <Panel title="ARCHIVES">
        {state.archive.events.length ? state.archive.events.map((event) => <p key={event.id}>{event.time} / {event.label} / {event.source}</p>) : <p>NO_ARCHIVE_EVENTS</p>}
      </Panel>
      <Panel title="VERSIONS">
        <p>{state.activeObject.version ? `Active version: ${state.activeObject.version}` : 'No comparable versions persisted for this object.'}</p>
      </Panel>
      <Panel title="DELIVERABLES">
        {state.exports.packages.length ? state.exports.packages.map((item) => (
          <p key={item.id}>{item.label} / {item.state} {item.url ? <a href={item.url}>DESCARGAR</a> : null}</p>
        )) : <p>BLOCKED: no studio_exports rows. Generation buttons are hidden until real generation endpoints exist.</p>}
      </Panel>
      <Panel title="LEARNING">
        <p>No ajustar pesos automaticamente: falta muestra minima definida y learning archive event.</p>
      </Panel>
    </div>
  );
}

function Screen({ active, state, onOpenIntake }: { active: StudioProductionScreen; state: StudioProductionState; onOpenIntake: () => void }) {
  switch (active) {
    case 'measure': return <Measure state={state} />;
    case 'structure': return <Structure state={state} />;
    case 'field': return <Field state={state} />;
    case 'intervention': return <Intervention state={state} />;
    case 'memory': return <Memory state={state} />;
    case 'overview':
    default:
      return <Overview state={state} onOpenIntake={onOpenIntake} />;
  }
}

export function StudioProductionShell({ state }: { state: StudioProductionState }) {
  const [active, setActive] = useState<StudioProductionScreen>('overview');
  const [intakeOpen, setIntakeOpen] = useState(false);
  const css = useMemo(() => productionCss, []);

  return (
    <main className="sfi-production">
      <StudioSidebar active={active} onSelect={setActive} sessionStatus={state.session.status} />
      <section className="sfi-production__main">
        <StudioHeader state={state} />
        <Screen active={active} state={state} onOpenIntake={() => setIntakeOpen(true)} />
        <StudioFooterTransport state={state} />
        <StudioEvaluationStrip state={state} />
      </section>
      <StudioObjectIntake open={intakeOpen} onClose={() => setIntakeOpen(false)} />
      <style jsx global>{css}</style>
    </main>
  );
}

const productionCss = `
.sfi-production {
  --bg: #05020a;
  --panel: rgba(12, 7, 18, .94);
  --panel2: rgba(18, 9, 27, .96);
  --line: rgba(154, 92, 255, .28);
  --line2: rgba(69, 220, 235, .2);
  --purple: #9d5cff;
  --cyan: #45dceb;
  --orange: #f59e42;
  --green: #78e6a3;
  --red: #ee5d70;
  --missing: #787184;
  --text: #efe8fb;
  --muted: #9b8daa;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  background: radial-gradient(circle at 52% 32%, rgba(157,92,255,.14), transparent 38%), linear-gradient(135deg, #05020a, #0c0613 48%, #040208);
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.sfi-production * { box-sizing: border-box; }
.sfi-production button, .sfi-production a { border: 1px solid var(--line); background: rgba(157,92,255,.08); color: var(--text); text-decoration: none; font: 800 10px ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
.sfi-production button:disabled { cursor: not-allowed; opacity: .45; }
.sfi-production__sidebar, .sfi-production__header, .sfi-production__panel, .sfi-production__field-panel, .sfi-production__transport, .sfi-production__evaluation-strip { border: 1px solid var(--line); background: linear-gradient(180deg, var(--panel2), var(--panel)); box-shadow: inset 0 0 36px rgba(157,92,255,.04); }
.sfi-production__sidebar { display: grid; grid-template-rows: auto 1fr auto; min-height: calc(100vh - 20px); }
.sfi-production__brand { display: flex; align-items: center; gap: 12px; padding: 18px; border-bottom: 1px solid var(--line); }
.sfi-production__mark { width: 30px; height: 30px; border: 1px solid var(--purple); border-radius: 50%; box-shadow: 0 0 18px rgba(157,92,255,.3); }
.sfi-production__brand strong { display: block; font-size: 20px; letter-spacing: .16em; }
.sfi-production__brand em { display: block; color: var(--cyan); font-style: normal; font-size: 10px; letter-spacing: .26em; }
.sfi-production__sidebar nav { display: grid; align-content: start; gap: 5px; padding: 12px; }
.sfi-production__sidebar nav button { width: 100%; display: grid; grid-template-columns: 28px 1fr; gap: 10px; padding: 11px; text-align: left; color: var(--muted); }
.sfi-production__sidebar nav button.is-active { border-color: var(--cyan); color: var(--cyan); background: rgba(69,220,235,.09); }
.sfi-production__side-status { padding: 14px; border-top: 1px solid var(--line); }
.sfi-production__side-status span, .sfi-production__panel header span, .sfi-production__field-panel header span, .sfi-production__transport span { color: var(--muted); font-size: 9px; letter-spacing: .15em; text-transform: uppercase; }
.sfi-production__side-status strong { display: block; margin-top: 8px; color: var(--green); }
.sfi-production__side-status p, .sfi-production__panel p, .sfi-production__panel dd, .sfi-production__panel td { color: var(--muted); font-size: 11px; line-height: 1.5; }
.sfi-production__main { display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; gap: 10px; min-width: 0; }
.sfi-production__header { display: grid; grid-template-columns: 1fr 1.2fr auto; gap: 16px; padding: 14px 18px; align-items: center; }
.sfi-production__header span { display: block; color: var(--muted); font-size: 9px; letter-spacing: .16em; }
.sfi-production__header strong { display: block; margin-top: 5px; color: var(--purple); font-size: 12px; letter-spacing: .12em; }
.sfi-production__module { display: grid; gap: 10px; align-content: start; }
.sfi-production__overview-grid { display: grid; grid-template-columns: minmax(260px, .9fr) minmax(360px, 1.4fr) minmax(260px, .9fr); gap: 10px; }
.sfi-production__panel { min-height: 128px; padding: 14px; overflow: hidden; }
.sfi-production__panel header, .sfi-production__field-panel header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.sfi-production__panel header button, .sfi-production__panel header a { padding: 7px 9px; }
.sfi-production__object-grid { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 8px 12px; margin: 0; }
.sfi-production__object-grid dt { color: var(--cyan); font-size: 10px; text-transform: uppercase; }
.sfi-production__object-grid dd { margin: 0; overflow-wrap: anywhere; }
.sfi-production__status { display: inline-block; border: 1px solid currentColor; padding: 3px 6px; font-size: 9px; color: var(--muted); }
.sfi-production__status.is-observed, .sfi-production__status.is-complete { color: var(--green); }
.sfi-production__status.is-derived { color: var(--cyan); }
.sfi-production__status.is-degraded, .sfi-production__status.is-pending { color: var(--orange); }
.sfi-production__status.is-missing { color: var(--missing); }
.sfi-production__status.is-failed { color: var(--red); }
.sfi-production__phase-list { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.sfi-production__phase-list li { border: 1px solid var(--line2); padding: 8px; }
.sfi-production__phase-list li div { display: flex; justify-content: space-between; gap: 8px; }
.sfi-production__phase-list li span { color: var(--text); font-size: 10px; }
.sfi-production__phase-list li i { display: block; height: 6px; border: 1px solid var(--line2); margin-top: 8px; }
.sfi-production__phase-list li i b { display: block; height: 100%; background: var(--green); }
.sfi-production__evidence-matrix { display: grid; gap: 8px; }
.sfi-production__evidence-matrix details { border: 1px solid var(--line2); padding: 8px; }
.sfi-production__evidence-matrix summary { cursor: pointer; display: flex; justify-content: space-between; color: var(--cyan); }
.sfi-production__reading { display: grid; gap: 7px; }
.sfi-production__reading span { color: var(--cyan); font-size: 10px; text-transform: uppercase; }
.sfi-production__reading strong { color: var(--orange); }
.sfi-production__next-action strong { display: block; color: var(--cyan); font-size: 16px; }
.sfi-production__next-action span, .sfi-production__next-action em { display: block; color: var(--orange); font-style: normal; margin: 8px 0; }
.sfi-production__next-action button { padding: 10px 12px; }
.sfi-production__action-result { border: 1px solid var(--line2); padding: 8px; }
.sfi-production__metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; }
.sfi-production__metric-card { border: 1px solid var(--line2); padding: 10px; background: rgba(5,2,10,.38); }
.sfi-production__metric-card div { display: flex; justify-content: space-between; gap: 8px; }
.sfi-production__metric-card span { color: var(--muted); font-size: 10px; text-transform: uppercase; }
.sfi-production__metric-card strong { display: block; margin: 10px 0; color: var(--cyan); font-size: 18px; overflow-wrap: anywhere; }
.sfi-production__metric-card dl { display: grid; grid-template-columns: 78px minmax(0,1fr); gap: 5px; margin: 10px 0 0; }
.sfi-production__metric-card dt { color: var(--cyan); font-size: 9px; }
.sfi-production__metric-card dd { margin: 0; overflow-wrap: anywhere; }
.sfi-production__warning { color: var(--orange) !important; }
.sfi-production__audio-player { border: 1px solid var(--line2); padding: 10px; margin-bottom: 10px; display: grid; gap: 8px; }
.sfi-production__audio-player span { color: var(--cyan); font-size: 9px; letter-spacing: .12em; }
.sfi-production__audio-player audio { width: 100%; height: 34px; }
.sfi-production__field-panel { min-height: 430px; display: grid; grid-template-rows: auto minmax(360px, 1fr); }
.sfi-production__pixi-stage { position: relative; min-height: 360px; overflow: hidden; background: radial-gradient(circle at 50% 50%, rgba(157,92,255,.16), transparent 48%); }
.sfi-production__pixi-host, .sfi-production__pixi-host canvas, .sfi-production__pixi-fallback { position: absolute; inset: 0; width: 100%; height: 100%; }
.sfi-production__pixi-host { z-index: 2; }
.sfi-production__pixi-fallback { z-index: 1; opacity: .5; }
.sfi-production__pixi-fallback circle { fill: var(--cyan); opacity: .5; }
.sfi-production__pixi-fallback text { fill: var(--muted); font-size: 5px; letter-spacing: .12em; }
.sfi-production__node-layout { display: grid; grid-template-columns: 220px minmax(0,1fr); gap: 12px; }
.sfi-production__node-list { display: grid; align-content: start; gap: 7px; }
.sfi-production__node-list button { padding: 8px; text-align: left; }
.sfi-production__node-list button.is-active { border-color: var(--cyan); color: var(--cyan); }
.sfi-production__transport { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; padding: 12px; }
.sfi-production__transport strong { display: block; margin-top: 5px; color: var(--cyan); }
.sfi-production__evaluation-strip { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1px; padding: 8px; }
.sfi-production__evaluation-strip div { border: 1px solid var(--line2); padding: 9px; min-width: 0; }
.sfi-production__evaluation-strip span, .sfi-production__evaluation-strip em { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--muted); font-size: 8px; letter-spacing: .1em; font-style: normal; }
.sfi-production__evaluation-strip strong { display: block; margin: 6px 0; color: var(--purple); font-size: 12px; }
.sfi-production__intake { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(0,0,0,.72); backdrop-filter: blur(8px); }
.sfi-production__intake-panel { position: relative; width: min(520px, calc(100vw - 32px)); border: 1px solid var(--line); background: rgba(8,5,14,.98); padding: 26px; box-shadow: 0 0 70px rgba(157,92,255,.22); }
.sfi-production__intake-panel input { display: none; }
.sfi-production__intake-panel h2 { color: var(--purple); letter-spacing: .1em; }
.sfi-production__intake-panel p { color: var(--muted); line-height: 1.6; }
.sfi-production__intake-panel button:not(.sfi-production__icon-button) { width: 100%; padding: 16px; margin-top: 14px; }
.sfi-production__icon-button { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; }
.sfi-production__table { width: 100%; border-collapse: collapse; min-width: 920px; }
.sfi-production__table th, .sfi-production__table td { border: 1px solid var(--line2); padding: 8px; text-align: left; }
.sfi-production__table th { color: var(--cyan); font-size: 9px; text-transform: uppercase; }
@media (max-width: 1180px) {
  .sfi-production { display: block; }
  .sfi-production__sidebar { min-height: auto; margin-bottom: 10px; }
  .sfi-production__overview-grid, .sfi-production__node-layout { grid-template-columns: 1fr; }
  .sfi-production__header, .sfi-production__transport, .sfi-production__evaluation-strip { grid-template-columns: 1fr; }
}
`;

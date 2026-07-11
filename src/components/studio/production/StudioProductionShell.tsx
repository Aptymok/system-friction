'use client';

import { useState } from 'react';
import type { MetricStatus, MetricValue, PhaseState, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioHeader } from './StudioHeader';
import { StudioObjectIntake } from './StudioObjectIntake';
import { StudioUnifiedIntelligence } from './StudioUnifiedIntelligence';
import { StudioVisualStage } from './StudioVisualStage';
import { StudioTelemetryRail, StudioTimelineStrip } from './StudioVisualInstruments';
import { StudioPixiStage } from './pixi/StudioPixiStage';
import { StudioSidebar, studioProductionScreens, type StudioProductionScreen } from './StudioSidebar';
import './studio-console.css';

function statusClass(status: MetricStatus) {
  return `is-${status.toLowerCase()}`;
}

function encodeObjectId(value: string | null) {
  if (!value) throw new Error('STUDIO_OBJECT_ID_REQUIRED');
  return encodeURIComponent(value);
}

function formatValue(metric: MetricValue) {
  if (metric.value === null) return 'SIN DATO';
  if (typeof metric.value === 'number') return `${Number(metric.value.toFixed(3))}${metric.unit ? ` ${metric.unit}` : ''}`;
  return metric.unit ? `${metric.value} ${metric.unit}` : metric.value;
}

function metricByKey(state: StudioProductionState, key: string) {
  return state.metricValues.find((metric) => metric.key === key) ?? null;
}

function Panel({ title, eyebrow, action, children, wide = false }: { title: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`sfi-production__panel${wide ? ' is-wide' : ''}`}>
      <header>
        <div>{eyebrow ? <small>{eyebrow}</small> : null}<span>{title}</span></div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Status({ status }: { status: MetricStatus }) {
  return <b className={`sfi-production__status ${statusClass(status)}`}>{status}</b>;
}

function MetricCard({ metric, compact = false }: { metric: MetricValue; compact?: boolean }) {
  return (
    <article className={`sfi-production__metric-card ${statusClass(metric.status)}${compact ? ' is-compact' : ''}`} style={{ '--meter': `${Math.max(0, Math.min(100, metric.confidence * 100))}%` } as React.CSSProperties}>
      <div><span>{metric.label}</span><Status status={metric.status} /></div>
      <strong>{formatValue(metric)}</strong>
      <p>{metric.explanation}</p>
      {!compact ? (
        <details>
          <summary>TRAZABILIDAD</summary>
          <dl>
            <dt>Source</dt><dd>{metric.source ?? 'NO_SOURCE'}</dd>
            <dt>Confidence</dt><dd>{metric.source ? Number(metric.confidence.toFixed(3)) : 'UNKNOWN'}</dd>
            <dt>Formula</dt><dd>{metric.formulaVersion ?? 'NO_FORMULA'}</dd>
            <dt>Evidence</dt><dd>{metric.evidenceIds.join(', ') || 'NO_EVIDENCE'}</dd>
          </dl>
        </details>
      ) : null}
    </article>
  );
}

function PhaseRail({ phases }: { phases: PhaseState[] }) {
  return (
    <ol className="sfi-production__phase-rail">
      {phases.map((phase, index) => (
        <li key={phase.key} className={statusClass(phase.status)}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div><strong>{phase.label}</strong><p>{phase.details ?? phase.error ?? phase.nextAction ?? phase.requirements.join(', ')}</p></div>
          <Status status={phase.status} />
        </li>
      ))}
    </ol>
  );
}

function AudioPlayer({ state }: { state: StudioProductionState }) {
  const playable = Boolean(state.activeObject.id && state.activeObject.type === 'music' && state.activeObject.storageStatus === 'OBSERVED');
  if (!playable) return <p className="sfi-production__muted">Playback requiere un objeto de audio persistido y autorizado.</p>;
  return <audio controls preload="metadata" src={`/api/studio/objects/${encodeObjectId(state.activeObject.id)}/audio`} />;
}

function ObjectStage({ state, onOpenIntake }: { state: StudioProductionState; onOpenIntake: () => void }) {
  const objectExists = Boolean(state.activeObject.id);
  return (
    <div className="sfi-production__stage">
      <section className="sfi-production__object-hero">
        <div>
          <span>OBJETO ACTIVO</span>
          <h1>{state.activeObject.title}</h1>
          <p>{objectExists ? 'El objeto está conectado a almacenamiento, análisis, evidencia y proyección.' : 'No existe un objeto persistido en la sesión actual.'}</p>
          <div className="sfi-production__hero-actions">
            <button type="button" onClick={onOpenIntake}>{objectExists ? 'CARGAR OTRO OBJETO' : 'CARGAR OBJETO'}</button>
            {state.activeObject.id ? <a href={`/api/studio/objects/${encodeObjectId(state.activeObject.id)}/content`} target="_blank" rel="noreferrer">ABRIR ORIGINAL PRIVADO</a> : null}
          </div>
        </div>
        <div className="sfi-production__object-orbit">
          <StudioPixiStage state={state} variant="overview" label="Object state field" />
        </div>
      </section>

      <div className="sfi-production__grid-2">
        <Panel title="IDENTIDAD" eyebrow="01 / REGISTRO">
          <dl className="sfi-production__facts">
            <dt>Tipo</dt><dd>{state.activeObject.type}</dd>
            <dt>MIME</dt><dd>{state.activeObject.mimeType ?? 'MISSING'}</dd>
            <dt>Tamaño</dt><dd>{state.activeObject.sizeBytes === null ? 'MISSING' : `${(state.activeObject.sizeBytes / 1024 / 1024).toFixed(2)} MB`}</dd>
            <dt>Versión</dt><dd>{state.activeObject.version ?? 'MISSING'}</dd>
            <dt>Session</dt><dd>{state.activeObject.sessionId ?? state.session.id ?? 'MISSING'}</dd>
            <dt>Uploaded</dt><dd>{state.activeObject.uploadedAt ?? 'MISSING'}</dd>
          </dl>
        </Panel>
        <Panel title="ESTADO OPERATIVO" eyebrow="02 / PIPELINE">
          <div className="sfi-production__state-cards">
            <div><span>Storage</span><Status status={state.activeObject.storageStatus} /></div>
            <div><span>Analysis</span><Status status={state.activeObject.analysisStatus} /></div>
            <div><span>Readiness</span><strong>{state.activeObject.readiness.toUpperCase()}</strong></div>
            <div><span>System</span><strong>{state.systemState.toUpperCase()}</strong></div>
          </div>
          <AudioPlayer state={state} />
        </Panel>
      </div>

      <Panel title="CICLO DEL OBJETO" eyebrow="03 / ESTADO REAL" wide>
        <PhaseRail phases={state.phaseStates} />
      </Panel>

      <Panel title="SIGUIENTE ACCIÓN" eyebrow="04 / OPERACIÓN" wide action={state.nextAction.code === 'UPLOAD_OBJECT' ? <button type="button" onClick={onOpenIntake}>EJECUTAR</button> : null}>
        <div className="sfi-production__next-action">
          <strong>{state.nextAction.action}</strong>
          <p>{state.nextAction.reason}</p>
          <small>{state.nextAction.requirement ?? state.nextAction.disabledReason ?? state.nextAction.code}</small>
        </div>
      </Panel>
    </div>
  );
}

function ObservationStage({ state }: { state: StudioProductionState }) {
  const preferred = ['rms_dbfs', 'peak_dbfs', 'dynamic_range_db', 'crest_factor_db', 'spectral_centroid_hz', 'spectral_flux', 'clipping_risk', 'stereo_width'];
  const keyMetrics = preferred.map((key) => metricByKey(state, key)).filter((metric): metric is MetricValue => Boolean(metric));
  const measured = state.metricValues.filter((metric) => metric.status === 'OBSERVED' || metric.status === 'DERIVED');
  const missing = state.metricValues.filter((metric) => metric.status === 'MISSING' || metric.status === 'FAILED' || metric.status === 'DEGRADED');

  return (
    <div className="sfi-production__stage">
      <section className="sfi-production__stage-intro"><span>02 / OBSERVACIÓN</span><h1>Lo que el objeto demuestra</h1><p>Features medidas y derivadas. La interfaz separa observación, inferencia y ausencia de evidencia.</p></section>
      <Panel title="SEÑAL Y ESTRUCTURA TEMPORAL" eyebrow="OBJETO DECODIFICADO" wide>
        <AudioPlayer state={state} />
        {state.audioFeatures.waveform.length ? <StudioPixiStage state={state} variant="waveform" label="Persisted waveform and energy" /> : <p className="sfi-production__muted">No existe waveform persistido para esta modalidad.</p>}
        <div className="sfi-production__observation-summary">
          <span>{state.audioFeatures.waveform.length} PEAKS</span>
          <span>{state.audioFeatures.energySegments.length} SEGMENTOS</span>
          <span>{state.objectFeatures.graph.nodes.length} NODOS</span>
          <span>{state.evidence.length} EVIDENCIAS</span>
        </div>
      </Panel>

      <div className="sfi-production__metric-grid">
        {keyMetrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
        {!keyMetrics.length ? <div className="sfi-production__empty">No hay métricas principales persistidas para esta modalidad.</div> : null}
      </div>

      <div className="sfi-production__grid-2">
        <Panel title="OBSERVADO / DERIVADO" eyebrow="COBERTURA DISPONIBLE">
          <div className="sfi-production__compact-list">{measured.map((metric) => <MetricCard key={metric.key} metric={metric} compact />)}</div>
        </Panel>
        <Panel title="AUSENCIAS REALES" eyebrow="NO SIMULADO">
          <div className="sfi-production__compact-list">{missing.map((metric) => <MetricCard key={metric.key} metric={metric} compact />)}</div>
          {!missing.length ? <p className="sfi-production__muted">No existen métricas degradadas, faltantes o fallidas.</p> : null}
        </Panel>
      </div>

      <details className="sfi-production__trace-drawer">
        <summary>TRAZABILIDAD COMPLETA DEL OBJETO</summary>
        <div className="sfi-production__trace-grid">
          <div><span>Based on</span>{state.provenance.basedOn.map((item) => <p key={item}>{item}</p>)}</div>
          <div><span>Derived from</span>{state.provenance.derivedFrom.map((item) => <p key={item}>{item}</p>)}</div>
          <div><span>Limits</span>{state.provenance.limits.map((item) => <p key={item}>{item}</p>)}</div>
        </div>
      </details>
    </div>
  );
}

function SystemStage({ state, view }: { state: StudioProductionState; view: 'systemic' | 'projection' | 'decision' | 'return' }) {
  const titles = {
    systemic: ['03 / LECTURA SISTÉMICA', 'Qué significa dentro del campo'],
    projection: ['04 / PROYECCIÓN', 'Qué podría ocurrir y durante cuánto tiempo'],
    decision: ['05 / DECISIÓN', 'Qué conviene mover sin destruir el objeto'],
    return: ['06 / RETORNO', 'Qué ocurrió, cuánto se equivocó y qué aprendió'],
  } as const;
  return (
    <div className="sfi-production__stage">
      <section className="sfi-production__stage-intro"><span>{titles[view][0]}</span><h1>{titles[view][1]}</h1><p>La visualización principal usa exactamente la misma evidencia que la lectura auditada inferior.</p></section>
      <StudioVisualStage objectId={state.activeObject.id} view={view} />
      <StudioUnifiedIntelligence objectId={state.activeObject.id} view={view} />
    </div>
  );
}

function Screen({ active, state, onOpenIntake }: { active: StudioProductionScreen; state: StudioProductionState; onOpenIntake: () => void }) {
  if (active === 'object') return <ObjectStage state={state} onOpenIntake={onOpenIntake} />;
  if (active === 'observation') return <ObservationStage state={state} />;
  if (active === 'systemic') return <SystemStage state={state} view="systemic" />;
  if (active === 'projection') return <SystemStage state={state} view="projection" />;
  if (active === 'decision') return <SystemStage state={state} view="decision" />;
  return <SystemStage state={state} view="return" />;
}

export function StudioProductionShell({ state }: { state: StudioProductionState }) {
  const [active, setActive] = useState<StudioProductionScreen>('object');
  const [intakeOpen, setIntakeOpen] = useState(false);
  const stage = studioProductionScreens.find((screen) => screen.id === active)?.label ?? 'STUDIO';

  return (
    <main className="sfi-production">
      <StudioSidebar active={active} onSelect={setActive} sessionStatus={state.session.status} />
      <section className="sfi-production__main">
        <StudioHeader state={state} stage={stage} onOpenIntake={() => setIntakeOpen(true)} />
        <div className="sfi-production__workspace"><Screen active={active} state={state} onOpenIntake={() => setIntakeOpen(true)} /></div>
        <StudioTimelineStrip state={state} />
        <footer className="sfi-production__footer">
          <span>SFI STUDIO</span><strong>{state.activeObject.id ? state.activeObject.id.slice(0, 8) : 'NO OBJECT'}</strong><em>{state.generatedAt}</em>
        </footer>
      </section>
      <StudioTelemetryRail state={state} />
      <StudioObjectIntake open={intakeOpen} onClose={() => setIntakeOpen(false)} />
    </main>
  );
}

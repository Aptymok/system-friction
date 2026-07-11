'use client';

import { useMemo, useState } from 'react';
import type { MetricStatus, MetricValue, PhaseState, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioHeader } from './StudioHeader';
import { StudioObjectIntake } from './StudioObjectIntake';
import { StudioUnifiedIntelligence } from './StudioUnifiedIntelligence';
import { StudioPixiStage } from './pixi/StudioPixiStage';
import { StudioSidebar, studioProductionScreens, type StudioProductionScreen } from './StudioSidebar';

function statusClass(status: MetricStatus) {
  return `is-${status.toLowerCase()}`;
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
    <article className={`sfi-production__metric-card ${statusClass(metric.status)}${compact ? ' is-compact' : ''}`}>
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
  return <audio controls preload="metadata" src={`/api/studio/objects/${encodeURIComponent(state.activeObject.id as string)}/audio`} />;
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
            {state.activeObject.id ? <a href={`/api/studio/objects/${encodeURIComponent(state.activeObject.id)}/content`} target="_blank" rel="noreferrer">ABRIR ORIGINAL PRIVADO</a> : null}
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
      <section className="sfi-production__stage-intro"><span>{titles[view][0]}</span><h1>{titles[view][1]}</h1><p>La lectura conserva evidencia, incertidumbre, hipótesis y retorno. Ninguna recomendación equivale a ejecución automática.</p></section>
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
  const css = useMemo(() => productionCss, []);
  const stage = studioProductionScreens.find((screen) => screen.id === active)?.label ?? 'STUDIO';

  return (
    <main className="sfi-production">
      <StudioSidebar active={active} onSelect={setActive} sessionStatus={state.session.status} />
      <section className="sfi-production__main">
        <StudioHeader state={state} stage={stage} onOpenIntake={() => setIntakeOpen(true)} />
        <Screen active={active} state={state} onOpenIntake={() => setIntakeOpen(true)} />
        <footer className="sfi-production__footer">
          <span>SFI STUDIO</span><strong>{state.activeObject.id ? state.activeObject.id.slice(0, 8) : 'NO OBJECT'}</strong><em>{state.generatedAt}</em>
        </footer>
      </section>
      <StudioObjectIntake open={intakeOpen} onClose={() => setIntakeOpen(false)} />
      <style jsx global>{css}</style>
    </main>
  );
}

const productionCss = `
* { box-sizing: border-box; }
body { margin: 0; background: #07070a; color: #f1f0f4; }
.sfi-production {
  --bg: #07070a;
  --panel: #101014;
  --panel-2: #15151a;
  --panel-3: #1a1a20;
  --line: rgba(255,255,255,.09);
  --line-strong: rgba(255,255,255,.16);
  --text: #f1f0f4;
  --muted: #94939d;
  --violet: #9b7cff;
  --cyan: #62d6e8;
  --green: #6fd39b;
  --orange: #e5a45f;
  --red: #ed6d7d;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  background: radial-gradient(circle at 72% -20%, rgba(155,124,255,.12), transparent 38%), var(--bg);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.sfi-production button, .sfi-production input, .sfi-production textarea, .sfi-production select { font: inherit; }
.sfi-production button, .sfi-production a { transition: .18s ease; }
.sfi-production button { cursor: pointer; }
.sfi-production__sidebar { position: sticky; top: 0; height: 100vh; padding: 28px 18px; border-right: 1px solid var(--line); background: rgba(8,8,11,.96); display: flex; flex-direction: column; gap: 24px; z-index: 4; }
.sfi-production__brand { display: flex; gap: 12px; align-items: center; }
.sfi-production__mark { width: 34px; height: 34px; border: 1px solid var(--violet); border-radius: 50%; box-shadow: inset 0 0 0 8px rgba(155,124,255,.08); }
.sfi-production__brand div { display: grid; }
.sfi-production__brand strong { font-size: 19px; letter-spacing: .18em; }
.sfi-production__brand em { color: var(--violet); font-style: normal; font-size: 10px; letter-spacing: .32em; }
.sfi-production__side-kicker { margin: -12px 0 0; color: var(--muted); font-size: 9px; letter-spacing: .18em; }
.sfi-production__sidebar nav { display: grid; gap: 6px; }
.sfi-production__sidebar nav button { width: 100%; border: 1px solid transparent; border-radius: 12px; padding: 12px; color: var(--muted); background: transparent; display: grid; grid-template-columns: 30px 1fr; align-items: start; text-align: left; }
.sfi-production__sidebar nav button > span { font-size: 10px; padding-top: 2px; }
.sfi-production__sidebar nav button div { display: grid; gap: 4px; }
.sfi-production__sidebar nav b { color: inherit; font-size: 11px; letter-spacing: .08em; }
.sfi-production__sidebar nav small { font-size: 10px; color: #66656d; line-height: 1.35; }
.sfi-production__sidebar nav button:hover, .sfi-production__sidebar nav button.is-active { border-color: var(--line-strong); background: linear-gradient(135deg, rgba(155,124,255,.12), rgba(98,214,232,.04)); color: var(--text); transform: translateX(2px); }
.sfi-production__sidebar nav button.is-active > span { color: var(--violet); }
.sfi-production__side-status { margin-top: auto; border-top: 1px solid var(--line); padding-top: 16px; display: grid; gap: 5px; }
.sfi-production__side-status span, .sfi-production__side-status p { color: var(--muted); font-size: 10px; }
.sfi-production__side-status strong { font-size: 12px; color: var(--green); }
.sfi-production__main { min-width: 0; }
.sfi-production__header { min-height: 86px; padding: 18px 28px; border-bottom: 1px solid var(--line); display: grid; grid-template-columns: minmax(260px,1.5fr) minmax(200px,1fr) minmax(170px,.7fr) auto; gap: 22px; align-items: center; background: rgba(7,7,10,.86); backdrop-filter: blur(18px); position: sticky; top: 0; z-index: 3; }
.sfi-production__header > div { display: grid; gap: 4px; }
.sfi-production__header span { color: var(--muted); font-size: 9px; letter-spacing: .16em; }
.sfi-production__header strong { font-size: 12px; letter-spacing: .07em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sfi-production__header small, .sfi-production__header em { color: var(--muted); font-size: 9px; font-style: normal; }
.sfi-production__header button, .sfi-production__hero-actions button, .sfi-production__hero-actions a, .sfi-intel button, .sfi-production__panel > header button { border: 1px solid rgba(155,124,255,.48); background: rgba(155,124,255,.12); color: var(--text); padding: 10px 14px; border-radius: 9px; font-size: 10px; letter-spacing: .08em; text-decoration: none; }
.sfi-production__header button:hover, .sfi-production__hero-actions button:hover, .sfi-production__hero-actions a:hover, .sfi-intel button:hover { background: rgba(155,124,255,.24); }
.sfi-production__stage { padding: 30px; display: grid; gap: 18px; max-width: 1500px; margin: 0 auto; }
.sfi-production__stage-intro { padding: 10px 0 6px; }
.sfi-production__stage-intro span { color: var(--violet); font-size: 10px; letter-spacing: .2em; }
.sfi-production__stage-intro h1 { margin: 8px 0; font-size: clamp(26px,4vw,48px); letter-spacing: -.04em; }
.sfi-production__stage-intro p { color: var(--muted); max-width: 760px; line-height: 1.6; }
.sfi-production__object-hero { min-height: 390px; border: 1px solid var(--line); border-radius: 18px; background: linear-gradient(135deg, rgba(155,124,255,.12), rgba(98,214,232,.025) 55%, rgba(255,255,255,.02)); display: grid; grid-template-columns: minmax(300px,.8fr) minmax(420px,1.2fr); overflow: hidden; }
.sfi-production__object-hero > div:first-child { padding: clamp(28px,5vw,64px); display: flex; flex-direction: column; justify-content: center; }
.sfi-production__object-hero span { color: var(--violet); font-size: 10px; letter-spacing: .2em; }
.sfi-production__object-hero h1 { margin: 12px 0; font-size: clamp(34px,5vw,66px); letter-spacing: -.055em; }
.sfi-production__object-hero p { color: var(--muted); line-height: 1.7; max-width: 520px; }
.sfi-production__object-orbit { min-height: 360px; border-left: 1px solid var(--line); }
.sfi-production__object-orbit > div { height: 100%; min-height: 360px; }
.sfi-production__hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.sfi-production__grid-2, .sfi-intel__grid-2, .sfi-intel__hero-grid, .sfi-intel__projection-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
.sfi-production__panel, .sfi-intel__card { border: 1px solid var(--line); border-radius: 14px; background: var(--panel); padding: 18px; min-width: 0; }
.sfi-production__panel > header, .sfi-intel__card > header { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding-bottom: 14px; border-bottom: 1px solid var(--line); margin-bottom: 14px; }
.sfi-production__panel > header div { display: grid; gap: 3px; }
.sfi-production__panel > header span, .sfi-intel__card > header span { font-size: 10px; letter-spacing: .14em; }
.sfi-production__panel > header small { color: var(--violet); font-size: 8px; letter-spacing: .16em; }
.sfi-production__facts { display: grid; grid-template-columns: 120px 1fr; gap: 10px 16px; font-size: 12px; }
.sfi-production__facts dt { color: var(--muted); }
.sfi-production__facts dd { margin: 0; overflow-wrap: anywhere; }
.sfi-production__state-cards { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin-bottom: 14px; }
.sfi-production__state-cards > div { border: 1px solid var(--line); border-radius: 9px; padding: 12px; display: flex; justify-content: space-between; align-items: center; }
.sfi-production__state-cards span { color: var(--muted); font-size: 10px; }
.sfi-production__status { display: inline-flex; width: fit-content; padding: 5px 7px; border-radius: 999px; border: 1px solid var(--line-strong); font-size: 8px; letter-spacing: .08em; }
.sfi-production__status.is-observed, .sfi-production__status.is-complete { color: var(--green); }
.sfi-production__status.is-derived, .sfi-production__status.is-experimental { color: var(--cyan); }
.sfi-production__status.is-missing, .sfi-production__status.is-degraded, .sfi-production__status.is-pending { color: var(--orange); }
.sfi-production__status.is-failed { color: var(--red); }
.sfi-production audio { width: 100%; filter: grayscale(1) contrast(1.12); }
.sfi-production__phase-rail { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.sfi-production__phase-rail li { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 12px; border: 1px solid var(--line); padding: 10px; border-radius: 9px; }
.sfi-production__phase-rail li > span { color: var(--violet); font-size: 9px; }
.sfi-production__phase-rail strong { font-size: 11px; }
.sfi-production__phase-rail p { margin: 3px 0 0; color: var(--muted); font-size: 10px; }
.sfi-production__next-action strong { font-size: 22px; }
.sfi-production__next-action p { color: var(--muted); }
.sfi-production__next-action small { color: var(--violet); }
.sfi-production__metric-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 12px; }
.sfi-production__metric-card { border: 1px solid var(--line); border-radius: 12px; background: var(--panel); padding: 15px; min-width: 0; }
.sfi-production__metric-card > div { display: flex; justify-content: space-between; gap: 8px; }
.sfi-production__metric-card span { color: var(--muted); font-size: 9px; letter-spacing: .08em; }
.sfi-production__metric-card > strong { display: block; font-size: 24px; margin: 16px 0 8px; }
.sfi-production__metric-card p { color: var(--muted); font-size: 11px; line-height: 1.5; }
.sfi-production__metric-card details { border-top: 1px solid var(--line); margin-top: 12px; padding-top: 10px; }
.sfi-production__metric-card summary, .sfi-production__trace-drawer summary, .sfi-intel details summary { cursor: pointer; font-size: 9px; letter-spacing: .1em; color: var(--violet); }
.sfi-production__metric-card dl { display: grid; grid-template-columns: 80px 1fr; gap: 6px; font-size: 9px; overflow-wrap: anywhere; }
.sfi-production__metric-card dt { color: var(--muted); }
.sfi-production__metric-card dd { margin: 0; }
.sfi-production__metric-card.is-compact > strong { font-size: 16px; margin: 9px 0 4px; }
.sfi-production__metric-card.is-compact p { margin-bottom: 0; }
.sfi-production__compact-list { display: grid; gap: 8px; max-height: 620px; overflow: auto; padding-right: 4px; }
.sfi-production__observation-summary { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.sfi-production__observation-summary span { border: 1px solid var(--line); padding: 7px 9px; border-radius: 999px; color: var(--muted); font-size: 9px; }
.sfi-production__trace-drawer, .sfi-intel__preferences, .sfi-intel__trace { border: 1px solid var(--line); border-radius: 12px; padding: 15px; background: var(--panel); }
.sfi-production__trace-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 16px; margin-top: 16px; }
.sfi-production__trace-grid span { color: var(--violet); font-size: 9px; }
.sfi-production__trace-grid p { color: var(--muted); font-size: 10px; overflow-wrap: anywhere; }
.sfi-production__empty, .sfi-intel__empty { border: 1px dashed var(--line-strong); border-radius: 12px; padding: 30px; color: var(--muted); text-align: center; }
.sfi-production__muted, .sfi-intel__muted { color: var(--muted); }
.sfi-production__footer { padding: 13px 30px 22px; color: var(--muted); display: flex; justify-content: space-between; gap: 14px; font-size: 9px; letter-spacing: .08em; }
.sfi-intel { display: grid; gap: 16px; }
.sfi-intel__actions { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.sfi-intel__actions span { color: var(--muted); font-size: 9px; }
.sfi-intel__message { margin: 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 9px; color: var(--muted); }
.sfi-intel__message.is-failed { border-color: rgba(237,109,125,.42); color: var(--red); }
.sfi-intel__stack { display: grid; gap: 16px; }
.sfi-intel__hero, .sfi-intel__score-card, .sfi-intel__decision-hero { border: 1px solid var(--line); border-radius: 16px; padding: 24px; background: linear-gradient(145deg, rgba(155,124,255,.10), rgba(255,255,255,.015)); }
.sfi-intel__hero > span, .sfi-intel__score-card > span, .sfi-intel__decision-hero > span { color: var(--violet); font-size: 9px; letter-spacing: .16em; }
.sfi-intel__hero h2, .sfi-intel__decision-hero h2 { margin: 10px 0; font-size: 28px; }
.sfi-intel__hero p, .sfi-intel__score-card p, .sfi-intel__decision-hero p, .sfi-intel__card p { color: var(--muted); line-height: 1.6; }
.sfi-intel__score-card > strong { display: block; font-size: clamp(56px,8vw,106px); letter-spacing: -.07em; line-height: .95; margin: 22px 0 8px; }
.sfi-intel__score-card h3 { margin: 0 0 14px; color: var(--violet); font-size: 12px; letter-spacing: .12em; }
.sfi-intel__metric-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.sfi-intel__metric { min-width: 130px; flex: 1; border: 1px solid var(--line); border-radius: 10px; padding: 11px; background: rgba(255,255,255,.018); }
.sfi-intel__metric span, .sfi-intel__metric small { display: block; color: var(--muted); font-size: 8px; }
.sfi-intel__metric strong { display: block; margin: 5px 0; font-size: 15px; }
.sfi-intel__metric.is-warn strong { color: var(--orange); }
.sfi-intel__metric.is-good strong { color: var(--green); }
.sfi-intel__metric.is-risk strong { color: var(--red); }
.sfi-intel__statement { border-left: 2px solid rgba(155,124,255,.55); padding: 4px 0 4px 12px; margin: 12px 0; }
.sfi-intel__statement strong { font-size: 11px; }
.sfi-intel__statement p { margin: 5px 0; }
.sfi-intel__statement small { color: var(--muted); font-size: 8px; }
.sfi-intel__property-grid, .sfi-intel__dimension-grid, .sfi-intel__route-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(190px,1fr)); gap: 9px; }
.sfi-intel__property, .sfi-intel__dimension-grid > div, .sfi-intel__route-grid > div { border: 1px solid var(--line); padding: 13px; border-radius: 10px; background: rgba(255,255,255,.018); }
.sfi-intel__property span, .sfi-intel__dimension-grid span, .sfi-intel__route-grid span { color: var(--violet); font-size: 9px; }
.sfi-intel__property strong, .sfi-intel__dimension-grid strong, .sfi-intel__route-grid strong { display: block; margin: 8px 0; }
.sfi-intel__property p, .sfi-intel__dimension-grid p, .sfi-intel__route-grid p { font-size: 10px; margin: 5px 0; }
.sfi-intel__property small, .sfi-intel__dimension-grid small, .sfi-intel__route-grid small { color: var(--muted); font-size: 8px; line-height: 1.5; }
.sfi-intel__property.is-missing { opacity: .58; }
.sfi-intel__route-grid > div.is-selected { border-color: rgba(155,124,255,.65); background: rgba(155,124,255,.10); }
.sfi-intel__notice { margin-top: 12px; padding: 10px; border-left: 2px solid var(--orange); background: rgba(229,164,95,.07); color: #d8b98f; font-size: 10px; line-height: 1.5; }
.sfi-intel__list { margin: 8px 0; padding-left: 18px; color: var(--muted); }
.sfi-intel__list li { margin: 7px 0; line-height: 1.5; }
.sfi-intel__preferences { display: grid; gap: 14px; }
.sfi-intel__preferences > p { color: var(--muted); }
.sfi-intel__form-grid, .sfi-intel__outcome-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin: 16px 0; }
.sfi-intel label { display: grid; gap: 6px; color: var(--muted); font-size: 9px; letter-spacing: .06em; }
.sfi-intel input, .sfi-intel textarea, .sfi-intel select { width: 100%; border: 1px solid var(--line-strong); border-radius: 9px; background: #09090c; color: var(--text); padding: 10px; }
.sfi-intel textarea { min-height: 90px; resize: vertical; }
@media (max-width: 1050px) {
  .sfi-production { grid-template-columns: 86px minmax(0,1fr); }
  .sfi-production__sidebar { padding: 20px 10px; }
  .sfi-production__brand div, .sfi-production__side-kicker, .sfi-production__sidebar nav button div, .sfi-production__side-status p { display: none; }
  .sfi-production__sidebar nav button { grid-template-columns: 1fr; text-align: center; }
  .sfi-production__header { grid-template-columns: 1fr auto; }
  .sfi-production__header-object, .sfi-production__header-state { display: none !important; }
  .sfi-production__object-hero { grid-template-columns: 1fr; }
  .sfi-production__object-orbit { border-left: 0; border-top: 1px solid var(--line); }
}
@media (max-width: 760px) {
  .sfi-production { display: block; }
  .sfi-production__sidebar { position: sticky; height: auto; top: 0; flex-direction: row; align-items: center; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--line); padding: 8px; }
  .sfi-production__brand, .sfi-production__side-status { display: none; }
  .sfi-production__sidebar nav { display: flex; }
  .sfi-production__sidebar nav button { min-width: 58px; padding: 8px; }
  .sfi-production__header { top: 49px; padding: 12px 14px; }
  .sfi-production__header-title span { display: none; }
  .sfi-production__header-title strong { font-size: 10px; }
  .sfi-production__stage { padding: 16px; }
  .sfi-production__grid-2, .sfi-intel__grid-2, .sfi-intel__hero-grid, .sfi-intel__projection-grid, .sfi-intel__form-grid, .sfi-intel__outcome-grid, .sfi-production__trace-grid { grid-template-columns: 1fr; }
  .sfi-production__object-hero > div:first-child { padding: 28px 20px; }
  .sfi-production__object-hero h1 { font-size: 38px; }
  .sfi-intel__score-card > strong { font-size: 64px; }
}
`;

'use client';

import { useMemo, useState } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioEvaluationStrip } from './StudioEvaluationStrip';
import { StudioFooterTransport } from './StudioFooterTransport';
import { StudioHeader } from './StudioHeader';
import { StudioObjectIntake } from './StudioObjectIntake';
import { StudioRightRail } from './StudioRightRail';
import { StudioPixiStage, type StudioPixiStageVariant } from './pixi/StudioPixiStage';
import { StudioSidebar, type StudioProductionScreen } from './StudioSidebar';

function metric(value: number | null | undefined) {
  return value === null || value === undefined ? 'SIN DATO' : value.toFixed(2);
}

function pct(value: number | null | undefined) {
  return value === null || value === undefined ? 'SIN DATO' : `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
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

function PixiPanel({ state, variant, title, subtitle }: { state: StudioProductionState; variant: StudioPixiStageVariant; title: string; subtitle: string }) {
  return (
    <section className="sfi-production__live-panel">
      <header>
        <div>
          <span>{title}</span>
          <strong>{subtitle}</strong>
        </div>
        <em>{state.activeObject.readiness.toUpperCase()}</em>
      </header>
      <StudioPixiStage state={state} variant={variant} label={title} />
    </section>
  );
}

function ObjectSummary({ state, onOpenIntake }: { state: StudioProductionState; onOpenIntake: () => void }) {
  return (
    <Panel title="OBJETO A EVALUAR" action={<button type="button" onClick={onOpenIntake}>CARGAR</button>}>
      <div className="sfi-production__object-card">
        <strong>{state.activeObject.title}</strong>
        <span>{state.activeObject.type.toUpperCase()} / {state.activeObject.status.toUpperCase()}</span>
        <p>{state.activeObject.sourceUri ?? 'NO_SOURCE_URI'}</p>
      </div>
    </Panel>
  );
}

function OverviewScreen({ state, onOpenIntake }: { state: StudioProductionState; onOpenIntake: () => void }) {
  return (
    <>
      <PixiPanel state={state} variant="overview" title="OVERVIEW / OBJECT FIELD" subtitle="CAMPO VIVO DEL OBJETO" />
      <div className="sfi-production__grid sfi-production__grid--overview">
        <ObjectSummary state={state} onOpenIntake={onOpenIntake} />
        <Panel title="READINESS">
          <div className="sfi-production__metric-list">
            <span>OBJECT <b>{state.activeObject.readiness.toUpperCase()}</b></span>
            <span>FEATURES <b>{state.objectFeatures.readiness.toUpperCase()}</b></span>
            <span>MIHM <b>{metric(state.mihmReport.score)}</b></span>
            <span>CULTURAL LENS <b>{metric(state.culturalLens?.confidence)}</b></span>
          </div>
        </Panel>
        <Panel title="PIPELINE STATE">
          <ol className="sfi-production__pipeline">
            {['OBJECT', 'ANALYSIS', 'LAYERS', 'HYPOTHESIS', 'PMV', 'VALIDATION', 'ARCHIVE'].map((item, index) => (
              <li key={item} className={index <= (state.activeObject.id ? 2 : 0) ? 'is-live' : ''}>{item}</li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

function SessionsScreen({ state, onOpenIntake }: { state: StudioProductionState; onOpenIntake: () => void }) {
  return (
    <div className="sfi-production__screen-grid">
      <Panel title="SESSION HUB" action={<a href="/api/studio/sessions">API</a>}>
        <div className="sfi-production__object-card">
          <strong>{state.session.title}</strong>
          <span>{state.session.id ?? 'NO_SESSION_ID'}</span>
          <p>{state.session.status.toUpperCase()}</p>
        </div>
      </Panel>
      <ObjectSummary state={state} onOpenIntake={onOpenIntake} />
      <Panel title="SESSION OBJECTS">
        <p>{state.activeObject.id ? state.activeObject.title : 'No hay objetos persistidos en studio_objects.'}</p>
      </Panel>
      <Panel title="SEARCH / FILTERS">
        <div className="sfi-production__filter-row">
          <button type="button">ACTIVE</button>
          <button type="button">ARCHIVE</button>
          <button type="button">FAVORITES</button>
        </div>
      </Panel>
    </div>
  );
}

function LiveDeskScreen({ state }: { state: StudioProductionState }) {
  return (
    <>
      <PixiPanel state={state} variant="waveform" title="LIVE DESK" subtitle="WAVEFORM / VECTOR SCOPE / ANOMALIAS" />
      <div className="sfi-production__grid">
        <Panel title="SIGNAL HEALTH">
          <div className="sfi-production__metric-list">
            <span>RMS <b>{metric(state.audioFeatures.rms)}</b></span>
            <span>PEAK <b>{metric(state.audioFeatures.peak)}</b></span>
            <span>CLIP RISK <b>{metric(state.audioFeatures.clippingRisk)}</b></span>
          </div>
        </Panel>
        <Panel title="INTERVENTION QUEUE" action={<a href="/api/studio/interventions/simulate">SIMULATE</a>}>
          {state.interventions.length ? state.interventions.map((item) => <p key={item.id}>{item.title}</p>) : <p>NO_VERIFIED_INTERVENTIONS</p>}
        </Panel>
      </div>
    </>
  );
}

function CompositionScreen({ state }: { state: StudioProductionState }) {
  return (
    <>
      <PixiPanel state={state} variant="timeline" title="COMPOSITION" subtitle="STRUCTURE / MOTIFS / EMOTIONAL ARC" />
      <div className="sfi-production__grid">
        <Panel title="MOTIFS">{state.textFeatures.motifs.length ? state.textFeatures.motifs.slice(0, 8).map((item) => <p key={item}>{item}</p>) : <p>MOTIF_EXTRACTION_UNAVAILABLE</p>}</Panel>
        <Panel title="HYPOTHESES">{state.hypotheses?.summary ?? 'HYPOTHESIS_ENGINE_BLOCKED_BY_MISSING_LAYERS'}</Panel>
      </div>
    </>
  );
}

function SoundDesignScreen({ state }: { state: StudioProductionState }) {
  return (
    <>
      <PixiPanel state={state} variant="spectral" title="SOUND DESIGN" subtitle="SPECTRAL CLOUD / TEXTURE CLUSTERS" />
      <div className="sfi-production__grid">
        <Panel title="TIMBRE DNA">
          <div className="sfi-production__metric-list">
            <span>SPECTRAL CENTROID <b>{metric(state.audioFeatures.spectralCentroid)}</b></span>
            <span>TEXTURE DENSITY <b>{metric(state.imageFeatures.textureDensity)}</b></span>
            <span>SEMANTIC DENSITY <b>{metric(state.textFeatures.semanticDensity)}</b></span>
          </div>
        </Panel>
        <Panel title="CULTURAL FIT">{state.culturalLens?.dominantSignal ?? 'NO_DOMINANT_SIGNAL'}</Panel>
      </div>
    </>
  );
}

function ArrangementsScreen({ state }: { state: StudioProductionState }) {
  return (
    <>
      <PixiPanel state={state} variant="timeline" title="ARRANGEMENTS" subtitle="DENSITY / SILENCE / TRANSITIONS" />
      <div className="sfi-production__grid">
        <Panel title="LAYERS">{state.objectFeatures.layers.map((layer) => <p key={layer.id}>{layer.label} / {pct(layer.weight)}</p>)}</Panel>
        <Panel title="TRANSITIONS"><p>TRANSITION_SCORING_NOT_CONNECTED</p></Panel>
      </div>
    </>
  );
}

function MixConsoleScreen({ state }: { state: StudioProductionState }) {
  return (
    <>
      <PixiPanel state={state} variant="vector" title="MIX CONSOLE" subtitle="METERS / ROUTING / PHASE" />
      <div className="sfi-production__faders">
        {state.objectFeatures.layers.length ? state.objectFeatures.layers.map((layer) => (
          <div key={layer.id}>
            <span>{layer.label}</span>
            <i style={{ height: `${Math.max(12, Math.round((layer.weight ?? 0.05) * 100))}%` }} />
            <b>{pct(layer.weight)}</b>
          </div>
        )) : <p>NO_STEMS_CONNECTED</p>}
      </div>
    </>
  );
}

function MasteringScreen({ state }: { state: StudioProductionState }) {
  return (
    <div className="sfi-production__screen-grid">
      <PixiPanel state={state} variant="vector" title="MASTERING" subtitle="LOUDNESS / STEREO / EXPORT READINESS" />
      <Panel title="MASTER READINESS">
        <div className="sfi-production__metric-list">
          <span>LUFS <b>{metric(state.audioFeatures.lufs)}</b></span>
          <span>DYNAMIC RANGE <b>{metric(state.audioFeatures.dynamicRange)}</b></span>
          <span>SIGNOFF <b>{state.exports.signoffReadiness.toUpperCase()}</b></span>
        </div>
      </Panel>
    </div>
  );
}

function NeuralAudioGraphScreen({ state, onOpenIntake }: { state: StudioProductionState; onOpenIntake: () => void }) {
  return (
    <>
      <PixiPanel state={state} variant="graph" title="NEURAL AUDIO GRAPH" subtitle="CAUSAL GRAPH / FEATURE LAYERS / MIHM LINKS" />
      <div className="sfi-production__grid">
        <Panel title="NODE INSPECTOR" action={<button type="button" onClick={onOpenIntake}>INTAKE</button>}>
          {state.objectFeatures.graph.nodes.map((node) => <p key={node.id}>{node.label} / {node.layer} / {metric(node.value)}</p>)}
          {!state.objectFeatures.graph.nodes.length && <p>GRAPH_REQUIRES_OBJECT_FEATURES</p>}
        </Panel>
        <Panel title="CAUSAL EXPLANATION">
          {state.objectFeatures.graph.edges.map((edge) => <p key={`${edge.from}-${edge.to}`}>{edge.from} - {edge.to} / {metric(edge.weight)}</p>)}
          {!state.objectFeatures.graph.edges.length && <p>NO_WEIGHTED_EDGES</p>}
        </Panel>
      </div>
    </>
  );
}

function MemoryArchivesScreen({ state }: { state: StudioProductionState }) {
  return (
    <>
      <PixiPanel state={state} variant="archive" title="MEMORY / ARCHIVES" subtitle="LONGITUDINAL TRACE / EVIDENCE DOTS" />
      <div className="sfi-production__grid">
        <Panel title="ARCHIVE EVENTS" action={<a href="/api/studio/archive">API</a>}>
          {state.archive.events.length ? state.archive.events.map((event) => <p key={event.id}>{event.label}</p>) : <p>NO_ARCHIVE_EVENTS</p>}
        </Panel>
        <Panel title="EVIDENCE INTEGRITY">{state.archive.integrity.toUpperCase()}</Panel>
      </div>
    </>
  );
}

function DeliverablesScreen({ state }: { state: StudioProductionState }) {
  return (
    <div className="sfi-production__screen-grid">
      <Panel title="EXPORT PACKAGES" action={<a href="/api/studio/deliverables">API</a>}>
        {state.exports.packages.length ? state.exports.packages.map((item) => <p key={item.id}>{item.label}</p>) : <p>NO_EXPORT_PACKAGES</p>}
      </Panel>
      <Panel title="SIGNOFF READINESS">{state.exports.signoffReadiness.toUpperCase()}</Panel>
      <Panel title="BUILD EXPORT" action={<a href="/api/studio/exports/build">POST</a>}>
        <p>Export builder returns blocked until evidence bundle and destination are connected.</p>
      </Panel>
    </div>
  );
}

function SettingsScreen({ state }: { state: StudioProductionState }) {
  return (
    <div className="sfi-production__screen-grid">
      <Panel title="PROVENANCE">{state.provenance.basedOn.map((item) => <p key={item}>{item}</p>)}</Panel>
      <Panel title="DEGRADED SOURCES">{state.degradedSources.length ? state.degradedSources.map((item) => <p key={item}>{item}</p>) : <p>NONE_DECLARED</p>}</Panel>
      <Panel title="LIMITS">{state.provenance.limits.map((item) => <p key={item}>{item}</p>)}</Panel>
    </div>
  );
}

function Screen({ active, state, onOpenIntake }: { active: StudioProductionScreen; state: StudioProductionState; onOpenIntake: () => void }) {
  switch (active) {
    case 'sessions': return <SessionsScreen state={state} onOpenIntake={onOpenIntake} />;
    case 'live-desk': return <LiveDeskScreen state={state} />;
    case 'composition': return <CompositionScreen state={state} />;
    case 'sound-design': return <SoundDesignScreen state={state} />;
    case 'arrangements': return <ArrangementsScreen state={state} />;
    case 'mix-console': return <MixConsoleScreen state={state} />;
    case 'mastering': return <MasteringScreen state={state} />;
    case 'neural-audio-graph': return <NeuralAudioGraphScreen state={state} onOpenIntake={onOpenIntake} />;
    case 'memory-archives': return <MemoryArchivesScreen state={state} />;
    case 'deliverables': return <DeliverablesScreen state={state} />;
    case 'settings': return <SettingsScreen state={state} />;
    case 'overview':
    default:
      return <OverviewScreen state={state} onOpenIntake={onOpenIntake} />;
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
      <StudioRightRail state={state} />
      <StudioObjectIntake open={intakeOpen} onClose={() => setIntakeOpen(false)} />
      <style jsx global>{css}</style>
    </main>
  );
}

const productionCss = `
.sfi-production {
  --bg: #050309;
  --panel: rgba(8, 5, 14, .92);
  --line: rgba(186, 92, 255, .28);
  --line2: rgba(69, 240, 255, .18);
  --pink: #ff79d9;
  --purple: #ba5cff;
  --cyan: #45f0ff;
  --orange: #ff9f43;
  --green: #7cffb2;
  --text: #f2e9ff;
  --muted: #9584a7;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 280px;
  gap: 10px;
  padding: 10px;
  background:
    radial-gradient(circle at 50% 30%, rgba(186, 92, 255, .18), transparent 42%),
    radial-gradient(circle at 78% 58%, rgba(69, 240, 255, .09), transparent 34%),
    var(--bg);
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.sfi-production * { box-sizing: border-box; }
.sfi-production button, .sfi-production a {
  border: 1px solid var(--line);
  background: rgba(255, 121, 217, .06);
  color: var(--text);
  text-decoration: none;
  font: 700 10px ui-monospace, monospace;
  letter-spacing: .12em;
  text-transform: uppercase;
  cursor: pointer;
}
.sfi-production__sidebar,
.sfi-production__right-rail,
.sfi-production__header,
.sfi-production__panel,
.sfi-production__live-panel,
.sfi-production__transport,
.sfi-production__evaluation-strip {
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(15, 7, 22, .95), rgba(5, 3, 9, .94));
  box-shadow: inset 0 0 40px rgba(186, 92, 255, .045);
}
.sfi-production__sidebar { display: grid; grid-template-rows: auto 1fr auto; min-height: calc(100vh - 20px); }
.sfi-production__brand { display: flex; align-items: center; gap: 12px; padding: 18px; border-bottom: 1px solid var(--line); }
.sfi-production__mark { width: 32px; height: 32px; border: 1px solid var(--pink); border-radius: 50%; box-shadow: 0 0 24px rgba(255, 121, 217, .38); }
.sfi-production__brand strong { display: block; font-size: 20px; letter-spacing: .18em; }
.sfi-production__brand em { display: block; color: var(--pink); font-style: normal; font-size: 10px; letter-spacing: .32em; }
.sfi-production__sidebar nav { display: grid; align-content: start; gap: 4px; padding: 12px; }
.sfi-production__sidebar nav button { width: 100%; padding: 11px 12px; text-align: left; color: var(--muted); }
.sfi-production__sidebar nav button.is-active { color: var(--cyan); border-color: var(--cyan); background: rgba(69, 240, 255, .08); }
.sfi-production__side-status { padding: 14px; border-top: 1px solid var(--line); }
.sfi-production__side-status span, .sfi-production__panel header span, .sfi-production__right-rail span, .sfi-production__transport span { color: var(--muted); font-size: 9px; letter-spacing: .18em; text-transform: uppercase; }
.sfi-production__side-status strong { display: block; margin-top: 8px; color: var(--green); }
.sfi-production__side-status p, .sfi-production__panel p, .sfi-production__right-rail p { color: var(--muted); font-size: 10px; line-height: 1.55; }
.sfi-production__main { display: grid; grid-template-rows: auto minmax(430px, 1fr) auto auto; gap: 10px; min-width: 0; }
.sfi-production__header { display: grid; grid-template-columns: 1fr 1.3fr auto; gap: 16px; padding: 14px 18px; align-items: center; }
.sfi-production__header span { display: block; color: var(--muted); font-size: 9px; letter-spacing: .2em; }
.sfi-production__header strong { display: block; margin-top: 5px; color: var(--pink); font-size: 12px; letter-spacing: .16em; }
.sfi-production__header-state { text-align: right; }
.sfi-production__header-state em { display: block; color: var(--cyan); font-style: normal; font-size: 10px; margin-top: 5px; }
.sfi-production__live-panel { min-height: 430px; display: grid; grid-template-rows: auto 1fr; }
.sfi-production__live-panel > header { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.sfi-production__live-panel > header span { display: block; color: var(--pink); font-size: 10px; letter-spacing: .22em; }
.sfi-production__live-panel > header strong { display: block; color: var(--muted); font-size: 9px; letter-spacing: .18em; margin-top: 4px; }
.sfi-production__live-panel > header em { color: var(--green); font-style: normal; font-size: 10px; letter-spacing: .16em; }
.sfi-production__pixi-stage { position: relative; min-height: 390px; overflow: hidden; background: radial-gradient(circle at 50% 50%, rgba(186, 92, 255, .18), transparent 48%); }
.sfi-production__pixi-host, .sfi-production__pixi-host canvas, .sfi-production__pixi-fallback { position: absolute; inset: 0; width: 100%; height: 100%; }
.sfi-production__pixi-host { z-index: 2; }
.sfi-production__pixi-fallback { z-index: 1; opacity: .75; }
.sfi-production__pixi-fallback circle { fill: var(--pink); opacity: .55; }
.sfi-production__pixi-fallback text { fill: var(--muted); font-size: 5px; letter-spacing: .25em; }
.sfi-production__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
.sfi-production__grid--overview { grid-template-columns: 1.25fr .9fr 1fr; }
.sfi-production__screen-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-content: start; }
.sfi-production__panel { min-height: 140px; padding: 14px; }
.sfi-production__panel header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.sfi-production__panel header a, .sfi-production__panel header button { padding: 7px 9px; }
.sfi-production__object-card strong { display: block; color: var(--text); font-size: 18px; letter-spacing: .08em; text-transform: uppercase; }
.sfi-production__object-card span { display: block; color: var(--cyan); margin-top: 10px; font-size: 10px; letter-spacing: .16em; }
.sfi-production__metric-list { display: grid; gap: 8px; }
.sfi-production__metric-list span { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--line2); padding-bottom: 6px; color: var(--muted); font-size: 10px; }
.sfi-production__metric-list b { color: var(--cyan); }
.sfi-production__pipeline { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.sfi-production__pipeline li { padding: 7px 9px; border: 1px solid var(--line2); color: var(--muted); font-size: 10px; letter-spacing: .12em; }
.sfi-production__pipeline li.is-live { color: var(--green); border-color: rgba(124, 255, 178, .32); }
.sfi-production__filter-row { display: flex; gap: 8px; flex-wrap: wrap; }
.sfi-production__filter-row button { padding: 9px 10px; }
.sfi-production__faders { display: grid; grid-template-columns: repeat(8, minmax(64px, 1fr)); gap: 8px; min-height: 260px; padding: 14px; border: 1px solid var(--line); background: var(--panel); align-items: end; }
.sfi-production__faders div { height: 230px; display: grid; grid-template-rows: auto 1fr auto; justify-items: center; gap: 8px; color: var(--muted); font-size: 9px; }
.sfi-production__faders i { width: 18px; align-self: end; background: linear-gradient(180deg, var(--pink), var(--cyan)); box-shadow: 0 0 24px rgba(255, 121, 217, .35); }
.sfi-production__right-rail { display: grid; gap: 8px; align-content: start; padding: 8px; min-height: calc(100vh - 20px); }
.sfi-production__right-rail section { border: 1px solid var(--line2); padding: 12px; background: rgba(5, 3, 9, .58); }
.sfi-production__right-rail strong { display: block; margin: 10px 0; color: var(--cyan); font-size: 22px; letter-spacing: .08em; }
.sfi-production__right-rail a { display: block; margin-top: 8px; padding: 8px; }
.sfi-production__right-rail b { color: var(--orange); font-size: 9px; }
.sfi-production__transport { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; padding: 12px; align-items: center; }
.sfi-production__transport strong, .sfi-production__transport a { display: block; margin-top: 5px; color: var(--cyan); }
.sfi-production__evaluation-strip { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1px; padding: 8px; }
.sfi-production__evaluation-strip div { border: 1px solid var(--line2); padding: 9px; min-width: 0; }
.sfi-production__evaluation-strip span, .sfi-production__evaluation-strip em { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--muted); font-size: 8px; letter-spacing: .12em; font-style: normal; }
.sfi-production__evaluation-strip strong { display: block; margin: 6px 0; color: var(--pink); font-size: 12px; }
.sfi-production__intake { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(0, 0, 0, .72); backdrop-filter: blur(8px); }
.sfi-production__intake-panel { position: relative; width: min(520px, calc(100vw - 32px)); border: 1px solid var(--line); background: rgba(8, 5, 14, .98); padding: 26px; box-shadow: 0 0 90px rgba(186, 92, 255, .24); }
.sfi-production__intake-panel input { display: none; }
.sfi-production__intake-panel h2 { color: var(--pink); letter-spacing: .12em; }
.sfi-production__intake-panel p { color: var(--muted); line-height: 1.6; }
.sfi-production__intake-panel button:not(.sfi-production__icon-button) { width: 100%; padding: 16px; margin-top: 14px; }
.sfi-production__icon-button { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; }
@media (max-width: 1180px) {
  .sfi-production { display: block; padding: 8px; }
  .sfi-production__sidebar, .sfi-production__right-rail { display: none; }
  .sfi-production__main { display: grid; gap: 8px; }
  .sfi-production__header, .sfi-production__grid, .sfi-production__grid--overview, .sfi-production__screen-grid, .sfi-production__transport, .sfi-production__evaluation-strip { grid-template-columns: 1fr; }
  .sfi-production__live-panel { min-height: 360px; }
  .sfi-production__pixi-stage { min-height: 320px; }
  .sfi-production__faders { grid-template-columns: repeat(3, minmax(64px, 1fr)); }
}
`;

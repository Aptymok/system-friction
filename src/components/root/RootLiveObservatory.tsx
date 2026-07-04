'use client';

import { useMemo, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';
import type { RootHudGovernanceSnapshot } from '@/lib/root/hudGovernance';
import { RootOperationalTrigger } from './shell';
import { asRecord, buildContextItems, pct, statusTone, text, toDataSnapshot, type DataSnapshot, type PanelItem, type Tone } from './rootConsoleAdapters';
import { ROOT_FUNCTIONS_CATALOG } from './rootFunctionsCatalog';
import { buildRootExpansionModel } from './rootExpansionModel';
import type { RootViewId } from './rootViews';

type Props = { initialState: AgenticRootState; worldVector: unknown; governance?: RootHudGovernanceSnapshot };
type NavItem = { id: RootViewId; label: string; short: string };

const NAV: NavItem[] = [
  { id: 'institute-state', label: 'OBSERVE', short: 'Live topology' },
  { id: 'prediction-registry', label: 'PREDICT', short: 'Prediction registry' },
  { id: 'agentic-operations', label: 'OPERATE', short: 'Agent lattice' },
  { id: 'founder-governance', label: 'GOVERN', short: 'R18 control' },
  { id: 'institute-functions', label: 'MODEL', short: 'Function map' },
  { id: 'expansion-investigation', label: 'RESEARCH', short: 'Opportunity field' },
];

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const fmt = (value: number) => Number.isFinite(value) ? value.toLocaleString('en-US') : '0';
const sourceText = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : 'DATA GATED';

function valueFrom(item: unknown, keys: string[], fallback: string) {
  const record = asRecord(item);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function probabilityFrom(item: unknown, fallback = 0) {
  const record = asRecord(item);
  const probabilities = asRecord(record.probabilities);
  const direct = Number(record.confidence ?? record.probability ?? probabilities.p_case_value ?? probabilities.p_response ?? fallback);
  return clamp(Number.isFinite(direct) ? direct : fallback);
}

function toneClass(tone: Tone) { return `tone-${tone}`; }

function Panel({ title, meta, children }: { title: string; meta?: string | number; children: React.ReactNode }) {
  return <section className="rl-panel"><header><b>{title}</b>{meta !== undefined ? <span>{meta}</span> : null}</header>{children}</section>;
}

function Row({ label, value, tone = 'muted' }: { label: string; value: string | number; tone?: Tone }) {
  return <div className="rl-row"><span>{label}</span><b className={toneClass(tone)}>{value}</b></div>;
}

function Bar({ label, value, source }: { label: string; value: number; source: string }) {
  const bounded = clamp(value);
  return <div className="rl-bar" title={source}><span>{label}</span><i><em style={{ width: `${Math.round(bounded * 100)}%` }} /></i><b>{pct(bounded)}</b></div>;
}

function MiniSpark({ tone = 'ok' }: { tone?: Tone }) {
  const color = tone === 'bad' ? '#ff5f7e' : tone === 'watch' ? '#d8b651' : tone === 'ok' ? '#6fe6cf' : '#6e7384';
  const points = Array.from({ length: 28 }, (_, index) => `${index * 4},${18 - Math.sin(index * .7) * 7 - Math.cos(index * .19) * 4}`).join(' ');
  return <svg className="rl-spark" viewBox="0 0 108 28" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="1" /><line x1="0" y1="22" x2="108" y2="22" stroke="rgba(216,182,81,.18)" /></svg>;
}

function CentralTopology({ data, activeView }: { data: DataSnapshot; activeView: RootViewId }) {
  const confidence = data.confidenceAvailable ? data.confidence : .18;
  const pressure = clamp((data.predictions.length + data.queue.length + data.warnings.length) / 32);
  const volume = Math.max(1, data.evidence.length + data.graphNodes.length + data.amvItems.length + data.predictions.length);
  const wave = useMemo(() => Array.from({ length: 128 }, (_, index) => {
    const x = 20 + index * 7.5;
    const base = 365 + Math.sin(index * .15 + confidence * 3) * 34 + Math.sin(index * .041 + volume) * 62;
    const heat = Math.abs(Math.sin(index * .23 + pressure * 2));
    return { x, y: base - heat * 46, h: 18 + heat * (120 + pressure * 90) };
  }), [confidence, pressure, volume]);
  const line = wave.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const lowerLine = wave.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${(point.y + 82 + Math.sin(index * .12) * 22).toFixed(1)}`).join(' ');
  const funnels = Array.from({ length: 9 }, (_, index) => ({ cx: 90 + index * 98, top: 70 + (index % 3) * 12, bottom: 205 + Math.sin(index) * 18, spread: 34 + (index % 4) * 10 }));
  const regions = [
    { x: 92, y: 120, title: 'WORLD VECTORS', body: data.confidenceAvailable ? pct(data.confidence) : 'DATA GATED', color: '#6fe6cf' },
    { x: 450, y: 98, title: 'SYSTEM FRICTION TOPOLOGY', body: `${fmt(volume)} source units`, color: '#f45bc7' },
    { x: 810, y: 118, title: 'OUTCOME SPACE', body: `${data.queue.length} queued`, color: '#d8b651' },
    { x: 94, y: 300, title: 'EVIDENCE STREAMS', body: `${data.evidence.length} evidence`, color: '#8bd27c' },
    { x: 570, y: 320, title: 'PREDICTION FIELD', body: `${data.predictions.length} entries`, color: '#f45bc7' },
    { x: 755, y: 396, title: 'AGENTIC OPERATIONS', body: `${data.agentCount} providers`, color: '#ff8a3c' },
  ];
  return (
    <section className="rl-central" aria-label="SFI ROOT live topology">
      <div className="rl-central-title"><b>{activeView === 'prediction-registry' ? 'PREDICTION REGISTRY FIELD' : 'SYSTEM FRICTION TOPOLOGY'}</b><span>DERIVED VISUAL · sources are live props</span></div>
      <svg viewBox="0 0 1000 560" className="rl-topology" role="img" aria-label="ROOT live observatory topology">
        <defs>
          <linearGradient id="rlWave" x1="0" x2="1"><stop offset="0%" stopColor="#ff8a3c" /><stop offset="45%" stopColor="#ff4f9a" /><stop offset="80%" stopColor="#f45bc7" /><stop offset="100%" stopColor="#7b64ff" /></linearGradient>
          <linearGradient id="rlCyan" x1="0" x2="1"><stop offset="0%" stopColor="#66fff0" stopOpacity=".1" /><stop offset="50%" stopColor="#9ffff6" stopOpacity=".55" /><stop offset="100%" stopColor="#66fff0" stopOpacity=".1" /></linearGradient>
          <filter id="rlGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <pattern id="rlGrid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="rgba(216,182,81,.12)" strokeWidth=".6" /></pattern>
        </defs>
        <rect width="1000" height="560" fill="#040506" /><rect width="1000" height="560" fill="url(#rlGrid)" opacity=".34" />
        {funnels.map((funnel, i) => <g key={i} opacity=".72">{Array.from({ length: 9 }, (_, strand) => { const start = f.cx - f.spread + strand * (f.spread * 2 / 8); return <path key={strand} d={`M${start} ${f.top} C ${f.cx - f.spread * .45} ${f.bottom - 110}, ${f.cx + f.spread * .45} ${f.bottom - 72}, ${f.cx} ${f.bottom}`} fill="none" stroke="url(#rlCyan)" strokeWidth=".75" />; })}<circle cx={f.cx} cy={f.bottom} r="2.2" fill="#8ffaf1" /></g>)}
        {wave.map((point, index) => <g key={index}><line x1={point.x} y1={point.y} x2={point.x} y2={point.y - point.h} stroke={index % 3 ? '#ff4f9a' : '#ff8a3c'} strokeOpacity={.16 + clamp(point.h / 220) * .52} strokeWidth="1" /><circle cx={point.x} cy={point.y - point.h} r={index % 11 === 0 ? 2.2 : .85} fill={index % 4 ? '#ff4f9a' : '#ffb15c'} opacity=".9" /></g>)}
        <path d={`${line} L 980 560 L 20 560 Z`} fill="url(#rlWave)" opacity=".16" />
        <path d={line} fill="none" stroke="url(#rlWave)" strokeWidth="4" strokeLinecap="square" filter="url(#rlGlow)" />
        <path d={lowerLine} fill="none" stroke="#7b64ff" strokeWidth="1.2" opacity=".65" />
        {Array.from({ length: 420 }, (_, index) => <circle key={index} cx={(index * 37) % 1000} cy={70 + ((index * 67) % 420)} r={index % 17 === 0 ? 1.8 : .72} fill={index % 5 === 0 ? '#d8b651' : index % 3 === 0 ? '#6fe6cf' : '#ff4f9a'} opacity={.18 + (index % 7) * .06} />)}
        {regions.map((region) => <g key={region.title}><text x={region.x} y={region.y} fill={region.color} fontSize="11" fontFamily="monospace" letterSpacing="2">{region.title}</text><text x={region.x} y={region.y + 18} fill="#d7d0bd" fontSize="10" fontFamily="monospace">{region.body}</text><line x1={region.x - 10} y1={region.y + 6} x2={region.x - 42} y2={region.y + 36} stroke={region.color} strokeOpacity=".55" /></g>)}
      </svg>
    </section>
  );
}

function MiniModule({ title, value, sub, tone = 'ok' }: { title: string; value: string | number; sub: string; tone?: Tone }) {
  return <section className="rl-module"><b>{title}</b><MiniSpark tone={tone} /><div><span>{sub}</span><strong className={toneClass(tone)}>{value}</strong></div></section>;
}

function ListItems({ items, empty }: { items: PanelItem[]; empty: string }) {
  if (!items.length) return <p className="rl-empty">{empty}</p>;
  return <div className="rl-list">{items.slice(0, 8).map((item) => <article key={item.id}><span>{item.label}</span><b className={toneClass(statusTone(item.status))}>{item.status}</b><small>{item.body}</small></article>)}</div>;
}

export default function RootLiveObservatory({ initialState, worldVector, governance }: Props) {
  const [activeView, setActiveView] = useState<RootViewId>('institute-state');
  const data = toDataSnapshot(initialState, worldVector);
  const registry = asRecord(initialState.predictionRegistry);
  const contextItems = useMemo(() => buildContextItems(activeView, data), [activeView, data]);
  const expansion = buildRootExpansionModel({ confidence: data.confidence, amvCount: data.amvItems.length, predictionCount: data.predictions.length, evidenceCount: data.evidence.length });
  const predictionRows = data.predictions.slice(0, 8);
  const worldStatus = sourceText(data.worldObservation.status ?? data.worldAgent.current_signal_state);
  const generatedAt = text(initialState.generated_at, 'not_available');
  const governanceTone: Tone = governance?.acpStatus === 'active' ? 'ok' : governance?.acpStatus === 'blind' ? 'bad' : 'watch';
  const healthTone: Tone = data.warnings.length ? 'watch' : data.confidenceAvailable ? 'ok' : 'bad';
  const selected = contextItems[0];
  const nav = NAV.find((item) => item.id === activeView) ?? NAV[0];
  return (
    <main className="rl-root">
      <header className="rl-topbar">
        <div className="rl-brand"><strong>ROOT</strong><span>SYSTEM FRICTION INSTITUTE<br />OBSERVATORY CONSOLE</span></div>
        <nav>{NAV.map((item) => <button key={item.id} type="button" className={item.id === activeView ? 'active' : ''} onClick={() => setActiveView(item.id)}><b>{item.label}</b><span>{item.short}</span></button>)}</nav>
        <div className="rl-state"><span>INSTITUTE STATE</span><b className={toneClass(healthTone)}>{worldStatus}</b><i>{generatedAt}</i><strong>SFI</strong></div>
      </header>

      <section className="rl-grid">
        <aside className="rl-left">
          <Panel title="PREDICTION REGISTRY" meta={`${data.predictions.length} LIVE`}>
            <div className="rl-predictions">{predictionRows.length ? predictionRows.map((item, index) => <div key={index}><span>{valueFrom(item, ['hypothesis_id', 'id', 'title'], `PR-${String(index + 1).padStart(4, '0')}`)}</span><em>{valueFrom(item, ['prediction', 'summary', 'status'], 'observed')}</em><b>{pct(probabilityFrom(item, data.confidence))}</b></div>) : <p className="rl-empty">DATA GATED: no prediction entries returned.</p>}</div>
          </Panel>
          <Panel title="EVIDENCE STREAMS" meta="LIVE SOURCES">
            <Bar label="Evidence" value={clamp(data.evidence.length / Math.max(1, data.evidence.length + data.predictions.length))} source="initialState.neuralGraph.evidence.length" />
            <Bar label="Predictions" value={clamp(data.predictions.length / 12)} source="initialState.predictionRegistry.entries.length" />
            <Bar label="AMV Memory" value={clamp(data.amvItems.length / 16)} source="initialState.amv.items.length" />
            <Bar label="Agent Capacity" value={clamp(data.agentCount / 5)} source="initialState.systemHealth.llmProvidersAvailable" />
            <Bar label="Warning Load" value={clamp(data.warnings.length / 8)} source="initialState.systemHealth.warnings.length" />
          </Panel>
          <Panel title="WORLD VECTOR LAYERS" meta="GLOBAL">
            <Row label="World signal" value={data.confidenceAvailable ? pct(data.confidence) : 'DATA GATED'} tone={healthTone} />
            <Row label="Graph nodes" value={data.graphNodes.length} tone={data.graphNodes.length ? 'ok' : 'watch'} />
            <Row label="Evidence" value={data.evidence.length} tone={data.evidence.length ? 'ok' : 'watch'} />
            <Row label="AMV" value={data.amvItems.length} tone={data.amvItems.length ? 'ok' : 'watch'} />
            <Row label="Queue" value={data.queue.length} tone={data.queue.length ? 'watch' : 'muted'} />
          </Panel>
          <Panel title="SYSTEM HEALTH" meta={data.warnings.length ? 'WATCH' : 'STABLE'}>
            <div className="rl-orb"><span /><i /><b>ROOT</b></div>
            <Row label="Signal integrity" value={data.confidenceAvailable ? pct(data.confidence) : 'GATED'} tone={healthTone} />
            <Row label="Prediction registry" value={asRecord(registry.health).ok === true ? 'LIVE' : 'DEGRADED'} tone={asRecord(registry.health).ok === true ? 'ok' : 'watch'} />
            <Row label="ACP" value={governance?.acpStatus ?? 'degraded'} tone={governanceTone} />
          </Panel>
          <Panel title="OPERATIONAL STATUS" meta="ROOT">
            <Row label="Ingest" value={data.evidence.length ? 'LIVE' : 'PENDING'} tone={data.evidence.length ? 'ok' : 'watch'} />
            <Row label="Models" value={data.agentCount ? 'LIVE' : 'GATED'} tone={data.agentCount ? 'ok' : 'bad'} />
            <Row label="Predictions" value={data.predictions.length ? 'LIVE' : 'PENDING'} tone={data.predictions.length ? 'ok' : 'watch'} />
            <Row label="Governance" value={governance?.sourceState ?? 'missing'} tone={governanceTone} />
            <RootOperationalTrigger job={data.confidenceAvailable ? 'reports' : 'all'} compact />
          </Panel>
        </aside>

        <section className="rl-center">
          <CentralTopology data={data} activeView={activeView} />
          <section className="rl-modules">
            <MiniModule title="INGEST" value={data.evidence.length} sub="evidence" tone={data.evidence.length ? 'ok' : 'watch'} />
            <MiniModule title="EVIDENCE" value={data.graphNodes.length} sub="graph nodes" tone={data.graphNodes.length ? 'ok' : 'watch'} />
            <MiniModule title="MODELS" value={data.agentCount} sub="providers" tone={data.agentCount ? 'ok' : 'bad'} />
            <MiniModule title="PREDICTIONS" value={data.predictions.length} sub="entries" tone={data.predictions.length ? 'ok' : 'watch'} />
            <MiniModule title="GOVERNANCE" value={governance?.acpStatus ?? 'missing'} sub="ACP" tone={governanceTone} />
            <MiniModule title="ACTUATION" value={data.queue.length} sub="approval pressure" tone={data.queue.length ? 'watch' : 'muted'} />
          </section>
          <section className="rl-bottom">
            <Panel title="CLUSTER EXPLORER" meta={nav.label}>
              <ListItems items={contextItems} empty="PENDING: selected source returned no rows." />
            </Panel>
            <Panel title="RELATED ENTITIES" meta="SOURCE LOCKED">
              <ListItems items={buildContextItems('institute-state', data)} empty="DATA GATED: no evidence rows returned." />
            </Panel>
            <Panel title="AGENT ACTIONS" meta="NO PARALLEL QUEUE">
              <Row label="World Vector" value={sourceText(data.worldAgent.current_signal_state)} tone={statusTone(data.worldAgent.current_signal_state)} />
              <Row label="Neural Graph" value={sourceText(data.systemHealth.graphStatus)} tone={statusTone(data.systemHealth.graphStatus)} />
              <Row label="AMV" value={sourceText(data.amv.status)} tone={statusTone(data.amv.status)} />
              <Row label="Expansion themes" value={expansion.themes.length} tone="watch" />
            </Panel>
          </section>
        </section>

        <aside className="rl-right">
          <Panel title="GOVERNANCE LAYER" meta={governance?.acpStatus ?? 'DEGRADED'}>
            <Row label="ACP last seen" value={governance?.acpLastSeenAt ?? 'not_observed'} tone={governanceTone} />
            <Row label="Blind mode" value={governance?.blindMode ? 'true' : 'false'} tone={governance?.blindMode ? 'bad' : 'ok'} />
            <Row label="Source" value={governance?.sourceState ?? 'missing'} tone={governanceTone} />
            <Row label="R18" value="NO DUPLICATED GOVERNANCE" tone="ok" />
          </Panel>
          <Panel title="SELECTED CLUSTER" meta={activeView}>
            <h2>{selected?.label ?? 'DATA GATED'}</h2>
            <p>{selected?.body ?? 'No source row returned for this view.'}</p>
            <Row label="Status" value={selected?.status ?? 'missing'} tone={selected ? statusTone(selected.status) : 'bad'} />
            <Row label="Predictions" value={data.predictions.length} tone={data.predictions.length ? 'ok' : 'watch'} />
            <Row label="Evidence" value={data.evidence.length} tone={data.evidence.length ? 'ok' : 'watch'} />
            <Row label="Warnings" value={data.warnings.length} tone={data.warnings.length ? 'watch' : 'ok'} />
          </Panel>
          <Panel title="VECTOR FIELD VIEW" meta="LIVE">
            <div className="rl-map"><i /><i /><i /><i /></div>
            <Row label="Vector stress" value={data.confidenceAvailable ? pct(1 - data.confidence) : 'DATA GATED'} tone={data.confidenceAvailable && data.confidence > .45 ? 'ok' : 'watch'} />
            <MiniSpark tone={healthTone} />
          </Panel>
          <Panel title="OUTCOME EXPLORER" meta="DERIVED">
            <Row label="Baseline" value={data.confidenceAvailable ? pct(data.confidence) : 'GATED'} tone={healthTone} />
            <Row label="Proposal pressure" value={pct(clamp(data.queue.length / 8))} tone={data.queue.length ? 'watch' : 'muted'} />
            <Row label="Warning mass" value={pct(clamp(data.warnings.length / 8))} tone={data.warnings.length ? 'watch' : 'ok'} />
            <Row label="Function catalog" value={ROOT_FUNCTIONS_CATALOG.length} tone="ok" />
          </Panel>
          <Panel title="NOTIFICATIONS" meta={`${data.warnings.length} WARNINGS`}>
            {data.warnings.length ? data.warnings.slice(0, 5).map((warning, index) => <Row key={index} label={`W-${index + 1}`} value={String(warning)} tone="watch" />) : <p className="rl-empty">No warning rows in current state.</p>}
          </Panel>
        </aside>
      </section>

      <footer className="rl-footer"><span>SYSTEM PRINCIPLES ACTIVE</span><b>HUMAN DIGNITY</b><b>PLANETARY STEWARDSHIP</b><b>EQUITY & JUSTICE</b><b>INFORMATION INTEGRITY</b><b>INSTITUTIONAL RESILIENCE</b><strong>FOUNDER GOVERNANCE · NO DUPLICATED GOVERNANCE (R18)</strong></footer>
      <style jsx>{`
        .rl-root{min-height:100vh;background:#030506;color:#d7d0bd;font-family:var(--sfi-font-mono),Consolas,monospace;letter-spacing:.04em;overflow:hidden}.rl-topbar{height:62px;display:grid;grid-template-columns:280px 1fr 360px;align-items:center;border:1px solid #3b2b14;border-left:0;border-right:0;background:#050708}.rl-brand{display:flex;align-items:center;gap:18px;padding-left:24px}.rl-brand strong{font-size:25px;letter-spacing:.32em;color:#d9a648;font-weight:500}.rl-brand span{font-size:10px;line-height:1.45;color:#d7d0bd;letter-spacing:.18em}.rl-topbar nav{height:100%;display:flex;align-items:center;justify-content:center;gap:34px}.rl-topbar button{height:42px;border:0;border-top:1px solid transparent;border-bottom:1px solid transparent;background:transparent;color:#8d877b;padding:0 18px;cursor:pointer;text-align:center;border-radius:0}.rl-topbar button b{display:block;font-size:9px;color:inherit;letter-spacing:.16em}.rl-topbar button span{display:block;margin-top:4px;font-size:7px;color:#5e5b55}.rl-topbar button.active{border-color:#d9a648;background:linear-gradient(180deg,rgba(217,166,72,.08),rgba(217,166,72,.02));color:#d9a648}.rl-state{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;justify-items:end;padding-right:25px;font-size:9px}.rl-state span,.rl-state i{color:#8d877b;font-style:normal}.rl-state strong{font-size:23px;color:#d9a648;letter-spacing:.24em}.rl-grid{display:grid;grid-template-columns:282px minmax(0,1fr) 294px;gap:8px;padding:8px;height:calc(100vh - 112px);min-height:780px}.rl-left,.rl-right{display:grid;gap:8px;align-content:start;min-width:0}.rl-center{display:grid;grid-template-rows:minmax(420px,1fr) 154px 220px;gap:8px;min-width:0}.rl-panel,.rl-module,.rl-central,.rl-footer{border:1px solid #3b2b14;background:linear-gradient(180deg,rgba(6,10,12,.98),rgba(3,5,6,.98));border-radius:0}.rl-panel header{height:29px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #2b2112;padding:0 13px}.rl-panel header b,.rl-module>b{font-size:10px;color:#d9a648;letter-spacing:.16em}.rl-panel header span{font-size:8px;color:#8d877b;text-transform:uppercase}.rl-row{min-height:23px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(217,166,72,.1);padding:0 13px}.rl-row span{font-size:9px;color:#9f988a}.rl-row b{font-size:9px;text-align:right;max-width:58%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rl-predictions{padding:9px 12px;display:grid;gap:6px}.rl-predictions div{display:grid;grid-template-columns:52px 1fr 42px;gap:10px;align-items:center}.rl-predictions span,.rl-predictions em{font-size:8px;font-style:normal;color:#d7d0bd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rl-predictions b{font-size:9px;color:#d9a648;text-align:right}.rl-bar{display:grid;grid-template-columns:112px 1fr 38px;align-items:center;gap:8px;padding:5px 13px}.rl-bar span,.rl-bar b{font-size:8px}.rl-bar i{height:1px;background:#302718;display:block}.rl-bar em{display:block;height:1px;background:linear-gradient(90deg,#6fe6cf,#d9a648,#ff4f9a);font-style:normal}.rl-orb{height:92px;position:relative;display:grid;place-items:center}.rl-orb span{width:78px;height:78px;border:1px solid #d9a648;border-radius:50%;box-shadow:0 0 30px rgba(111,230,207,.16) inset}.rl-orb i{position:absolute;width:112px;height:1px;background:#3b2b14;transform:rotate(32deg);font-style:normal}.rl-orb b{position:absolute;color:#6fe6cf;font-size:9px}.rl-central{position:relative;min-height:0;overflow:hidden}.rl-central-title{position:absolute;z-index:2;top:14px;left:18px;display:grid;gap:5px}.rl-central-title b{font-size:12px;letter-spacing:.22em;color:#d7d0bd;font-weight:500}.rl-central-title span{font-size:8px;color:#7c7568}.rl-topology{width:100%;height:100%;display:block}.rl-modules{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.rl-module{padding:12px 15px;display:grid;grid-template-rows:auto 1fr auto;min-width:0}.rl-module div{display:flex;align-items:center;justify-content:space-between}.rl-module span{font-size:8px;color:#8d877b}.rl-module strong{font-size:13px}.rl-spark{width:100%;height:48px;display:block}.rl-bottom{display:grid;grid-template-columns:1.45fr 1fr .9fr;gap:8px;min-height:0}.rl-list{padding:8px 12px;display:grid;gap:6px;max-height:178px;overflow:auto}.rl-list article{display:grid;grid-template-columns:1fr auto;gap:5px;border-bottom:1px solid rgba(217,166,72,.1);padding-bottom:5px}.rl-list span{font-size:9px;color:#d7d0bd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rl-list b{font-size:8px}.rl-list small{grid-column:1/-1;font-size:8px;color:#8d877b;line-height:1.35}.rl-right h2{font-size:14px;line-height:1.35;color:#d7d0bd;letter-spacing:.16em;margin:14px 13px 8px;font-weight:500}.rl-right p,.rl-empty{font-size:9px;line-height:1.55;color:#8d877b;margin:9px 13px}.rl-map{height:92px;margin:12px 13px;border:1px solid rgba(217,166,72,.18);position:relative;background:radial-gradient(circle at 30% 44%,rgba(217,166,72,.2),transparent 18%),radial-gradient(circle at 62% 40%,rgba(111,230,207,.13),transparent 15%),linear-gradient(90deg,transparent 49%,rgba(217,166,72,.18) 50%,transparent 51%)}.rl-map i{position:absolute;width:3px;height:3px;background:#d9a648}.rl-map i:nth-child(1){left:28%;top:45%}.rl-map i:nth-child(2){left:62%;top:38%}.rl-map i:nth-child(3){left:72%;top:56%}.rl-map i:nth-child(4){left:42%;top:62%}.rl-footer{height:42px;margin:0 8px 8px;display:grid;grid-template-columns:190px repeat(5,1fr) 370px;align-items:center;padding:0 15px}.rl-footer span{font-size:10px;color:#d9a648}.rl-footer b,.rl-footer strong{font-size:8px;color:#8d877b;font-weight:500}.rl-footer strong{justify-self:end;color:#d7d0bd}.tone-ok{color:#6fe6cf}.tone-watch{color:#d9a648}.tone-bad{color:#ff5f7e}.tone-muted{color:#8d877b}@media(max-width:1280px){.rl-grid{grid-template-columns:1fr;height:auto}.rl-left,.rl-right,.rl-bottom,.rl-modules{grid-template-columns:1fr}.rl-topbar{grid-template-columns:1fr}.rl-state{display:none}.rl-center{grid-template-rows:640px auto auto}.rl-footer{grid-template-columns:1fr;height:auto;gap:8px;padding:14px}}
      `}</style>
    </main>
  );
}

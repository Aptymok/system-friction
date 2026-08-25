'use client';

import type { SceneKey } from './scenes';
import './SceneFieldOverlay.css';

type Proposal = { status?: string; risk_level?: string; decisionClass?: 'delegable' | 'root_only'; decisionActorId?: string | null };
type Row = Record<string, any>;

type Signal = { label: string; value: string; note?: string };

const MISSIONS: Record<SceneKey, string> = {
  field: 'Dónde está cambiando el campo y qué evidencia persiste.',
  systems: 'Qué componentes, fronteras y dependencias sostienen el sistema.',
  archive: 'Qué memoria/evidencia existe, de dónde viene y dónde hay pérdida.',
  falsification: 'Qué afirmaciones siguen abiertas, qué evidencia falta y qué contradice.',
  optionality: 'Qué opciones permanecen reversibles, bloqueadas o congeladas.',
  governance: 'Qué espera decisión, qué fue autorizado y qué espera RETURN.',
  authority: 'Quién puede decidir qué y dónde existe concentración de autoridad.',
  agents: 'Qué agentes ejecutaron de verdad, cuáles están gated y cuáles degradados.',
  identity: 'Estado de CT-A01: linaje, conexión, función y validación.',
  models: 'Qué runtime/modelos participan y qué ejecución observable respalda su presencia.',
  genai: 'Cómo entra una solicitud, qué herramientas/scopes existen y dónde está el límite de ejecución.',
  root: 'Qué requiere atención, qué está bloqueado y qué puede convertirse en canon.',
};

function text(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function rootObject(live: Row | null) {
  if (!live || typeof live !== 'object') return {} as Row;
  if (live.connection && typeof live.connection === 'object') return live.connection as Row;
  if (live.runtime && typeof live.runtime === 'object') return live.runtime as Row;
  if (live.data && typeof live.data === 'object') return live.data as Row;
  return live;
}

function signals(scene: SceneKey, live: Row | null, proposals: Proposal[]): Signal[] {
  const root = rootObject(live);
  const actionable = proposals.filter((p) => ['proposed', 'waiting_evidence', 'needs_evidence'].includes(p.status ?? '')).length;
  const queued = proposals.filter((p) => p.status === 'queued').length;
  const frozen = proposals.filter((p) => p.status === 'frozen').length;
  const rootOnly = proposals.filter((p) => p.decisionClass === 'root_only').length;
  const delegable = proposals.filter((p) => p.decisionClass === 'delegable').length;
  const decidedBy = new Set(proposals.map((p) => p.decisionActorId).filter(Boolean)).size;

  if (scene === 'identity') return [
    { label: 'LINEAGE', value: `${text(root.subjectId)} · ${text(root.lineageId)}`, note: text(root.lineage?.chainIntegrity, 'sin lectura') },
    { label: 'CONNECTION', value: text(root.connectionState), note: text(root.functionState) },
    { label: 'EXECUTION', value: text(root.observationState), note: `runs ${text(root.methodLab?.runCount, '0')}` },
    { label: 'VALIDATION', value: text(root.validationState), note: text(root.nextRequired) },
  ];

  if (scene === 'agents' || scene === 'models') {
    const agents = Array.isArray(root.agents) ? root.agents : [];
    const operational = agents.filter((a: Row) => a.status === 'operational').length;
    const gated = agents.filter((a: Row) => a.status === 'gated').length;
    const degraded = agents.filter((a: Row) => a.status === 'degraded').length;
    const missing = agents.filter((a: Row) => a.status === 'missing').length;
    return [
      { label: 'OBSERVED EXECUTION', value: `${operational}/${agents.length || 0}`, note: scene === 'models' ? 'runtime-backed' : 'agents operational' },
      { label: 'GATED', value: String(gated), note: 'ready without fresh execution' },
      { label: 'DEGRADED', value: String(degraded), note: 'partial source/runtime support' },
      { label: 'MISSING', value: String(missing), note: 'executor/source gap' },
    ];
  }

  if (scene === 'genai') {
    const operations = Array.isArray(root.operations) ? root.operations : [];
    return [
      { label: 'GATEWAY', value: text(root.name, 'SFI External Agent Gateway'), note: text(root.version) },
      { label: 'OPERATIONS', value: String(operations.length), note: operations.slice(0, 3).map((o: Row) => o.id).join(' · ') || 'manifest' },
      { label: 'AUTH', value: text(root.auth, 'scoped'), note: text(root.governance, 'governed') },
      { label: 'EXTERNAL ACTION', value: root.universalSignal?.externalActionAllowed === false ? 'BLOCKED BY DEFAULT' : 'SCOPED', note: 'proposal ≠ execution ≠ canon' },
    ];
  }

  if (scene === 'falsification') return [
    { label: 'OPEN CLAIMS', value: String(actionable), note: 'proposed / evidence pending' },
    { label: 'CONFLICTED', value: String(proposals.filter((p) => p.status === 'conflicted').length), note: 'requires contrast' },
    { label: 'WAITING EVIDENCE', value: String(proposals.filter((p) => p.status === 'waiting_evidence').length), note: 'do not infer closure' },
    { label: 'RETURN', value: String(proposals.filter((p) => p.status === 'accepted').length), note: 'resolved records only' },
  ];

  if (scene === 'optionality') return [
    { label: 'QUEUED', value: String(queued), note: 'authorized / still reversible until execution' },
    { label: 'FROZEN', value: String(frozen), note: 'preserved, not erased' },
    { label: 'HIGH RISK', value: String(proposals.filter((p) => ['high', 'critical'].includes((p.risk_level ?? '').toLowerCase())).length), note: 'ROOT boundary' },
    { label: 'OPEN OPTIONS', value: String(actionable), note: 'decision not yet collapsed' },
  ];

  if (scene === 'governance') return [
    { label: 'DECIDE', value: String(actionable), note: 'human authorization' },
    { label: 'EXECUTION', value: String(queued), note: 'awaiting executor / RETURN' },
    { label: 'RESOLVED', value: String(proposals.filter((p) => ['accepted', 'rejected', 'frozen', 'superseded'].includes(p.status ?? '')).length), note: 'trace retained' },
    { label: 'CANON', value: 'ROOT ONLY', note: 'separate promotion boundary' },
  ];

  if (scene === 'authority') return [
    { label: 'ROOT ONLY', value: String(rootOnly), note: 'non-delegable decisions' },
    { label: 'DELEGABLE', value: String(delegable), note: 'controller may decide' },
    { label: 'DECISION ACTORS', value: String(decidedBy), note: 'traceable identities' },
    { label: 'CANON AUTHORITY', value: 'ROOT', note: 'never delegated' },
  ];

  const objectCount = Array.isArray(root.tables) ? root.tables.length : Array.isArray(root.proposals) ? root.proposals.length : Object.keys(root).length;
  if (scene === 'archive') return [
    { label: 'VISIBLE RECORDS', value: String(objectCount), note: 'current source projection' },
    { label: 'PROPOSAL TRACE', value: String(proposals.length), note: 'history is not deleted on close' },
    { label: 'LINEAGE', value: live?.ok === false ? 'DEGRADED' : 'PRESERVED', note: 'source + time + evidence' },
    { label: 'LOSS', value: live?.ok === false ? 'VISIBLE' : 'NONE REPORTED', note: 'absence is not fabricated' },
  ];

  if (scene === 'systems') return [
    { label: 'OBSERVED OBJECTS', value: String(objectCount), note: 'current system projection' },
    { label: 'BOUNDARY', value: live?.ok === false ? 'DEGRADED' : 'CONNECTED', note: 'source availability' },
    { label: 'CHANGE REQUESTS', value: String(actionable + queued), note: 'open governance load' },
    { label: 'PERSISTENCE', value: live ? 'OBSERVED' : 'CONNECTING', note: 'state is externally stored' },
  ];

  return [
    { label: 'SOURCE', value: live?.ok === false ? 'DEGRADED' : live ? 'OBSERVED' : 'CONNECTING' },
    { label: 'DECIDE', value: String(actionable) },
    { label: 'QUEUED', value: String(queued) },
    { label: 'TRACE', value: String(proposals.length) },
  ];
}

export function SceneFieldOverlay({ scene, live, proposals }: { scene: SceneKey; live: Row | null; proposals: Proposal[] }) {
  if (scene === 'root' || scene === 'field') return null;
  const items = signals(scene, live, proposals).slice(0, 4);
  return <section className={`sceneFieldOverlay overlay-${scene}`} aria-label={`${scene} live field`}>
    <p className="sceneMission">{MISSIONS[scene]}</p>
    {items.map((item, index) => <div className={`sceneSignal signal-${index + 1}`} key={`${item.label}:${index}`}>
      <small>{item.label}</small><strong>{item.value}</strong>{item.note && <span>{item.note}</span>}
    </div>)}
  </section>;
}

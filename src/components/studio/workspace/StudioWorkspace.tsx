'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { EmergentParticleField, type EmergentAnchor } from '@/components/sfi/emergent/EmergentParticleField';
import type { StudioFieldViewNode, StudioFieldViewObject, StudioFieldViewState } from '@/lib/studio/field/studioFieldViewTypes';
import type { MetricValue, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioDirectIngestion } from './StudioDirectIngestion';
import './studio-workspace.css';

type Lens = 'SYSTEM' | 'EVIDENCE' | 'MIHM' | 'FRICTION' | 'TRAJECTORY' | 'LAB' | 'IDENTITY';
type Selection = { type: 'attractor' | 'node' | 'object'; id: string } | null;
type Position = { x: number; y: number };
type CognitiveResult = {
  summary?: string | null;
  findings?: Array<{ statement: string; epistemicClass: string; evidenceRefs: string[] }>;
  inconsistencies?: Array<{ statement: string; severity: string; evidenceRefs: string[] }>;
  production?: { status: string; reason: string; blockers: string[] };
  hypothesis?: null | { statement: string; perturbation: string; expectedOutput: string; controls: string[]; evidenceRequired: string[]; falsificationCriterion: string };
  ejector?: { direction: string[]; magnitude: number | null; velocity: number | null; horizon: string | null; confidence: number; causalNodes: string[]; basis: string };
};
type CognitiveTrace = { result: CognitiveResult | null; provider: string | null; model: string | null; createdAt: string | null; traceId: string | null };

const LENSES: Lens[] = ['SYSTEM', 'EVIDENCE', 'MIHM', 'FRICTION', 'TRAJECTORY', 'LAB', 'IDENTITY'];

function compact(value: string | null | undefined, length = 14) {
  if (!value) return '—';
  return value.length <= length ? value : `${value.slice(0, Math.max(6, length - 4))}…${value.slice(-3)}`;
}
function metric(state: StudioProductionState, key: string): MetricValue | null {
  return state.metricValues.find((item) => item.key === key) ?? null;
}
function metricText(item: MetricValue | null) {
  if (!item || item.value === null || item.value === undefined || item.value === '') return 'NO_VALUE';
  const value = typeof item.value === 'number' ? Number(item.value.toFixed(3)).toString() : String(item.value);
  return `${value}${item.unit ? ` ${item.unit}` : ''}`;
}
function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function safePercent(value: number, min = 6, max = 94) { return Math.max(min, Math.min(max, value)); }

function topologyPositions(fieldState: StudioFieldViewState) {
  const positions = new Map<string, Position>();
  const attractor = fieldState.field.attractor;
  if (attractor) positions.set(attractor.id, { x: 50, y: 48 });
  const projects = fieldState.field.nodes.filter((node) => node.kind === 'project');
  const nodes = fieldState.field.nodes.filter((node) => node.kind === 'node');
  projects.forEach((node, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, projects.length);
    positions.set(node.id, { x: 50 + Math.cos(angle) * 27, y: 48 + Math.sin(angle) * 24 });
  });
  nodes.forEach((node, index) => {
    const parent = node.parentId ? positions.get(node.parentId) : null;
    const angle = (index * 2.399963229728653) % (Math.PI * 2);
    const base = parent ?? { x: 50, y: 48 };
    positions.set(node.id, { x: safePercent(base.x + Math.cos(angle) * 19), y: safePercent(base.y + Math.sin(angle) * 17, 10, 88) });
  });
  fieldState.objects.forEach((object, index) => {
    const parent = object.fieldNodeId ? positions.get(object.fieldNodeId) : attractor ? positions.get(attractor.id) : null;
    const angle = (index * 2.399963229728653 + 0.9) % (Math.PI * 2);
    const base = parent ?? { x: 50, y: 48 };
    positions.set(`object:${object.id}`, { x: safePercent(base.x + Math.cos(angle) * 12), y: safePercent(base.y + Math.sin(angle) * 11, 10, 88) });
  });
  return positions;
}

function ParticleAnchors({ fieldState, positions }: { fieldState: StudioFieldViewState; positions: Map<string, Position> }): EmergentAnchor[] {
  const anchors: EmergentAnchor[] = [];
  if (fieldState.field.attractor) {
    const p = positions.get(fieldState.field.attractor.id);
    if (p) anchors.push({ x: p.x / 100, y: p.y / 100, weight: 1.8, tone: 'gold' });
  }
  fieldState.field.nodes.forEach((node) => {
    const p = positions.get(node.id);
    if (p) anchors.push({ x: p.x / 100, y: p.y / 100, weight: node.kind === 'project' ? 1.3 : 1, tone: node.kind === 'project' ? 'cyan' : 'violet' });
  });
  fieldState.objects.forEach((object) => {
    const p = positions.get(`object:${object.id}`);
    if (p) anchors.push({ x: p.x / 100, y: p.y / 100, weight: 0.8, tone: object.id === fieldState.objects[0]?.id ? 'amber' : 'bone' });
  });
  return anchors.length ? anchors : [{ x: .5, y: .48, weight: 1.2, tone: 'gold' }];
}

function FieldEdges({ fieldState, positions }: { fieldState: StudioFieldViewState; positions: Map<string, Position> }) {
  const attractor = fieldState.field.attractor;
  const objectEdges = fieldState.objects.map((object) => ({
    id: `object:${object.id}`,
    source: object.fieldNodeId ?? attractor?.id ?? '',
    target: `object:${object.id}`,
    relationType: object.fieldNodeId ? 'CONTAINS' : 'DERIVED_FROM',
  })).filter((edge) => edge.source);
  return (
    <svg className="studio-native__edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {[...fieldState.field.edges.map((edge) => ({ id: edge.id, source: edge.sourceId, target: edge.targetId, relationType: edge.relationType })), ...objectEdges].map((edge) => {
        const from = positions.get(edge.source); const to = positions.get(edge.target);
        if (!from || !to) return null;
        return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} data-kind={edge.relationType} />;
      })}
    </svg>
  );
}

function ScopePath({ fieldState, state, selectedNode, selectedObject }: { fieldState: StudioFieldViewState; state: StudioProductionState; selectedNode: StudioFieldViewNode | null; selectedObject: StudioFieldViewObject | null }) {
  const project = selectedNode?.kind === 'project'
    ? selectedNode
    : selectedNode?.parentId
      ? fieldState.field.nodes.find((item) => item.id === selectedNode.parentId && item.kind === 'project') ?? null
      : selectedObject?.fieldNodeId
        ? fieldState.field.nodes.find((item) => item.id === selectedObject.fieldNodeId && item.kind === 'project') ?? null
        : fieldState.field.nodes.find((item) => item.kind === 'project') ?? null;
  const node = selectedNode?.kind === 'node'
    ? selectedNode
    : selectedObject?.fieldNodeId
      ? fieldState.field.nodes.find((item) => item.id === selectedObject.fieldNodeId && item.kind === 'node') ?? null
      : null;
  const object = selectedObject ?? fieldState.objects.find((item) => item.id === state.activeObject.id) ?? null;
  const manifestation = object?.sourceRetention ?? state.activeObject.mimeType ?? null;
  const entries = [
    ['ATTRACTOR', fieldState.field.attractor?.label ?? 'REQUIRES_DECLARATION'],
    ['PROJECT', project?.label ?? 'NO_VALUE'],
    ['NODE', node?.label ?? 'NO_VALUE'],
    ['OBJECT', object?.title ?? state.activeObject.title ?? 'NO_VALUE'],
    ['MANIFESTATION', manifestation ?? 'NO_VALUE'],
  ];
  return <div className="studio-native__scope">{entries.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

export function StudioWorkspace({ state, fieldState, identity }: { state: StudioProductionState; fieldState: StudioFieldViewState; identity: string }) {
  const router = useRouter();
  const [lens, setLens] = useState<Lens>('SYSTEM');
  const [selection, setSelection] = useState<Selection>(() => fieldState.field.attractor ? { type: 'attractor', id: fieldState.field.attractor.id } : null);
  const [cognitive, setCognitive] = useState<CognitiveTrace>({ result: null, provider: null, model: null, createdAt: null, traceId: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showIngest, setShowIngest] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [attractorLabel, setAttractorLabel] = useState('');
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeKind, setNodeKind] = useState<'project' | 'node'>('project');

  const positions = useMemo(() => topologyPositions(fieldState), [fieldState]);
  const particleAnchors = useMemo(() => ParticleAnchors({ fieldState, positions }), [fieldState, positions]);
  const activeObjectId = state.activeObject.id;
  const selectedNode = selection?.type === 'node' ? fieldState.field.nodes.find((item) => item.id === selection.id) ?? null : null;
  const selectedObject = selection?.type === 'object' ? fieldState.objects.find((item) => item.id === selection.id) ?? null : null;
  const selectedAttractor = selection?.type === 'attractor' ? fieldState.field.attractor : null;
  const activeObject = selectedObject ?? fieldState.objects.find((item) => item.id === activeObjectId) ?? null;
  const selectedLabel = selectedAttractor?.label ?? selectedNode?.label ?? activeObject?.title ?? state.activeObject.title ?? 'STUDIO FIELD';
  const observedCount = state.metricValues.filter((item) => item.status === 'OBSERVED').length;
  const derivedCount = state.metricValues.filter((item) => item.status === 'DERIVED' || item.status === 'CALIBRATED').length;
  const missingCount = state.metricValues.filter((item) => ['MISSING', 'REQUIRES_DECLARATION', 'REQUIRES_FIELD_EVIDENCE', 'CAPABILITY_MISSING', 'INSUFFICIENT_SIGNAL', 'CALIBRATION_REQUIRED'].includes(item.status)).length;
  const contradictions = state.degradedSources.length + (cognitive.result?.inconsistencies?.length ?? 0);
  const identityState = !state.activeObject.id
    ? 'NO_OBJECT'
    : state.evidence.length && state.activeObject.analysisStatus === 'COMPLETE'
      ? 'CERTIFICATE_ELIGIBLE'
      : 'EVIDENCE_PENDING';

  useEffect(() => {
    if (!activeObjectId) return;
    let cancelled = false;
    fetch(`/api/studio/objects/${encodeURIComponent(activeObjectId)}/cognitive`, { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (cancelled || !body?.ok) return;
        const row = asRecord(body.trace);
        const payload = asRecord(row.payload);
        setCognitive({
          result: Object.keys(asRecord(payload.result)).length ? asRecord(payload.result) as unknown as CognitiveResult : null,
          provider: typeof payload.provider === 'string' ? payload.provider : null,
          model: typeof payload.model === 'string' ? payload.model : null,
          createdAt: typeof row.created_at === 'string' ? row.created_at : null,
          traceId: typeof row.id === 'string' ? row.id : null,
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [activeObjectId]);

  async function post(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(String(payload?.details ?? payload?.error ?? `HTTP ${response.status}`));
    return payload;
  }

  async function fieldAction(body: Record<string, unknown>) {
    setBusy(String(body.action)); setMessage(null);
    try {
      const payload = await post('/api/studio/field', { sessionId: fieldState.session?.id ?? null, ...body });
      if (!fieldState.session?.id && payload.sessionId) window.location.assign('/studio');
      else router.refresh();
      return payload;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      return null;
    } finally { setBusy(null); }
  }

  async function createAttractor() {
    const label = attractorLabel.trim();
    if (!label) { setMessage('El atractor requiere una declaración.'); return; }
    await fieldAction({ action: 'create_attractor', label });
  }
  async function createNode() {
    const label = nodeLabel.trim();
    if (!label) { setMessage('El proyecto/nodo requiere nombre.'); return; }
    const parentId = selection?.type === 'node' || selection?.type === 'attractor' ? selection.id : fieldState.field.attractor?.id ?? null;
    const result = await fieldAction({ action: 'create_node', kind: nodeKind, label, parentId });
    if (result) { setNodeLabel(''); setShowCreate(false); }
  }

  async function runCognitive(action: 'analyze' | 'generate_hypothesis' | 'verify') {
    if (!activeObjectId) { setMessage('Selecciona o carga un objeto antes de ejecutar el runtime cognitivo.'); return; }
    setBusy(`cognitive:${action}`); setMessage(null);
    try {
      const payload = await post(`/api/studio/objects/${encodeURIComponent(activeObjectId)}/cognitive`, { action });
      setCognitive({ result: payload.result ?? null, provider: payload.llm?.provider ?? null, model: payload.llm?.model ?? null, createdAt: new Date().toISOString(), traceId: payload.twin?.evidenceId ?? null });
      setMessage(payload.result?.summary ?? `Ejecución ${action} completada.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(null); }
  }

  function selectObject(object: StudioFieldViewObject) {
    setSelection({ type: 'object', id: object.id });
    if (object.id !== activeObjectId) window.location.assign(`/studio?objectId=${encodeURIComponent(object.id)}`);
  }

  const tension = typeof fieldState.world?.visual.visualTension === 'number' ? fieldState.world.visual.visualTension : 0;
  const shellStyle = { '--studio-tension': String(tension) } as CSSProperties;

  return (
    <div className="studio-native" style={shellStyle}>
      <header className="studio-native__topbar">
        <div className="studio-native__brand"><span>SYSTEM FRICTION INSTITUTE</span><strong>STUDIO</strong></div>
        <ScopePath fieldState={fieldState} state={state} selectedNode={selectedNode} selectedObject={selectedObject} />
        <div className="studio-native__status"><span>{state.systemState.toUpperCase()}</span><b>{compact(identity, 18)}</b></div>
      </header>

      <div className="studio-native__epistemic-strip">
        <span data-class="observed">OBSERVED <b>{observedCount}</b></span>
        <span data-class="derived">DERIVED <b>{derivedCount}</b></span>
        <span data-class="inferred">INFERRED <b>{cognitive.result?.findings?.filter((item) => item.epistemicClass === 'INFERRED' || item.epistemicClass === 'INFERENCE').length ?? 0}</b></span>
        <span data-class="simulated">SIMULATED <b>{state.suggestions.filter((item) => item.status === 'IN_TEST').length}</b></span>
        <span data-class="missing">MISSING <b>{missingCount}</b></span>
        <span data-class="contradicted">CONTRADICTIONS <b>{contradictions}</b></span>
      </div>

      <div className="studio-native__body">
        <section className="studio-native__field" data-sfi-field-anchor="studio-active-field">
          <EmergentParticleField anchors={particleAnchors} density={250} />
          <FieldEdges fieldState={fieldState} positions={positions} />

          <nav className="studio-native__lenses" aria-label="Lentes de Studio">
            {LENSES.map((item) => <button key={item} type="button" data-active={lens === item} onClick={() => setLens(item)}>{item}</button>)}
          </nav>

          {lens === 'SYSTEM' ? (
            <div className="studio-native__system-layer">
              {fieldState.field.attractor ? (() => {
                const p = positions.get(fieldState.field.attractor!.id) ?? { x: 50, y: 48 };
                return <button className="studio-native__node studio-native__node--attractor" style={{ left: `${p.x}%`, top: `${p.y}%` }} data-selected={selection?.id === fieldState.field.attractor!.id} onClick={() => setSelection({ type: 'attractor', id: fieldState.field.attractor!.id })}><span>ATTRACTOR</span><strong>{fieldState.field.attractor!.label}</strong><small>MOP-H</small></button>;
              })() : <div className="studio-native__void"><span>ATTRACTOR</span><strong>REQUIRES_DECLARATION</strong><button type="button" onClick={() => setShowCreate(true)}>DECLARE</button></div>}
              {fieldState.field.nodes.map((node) => {
                const p = positions.get(node.id) ?? { x: 50, y: 48 };
                return <button key={node.id} className={`studio-native__node studio-native__node--${node.kind}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} data-selected={selection?.id === node.id} onClick={() => setSelection({ type: 'node', id: node.id })}><span>{node.kind.toUpperCase()}</span><strong>{node.label}</strong><small>{node.parentId ? 'LINKED' : 'ROOTED'}</small></button>;
              })}
              {fieldState.objects.map((object) => {
                const p = positions.get(`object:${object.id}`) ?? { x: 50, y: 48 };
                return <button key={object.id} className="studio-native__node studio-native__node--object" style={{ left: `${p.x}%`, top: `${p.y}%` }} data-selected={selection?.id === object.id} data-active-object={object.id === activeObjectId} onClick={() => selectObject(object)}><span>OBJECT</span><strong>{object.title}</strong><small>{object.status.toUpperCase()}</small></button>;
              })}
            </div>
          ) : null}

          {lens === 'EVIDENCE' ? <EvidenceField state={state} /> : null}
          {lens === 'MIHM' ? <MihmField state={state} /> : null}
          {lens === 'FRICTION' ? <FrictionField state={state} cognitive={cognitive} /> : null}
          {lens === 'TRAJECTORY' ? <TrajectoryField fieldState={fieldState} onSelect={(event) => {
            if (event.objectId) {
              const object = fieldState.objects.find((item) => item.id === event.objectId); if (object) selectObject(object);
            } else if (event.nodeId) setSelection(fieldState.field.attractor?.id === event.nodeId ? { type: 'attractor', id: event.nodeId } : { type: 'node', id: event.nodeId });
          }} /> : null}
          {lens === 'LAB' ? <LabField state={state} activeObjectId={activeObjectId} /> : null}
          {lens === 'IDENTITY' ? <IdentityField state={state} identityState={identityState} /> : null}

          {showCreate ? <div className="studio-native__modal"><div><span>DECLARE STRUCTURE</span>{!fieldState.field.attractor ? <><input value={attractorLabel} onChange={(event) => setAttractorLabel(event.target.value)} placeholder="Atractor principal" /><button type="button" onClick={() => void createAttractor()} disabled={Boolean(busy)}>CREATE ATTRACTOR</button></> : <><select value={nodeKind} onChange={(event) => setNodeKind(event.target.value as 'project' | 'node')}><option value="project">PROJECT</option><option value="node">NODE</option></select><input value={nodeLabel} onChange={(event) => setNodeLabel(event.target.value)} placeholder="Nombre" /><button type="button" onClick={() => void createNode()} disabled={Boolean(busy)}>CREATE</button></>}<button type="button" className="muted" onClick={() => setShowCreate(false)}>CLOSE</button></div></div> : null}
        </section>

        <aside className="studio-native__intelligence" data-sfi-field-anchor="studio-intelligence">
          <header><span>{selection?.type?.toUpperCase() ?? 'FIELD'}</span><strong>{selectedLabel}</strong><small>{state.activeObject.analysisStatus}</small></header>

          <section className="studio-native__readout">
            <div><span>EVIDENCE</span><strong>{state.evidence.length}</strong><small>{state.archive.integrity.toUpperCase()}</small></div>
            <div><span>MIHM</span><strong>{state.mihmReport.score === null ? 'NO_VALUE' : state.mihmReport.score.toFixed(3)}</strong><small>{state.mihmReport.source}</small></div>
            <div><span>WORLD</span><strong>{fieldState.world?.dominant_signal ?? 'NO_VALUE'}</strong><small>{fieldState.world?.status ?? 'MISSING'}</small></div>
            <div><span>TWIN</span><strong>{fieldState.twin.memoryCount}</strong><small>{fieldState.twin.contractVersion}</small></div>
          </section>

          <section className="studio-native__ai">
            <div className="studio-native__section-label">COGNITIVE INSTRUMENT</div>
            {cognitive.result?.summary ? <p className="studio-native__ai-summary">{cognitive.result.summary}</p> : <p className="studio-native__empty">No cognitive trace selected for this object.</p>}
            {(cognitive.result?.findings ?? []).slice(0, 4).map((finding, index) => <article key={`${finding.statement}-${index}`} data-epistemic={finding.epistemicClass.toLowerCase()}><span>{finding.epistemicClass}</span><p>{finding.statement}</p></article>)}
            {(cognitive.result?.inconsistencies ?? []).slice(0, 2).map((finding, index) => <article key={`${finding.statement}-${index}`} data-epistemic="contradicted"><span>{finding.severity}</span><p>{finding.statement}</p></article>)}
          </section>

          <section className="studio-native__actions">
            <button type="button" disabled={!activeObjectId || Boolean(busy)} onClick={() => void runCognitive('analyze')}>OBSERVE</button>
            <button type="button" disabled={!activeObjectId || Boolean(busy)} onClick={() => void runCognitive('generate_hypothesis')}>HYPOTHESIZE</button>
            <button type="button" disabled={!activeObjectId || Boolean(busy)} onClick={() => void runCognitive('verify')}>VERIFY</button>
            <button type="button" onClick={() => setLens('LAB')}>TEST</button>
            <button type="button" onClick={() => setLens('IDENTITY')}>CERTIFICATE</button>
            <button type="button" onClick={() => setShowIngest((value) => !value)}>INGEST</button>
          </section>

          <div className="studio-native__next"><span>NEXT ACTION</span><strong>{state.nextAction.action}</strong><p>{state.nextAction.reason}</p>{state.nextAction.disabledReason ? <small>{state.nextAction.disabledReason}</small> : null}</div>
          {message ? <div className="studio-native__message">{message}</div> : null}
          {showIngest ? <StudioDirectIngestion sessionId={fieldState.session?.id ?? null} fieldNodeId={selectedNode?.id ?? null} compact /> : null}

          <footer>
            <button type="button" onClick={() => setShowCreate(true)}>+ SCOPE</button>
            <Link href={activeObjectId ? `/method-lab?origin=studio&objectId=${encodeURIComponent(activeObjectId)}` : '/method-lab'}>METHOD LAB ↗</Link>
          </footer>
        </aside>
      </div>

      <footer className="studio-native__timeline" data-sfi-field-anchor="studio-timeline">
        <div className="studio-native__timeline-head"><span>TIME / RETURN / CONTINUITY</span><b>{fieldState.timeline.length} EVENTS</b><small>{formatTime(fieldState.generatedAt)}</small></div>
        <div className="studio-native__timeline-track">
          {fieldState.timeline.length ? fieldState.timeline.slice(-32).map((event, index) => <button key={event.id} type="button" style={{ '--event-x': `${fieldState.timeline.length === 1 ? 50 : 3 + (index / Math.max(1, Math.min(31, fieldState.timeline.length - 1))) * 94}%` } as CSSProperties} onClick={() => {
            if (event.objectId) { const object = fieldState.objects.find((item) => item.id === event.objectId); if (object) selectObject(object); }
            else if (event.nodeId) setSelection(fieldState.field.attractor?.id === event.nodeId ? { type: 'attractor', id: event.nodeId } : { type: 'node', id: event.nodeId });
          }}><i /><span>{event.type}</span><strong>{event.label}</strong><small>{formatTime(event.at)}</small></button>) : <div className="studio-native__timeline-empty">NO TEMPORAL EVENTS</div>}
        </div>
      </footer>
    </div>
  );
}

function EvidenceField({ state }: { state: StudioProductionState }) {
  return <div className="studio-native__evidence-field"><div className="studio-native__center-orb"><span>EVIDENCE</span><strong>{state.evidence.length}</strong><small>{state.archive.integrity.toUpperCase()}</small></div>{state.evidence.slice(0, 28).map((item, index) => { const angle = (index / Math.max(1, Math.min(28, state.evidence.length))) * Math.PI * 2 - Math.PI / 2; const radius = 26 + (index % 3) * 7; return <article key={item.id} style={{ left: `${50 + Math.cos(angle) * radius}%`, top: `${48 + Math.sin(angle) * radius}%` }}><span>{item.type.toUpperCase()}</span><strong>{item.label}</strong><small>{item.source} · {Math.round(item.reliability * 100)}%</small></article>; })}</div>;
}

function MihmField({ state }: { state: StudioProductionState }) {
  const dimensions = [
    ['INDIVIDUAL', state.mihmReport.individual], ['GROUP', state.mihmReport.group], ['INSTITUTIONAL', state.mihmReport.institutional],
    ['SYSTEMIC', state.mihmReport.systemic], ['CIVILIZATIONAL', state.mihmReport.civilizational],
  ] as const;
  return <div className="studio-native__mihm"><div className="studio-native__mihm-rings">{dimensions.map(([label, value], index) => <div key={label} className="studio-native__mihm-ring" style={{ '--ring-i': String(index), '--ring-value': String(value ?? 0) } as CSSProperties}><span>{label}</span><b>{value === null ? 'NO_VALUE' : value.toFixed(3)}</b></div>)}<div className="studio-native__mihm-core"><span>MIHM</span><strong>{state.mihmReport.score === null ? 'NO_VALUE' : state.mihmReport.score.toFixed(3)}</strong><small>{state.mihmReport.source}</small></div></div></div>;
}

function FrictionField({ state, cognitive }: { state: StudioProductionState; cognitive: CognitiveTrace }) {
  const blocked = state.phaseStates.filter((item) => !['COMPLETE', 'OBSERVED', 'DERIVED', 'CALIBRATED'].includes(item.status));
  const friction = [...blocked.map((item) => ({ label: item.label, status: item.status, detail: item.error ?? item.details ?? item.nextAction ?? 'No additional detail' })), ...state.degradedSources.map((item) => ({ label: item, status: 'DEGRADED', detail: 'Degraded source' })), ...(cognitive.result?.inconsistencies ?? []).map((item) => ({ label: item.statement, status: item.severity, detail: item.evidenceRefs.join(' · ') || 'NO_EVIDENCE_REF' }))];
  return <div className="studio-native__friction"><div className="studio-native__friction-axis"><span>STRUCTURAL PRESSURE</span><i /></div>{friction.length ? friction.slice(0, 16).map((item, index) => <article key={`${item.label}-${index}`} style={{ '--friction-y': `${12 + (index / Math.max(1, Math.min(15, friction.length - 1))) * 76}%` } as CSSProperties}><span>{item.status}</span><strong>{item.label}</strong><small>{item.detail}</small></article>) : <div className="studio-native__void"><strong>NO QUALIFIED FRICTION RECORD</strong><span>NO_VALUE</span></div>}</div>;
}

function TrajectoryField({ fieldState, onSelect }: { fieldState: StudioFieldViewState; onSelect: (event: StudioFieldViewState['timeline'][number]) => void }) {
  return <div className="studio-native__trajectory"><div className="studio-native__trajectory-line" />{fieldState.timeline.length ? fieldState.timeline.slice(-24).map((event, index, list) => <button key={event.id} type="button" style={{ left: `${7 + (index / Math.max(1, list.length - 1)) * 86}%`, top: `${42 + Math.sin(index * 1.25) * 19}%` }} onClick={() => onSelect(event)}><i /><span>{event.type}</span><strong>{event.label}</strong><small>{formatTime(event.at)}</small></button>) : <div className="studio-native__void"><strong>NO TRAJECTORY YET</strong><span>REQUIRES TEMPORAL EVIDENCE</span></div>}</div>;
}

function LabField({ state, activeObjectId }: { state: StudioProductionState; activeObjectId: string | null }) {
  return <div className="studio-native__lab"><div className="studio-native__lab-core"><span>TEST REQUEST</span><strong>{activeObjectId ? compact(activeObjectId, 22) : 'NO_OBJECT'}</strong><small>STUDIO DOES NOT SIMULATE IN PLACE</small></div><section><article><span>HYPOTHESES</span><strong>{state.hypotheses ? 'AVAILABLE' : 'NO_VALUE'}</strong><small>Candidate claims only</small></article><article><span>SUGGESTIONS</span><strong>{state.suggestions.length}</strong><small>{state.suggestions.filter((item) => item.status === 'IN_TEST').length} IN TEST</small></article><article><span>INTERVENTIONS</span><strong>{state.interventions.length}</strong><small>Governed candidates</small></article></section><Link className="studio-native__lab-open" href={activeObjectId ? `/method-lab?origin=studio&objectId=${encodeURIComponent(activeObjectId)}` : '/method-lab'}>OPEN METHOD LAB ↗</Link><p>Simulation returns must remain SIMULATED. A lab run cannot write canonical truth or execute a real transformation.</p></div>;
}

function IdentityField({ state, identityState }: { state: StudioProductionState; identityState: string }) {
  const exactEvidence = state.evidence.find((item) => /hash|sha|checksum|integrity/i.test(`${item.type} ${item.label} ${item.source}`));
  return <div className="studio-native__identity"><div className="studio-native__certificate"><div className="studio-native__certificate-sigil">SFI</div><span>MOPS EVIDENCE</span><h2>{identityState}</h2><dl><div><dt>OBJECT UUID</dt><dd>{state.activeObject.id ?? 'NO_VALUE'}</dd></div><div><dt>VERSION</dt><dd>{state.activeObject.version ?? 'NO_VALUE'}</dd></div><div><dt>EXACT IDENTITY EVIDENCE</dt><dd>{exactEvidence ? compact(exactEvidence.id, 26) : 'NOT OBSERVED'}</dd></div><div><dt>EVIDENCE SNAPSHOT</dt><dd>{state.evidence.length ? `${state.evidence.length} refs` : 'NO_VALUE'}</dd></div><div><dt>LINEAGE BASIS</dt><dd>{state.provenance.basedOn.length ? state.provenance.basedOn.slice(0, 3).join(' · ') : 'NO_VALUE'}</dd></div><div><dt>PUBLIC CERTIFICATE</dt><dd>NOT ISSUED</dd></div></dl><p>Object identity is real; a public MOPS certificate is not claimed until a persistent identity/fingerprint/signature contract exists. Studio will not fabricate a certificate from a UUID alone.</p></div></div>;
}

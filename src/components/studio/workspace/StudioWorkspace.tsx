'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { StudioFieldViewNode, StudioFieldViewObject, StudioFieldViewState } from '@/lib/studio/field/studioFieldViewTypes';
import type { MetricValue, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { StudioDirectIngestion } from './StudioDirectIngestion';
import './studio-workspace.css';

type HubTab = 'state' | 'analysis' | 'evidence' | 'hypothesis' | 'trajectory' | 'production';
type FieldMode = 'topology' | 'longitudinal' | 'world';
type Selection = { type: 'attractor' | 'node' | 'object'; id: string } | null;

type CognitiveResult = {
  summary: string | null;
  findings: Array<{ statement: string; epistemicClass: string; evidenceRefs: string[] }>;
  inconsistencies: Array<{ statement: string; severity: string; evidenceRefs: string[] }>;
  changes: Array<{ label: string; before: number | string | null; after: number | string | null; meaning: string }>;
  identity: { status: 'SAME' | 'ALTERED' | 'INDETERMINATE'; confidence: number; reason: string; preserved: string[] };
  production: { status: 'READY' | 'BLOCKED' | 'EVIDENCE_PENDING'; reason: string; blockers: string[] };
  ejector: { direction: string[]; magnitude: number | null; velocity: number | null; horizon: string | null; confidence: number; causalNodes: string[]; basis: string };
  hypothesis: null | { statement: string; perturbation: string; expectedOutput: string; controls: string[]; evidenceRequired: string[]; falsificationCriterion: string };
  hypothesisOutcome: 'SUPPORTED' | 'FALSIFIED' | 'INCONCLUSIVE' | null;
};

type CognitiveState = {
  result: CognitiveResult | null;
  relational: Record<string, unknown> | null;
  executedAgents: string[];
  llmProvider: string | null;
  llmModel: string | null;
  traceId: string | null;
  createdAt: string | null;
};

type Position = { x: number; y: number };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
function compactIdentity(value: string) {
  return value.includes('@') ? value.split('@')[0].toUpperCase() : value.slice(0, 22).toUpperCase();
}
function metric(state: StudioProductionState, key: string): MetricValue | null {
  return state.metricValues.find((item) => item.key === key) ?? null;
}
function metricText(item: MetricValue | null) {
  if (!item || item.value === null || item.value === undefined || item.value === '') return '—';
  const value = typeof item.value === 'number' ? Number(item.value.toFixed(3)).toString() : String(item.value);
  return `${value}${item.unit ? ` ${item.unit}` : ''}`;
}
function formatTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
function statusLabel(value: string) {
  return value.replace(/_/g, ' ');
}
function safePercent(value: number, min = 4, max = 96) {
  return Math.max(min, Math.min(max, value));
}

function parseCognitiveTrace(trace: unknown): CognitiveState {
  const row = asRecord(trace);
  const payload = asRecord(row.payload);
  const result = asRecord(payload.result);
  const agents = Array.isArray(payload.executedAgents) ? payload.executedAgents.map(String) : [];
  return {
    result: Object.keys(result).length ? result as unknown as CognitiveResult : null,
    relational: Object.keys(asRecord(payload.relational)).length ? asRecord(payload.relational) : null,
    executedAgents: agents,
    llmProvider: typeof payload.provider === 'string' ? payload.provider : null,
    llmModel: typeof payload.model === 'string' ? payload.model : null,
    traceId: typeof row.id === 'string' ? row.id : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

function topologyPositions(fieldState: StudioFieldViewState) {
  const positions = new Map<string, Position>();
  const attractor = fieldState.field.attractor;
  if (attractor) positions.set(attractor.id, { x: 50, y: 46 });
  const nodes = fieldState.field.nodes;
  nodes.forEach((node, index) => {
    if (typeof node.x === 'number' && typeof node.y === 'number') {
      positions.set(node.id, { x: safePercent(50 + node.x * 42), y: safePercent(46 + node.y * 37, 8, 88) });
      return;
    }
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, nodes.length);
    const radiusX = node.kind === 'project' ? 30 : 35;
    const radiusY = node.kind === 'project' ? 25 : 31;
    positions.set(node.id, { x: 50 + Math.cos(angle) * radiusX, y: 46 + Math.sin(angle) * radiusY });
  });
  fieldState.objects.forEach((object, index) => {
    const parent = object.fieldNodeId ? positions.get(object.fieldNodeId) : attractor ? positions.get(attractor.id) : null;
    const angle = (index * 2.399963229728653) % (Math.PI * 2);
    const base = parent ?? { x: 50, y: 46 };
    const radius = object.fieldNodeId ? 10 : 39;
    positions.set(`object:${object.id}`, { x: safePercent(base.x + Math.cos(angle) * radius), y: safePercent(base.y + Math.sin(angle) * radius, 8, 88) });
  });
  return positions;
}

function longitudinalPositions(fieldState: StudioFieldViewState) {
  const positions = new Map<string, Position>();
  const entries: Array<{ id: string; at: string | null; lane: number }> = [];
  if (fieldState.field.attractor) entries.push({ id: fieldState.field.attractor.id, at: fieldState.field.attractor.declaredAt, lane: 0 });
  fieldState.field.nodes.forEach((node, index) => entries.push({ id: node.id, at: node.createdAt, lane: 1 + (index % 3) }));
  fieldState.objects.forEach((object, index) => entries.push({ id: `object:${object.id}`, at: object.createdAt, lane: 4 + (index % 2) }));
  const times = entries.map((item) => item.at ? new Date(item.at).getTime() : NaN).filter(Number.isFinite);
  const min = times.length ? Math.min(...times) : 0;
  const max = times.length ? Math.max(...times) : min + 1;
  entries.forEach((entry) => {
    const time = entry.at ? new Date(entry.at).getTime() : min;
    const ratio = max === min ? 0.5 : (time - min) / (max - min);
    positions.set(entry.id, { x: 9 + ratio * 82, y: 22 + entry.lane * 10.5 });
  });
  return positions;
}

function FieldEdges({ fieldState, positions }: { fieldState: StudioFieldViewState; positions: Map<string, Position> }) {
  const attractor = fieldState.field.attractor;
  const persisted = fieldState.field.edges.map((edge) => ({ ...edge, source: edge.sourceId, target: edge.targetId }));
  const objectEdges = fieldState.objects.map((object) => ({
    id: `object-edge:${object.id}`,
    source: object.fieldNodeId ?? attractor?.id ?? '',
    target: `object:${object.id}`,
    relationType: object.fieldNodeId ? 'CONTAINS' : 'DERIVED_FROM',
  })).filter((edge) => edge.source);
  return (
    <svg className="studio-field__edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {[...persisted, ...objectEdges].map((edge) => {
        const from = positions.get(edge.source); const to = positions.get(edge.target);
        if (!from || !to) return null;
        return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} data-relation={edge.relationType} />;
      })}
    </svg>
  );
}

function MetricStrip({ state }: { state: StudioProductionState }) {
  const keys = [
    ['DUR', 'duration_seconds'], ['LUFS', 'lufs_integrated'], ['LRA', 'loudness_range_lu'], ['TP', 'true_peak_dbtp'],
    ['SP', 'sample_peak_dbfs'], ['DR', 'dynamic_range_db'], ['STEREO', 'stereo_width'], ['CENTROID', 'spectral_centroid_hz'],
  ] as const;
  return (
    <div className="studio-hub__metrics">
      {keys.map(([label, key]) => <div key={key}><span>{label}</span><strong>{metricText(metric(state, key))}</strong><small>{metric(state, key)?.status ?? 'MISSING'}</small></div>)}
    </div>
  );
}

export function StudioWorkspace({ state, fieldState, identity }: { state: StudioProductionState; fieldState: StudioFieldViewState; identity: string }) {
  const router = useRouter();
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<Selection>(() => fieldState.field.attractor ? { type: 'attractor', id: fieldState.field.attractor.id } : null);
  const [hubTab, setHubTab] = useState<HubTab>('state');
  const [mode, setMode] = useState<FieldMode>('topology');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cognitive, setCognitive] = useState<CognitiveState>({ result: null, relational: null, executedAgents: [], llmProvider: null, llmModel: null, traceId: null, createdAt: null });
  const [showCreate, setShowCreate] = useState(false);
  const [attractorLabel, setAttractorLabel] = useState('');
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeKind, setNodeKind] = useState<'project' | 'node'>('project');
  const [nodeDescription, setNodeDescription] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [linkRelation, setLinkRelation] = useState<'DERIVED_FROM' | 'INFLUENCES' | 'CONTAINS' | 'PROJECTS'>('DERIVED_FROM');
  const activeObjectId = state.activeObject.id;
  const activeObject = fieldState.objects.find((item) => item.id === activeObjectId) ?? null;
  const visualTension = fieldState.world?.visual.visualTension ?? 0;
  const availableProviders = fieldState.providers.filter((provider) => provider.available);
  const positions = useMemo(() => mode === 'longitudinal' ? longitudinalPositions(fieldState) : topologyPositions(fieldState), [fieldState, mode]);
  const selectedNode = selection?.type === 'node' ? fieldState.field.nodes.find((item) => item.id === selection.id) ?? null : null;
  const selectedObject = selection?.type === 'object' ? fieldState.objects.find((item) => item.id === selection.id) ?? null : null;
  const selectedAttractor = selection?.type === 'attractor' ? fieldState.field.attractor : null;
  const selectedLabel = selectedAttractor?.label ?? selectedNode?.label ?? selectedObject?.title ?? 'Campo';
  const ejector = cognitive.result?.ejector ?? fieldState.ejector;

  useEffect(() => {
    if (!activeObjectId) {
      setCognitive({ result: null, relational: null, executedAgents: [], llmProvider: null, llmModel: null, traceId: null, createdAt: null });
      return;
    }
    let cancelled = false;
    fetch(`/api/studio/objects/${encodeURIComponent(activeObjectId)}/cognitive`, { credentials: 'include' })
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled && body?.ok) setCognitive(parseCognitiveTrace(body.trace));
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
    if (!label) { setMessage('El atractor requiere un nombre.'); return; }
    await fieldAction({ action: 'create_attractor', label });
  }

  async function createNode() {
    const label = nodeLabel.trim();
    if (!label) { setMessage('El nodo requiere un nombre.'); return; }
    const payload = await fieldAction({ action: 'create_node', kind: nodeKind, label, description: nodeDescription.trim() || null, parentId: selection?.type === 'node' || selection?.type === 'attractor' ? selection.id : fieldState.field.attractor?.id });
    if (payload) { setNodeLabel(''); setNodeDescription(''); setShowCreate(false); }
  }

  async function runCognitive(action: 'analyze' | 'generate_hypothesis' | 'verify') {
    if (!activeObjectId) { setMessage('Selecciona o carga un objeto antes de ejecutar el ciclo cognitivo.'); return; }
    setBusy(`cognitive:${action}`); setMessage(null);
    try {
      const payload = await post(`/api/studio/objects/${encodeURIComponent(activeObjectId)}/cognitive`, { action });
      setCognitive({ result: payload.result ?? null, relational: payload.relational ?? null, executedAgents: payload.agents?.executed ?? [], llmProvider: payload.llm?.provider ?? null, llmModel: payload.llm?.model ?? null, traceId: payload.twin?.evidenceId ?? null, createdAt: new Date().toISOString() });
      setMessage(payload.result?.summary ?? `Ciclo ${action} completado.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(null); }
  }

  async function repositionNode(event: DragEvent<HTMLButtonElement>, node: StudioFieldViewNode) {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width - 0.5) / 0.42;
    const y = ((event.clientY - rect.top) / rect.height - 0.46) / 0.37;
    await fieldAction({ action: 'update_node', nodeId: node.id, x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  }

  function selectObject(object: StudioFieldViewObject) {
    setSelection({ type: 'object', id: object.id }); setHubTab('analysis');
    if (object.id !== activeObjectId) window.location.assign(`/studio?objectId=${encodeURIComponent(object.id)}`);
  }

  function selectTimeline(event: StudioFieldViewState['timeline'][number]) {
    if (event.objectId) {
      const object = fieldState.objects.find((item) => item.id === event.objectId);
      if (object) selectObject(object);
      return;
    }
    if (event.nodeId) {
      if (fieldState.field.attractor?.id === event.nodeId) setSelection({ type: 'attractor', id: event.nodeId });
      else if (fieldState.field.nodes.some((node) => node.id === event.nodeId)) setSelection({ type: 'node', id: event.nodeId });
    }
  }

  const fieldStyle = {
    '--field-tension': String(visualTension),
    '--field-viscosity-seconds': `${Math.max(5, 18 - visualTension * 11).toFixed(2)}s`,
  } as CSSProperties;

  if (!fieldState.field.attractor) {
    return (
      <div className="studio-workspace" style={fieldStyle}>
        <header className="studio-globalbar">
          <strong>STUDIO</strong>
          <span>WORLDSPECT {fieldState.world?.status?.toUpperCase() ?? 'SIN LECTURA'} · CAMPO EN ESPERA</span>
          <span>LLM {availableProviders.length ? availableProviders.map((item) => item.id.toUpperCase()).join(' / ') : 'NO CONFIGURADO'}</span>
          <span>{compactIdentity(identity)}</span>
        </header>
        <section className="studio-empty-field">
          <div className="studio-field-fluid" aria-hidden />
          <div className="studio-empty-field__center">
            <span>CAMPO TOTALMENTE VACÍO</span>
            <h1>NINGÚN NODO</h1>
            <p>El fondo responde únicamente a la lectura WorldSpect disponible. La actividad visual es una derivación de display, no una medición institucional nueva.</p>
            {!showCreate ? <button className="studio-gold-action" type="button" onClick={() => setShowCreate(true)}>CONSTRUIR CAMPO</button> : (
              <div className="studio-inline-form">
                <input value={attractorLabel} onChange={(event) => setAttractorLabel(event.target.value)} placeholder="Nombre del atractor" autoFocus />
                <button className="studio-gold-action" type="button" onClick={() => void createAttractor()} disabled={Boolean(busy)}>CREAR ATRACTOR · MOP-H</button>
                <button type="button" onClick={() => setShowCreate(false)}>CANCELAR</button>
              </div>
            )}
            {message ? <p className="studio-message">{message}</p> : null}
          </div>
          <footer className="studio-empty-field__footer">
            <span>WorldSpect: {fieldState.world?.dominant_signal ?? 'sin dominante'}</span>
            <span>Actividad visual: {fieldState.world?.visual.visualTension?.toFixed(3) ?? 'n/d'}</span>
            <span>{fieldState.world?.visual.epistemicClass ?? 'DERIVED_DISPLAY_ONLY'}</span>
          </footer>
        </section>
      </div>
    );
  }

  return (
    <div className="studio-workspace" style={fieldStyle}>
      <header className="studio-globalbar">
        <strong>STUDIO</strong>
        <span>WORLDSPECT {fieldState.world?.status?.toUpperCase() ?? 'SIN LECTURA'} · {fieldState.world?.dominant_signal ?? 'SIN DOMINANTE'}</span>
        <span>LLM {availableProviders.length ? availableProviders.map((item) => item.id.toUpperCase()).join(' / ') : 'NO CONFIGURADO'} · TWIN {fieldState.twin.contractVersion}</span>
        <span>{compactIdentity(identity)}</span>
      </header>

      <div className="studio-field-layout">
        <section ref={fieldRef} className={`studio-field studio-field--${mode}`} aria-label="Campo operativo de Studio">
          <div className="studio-field-fluid" aria-hidden />
          <div className="studio-field__mode" role="group" aria-label="Modo de observación">
            <button type="button" aria-pressed={mode === 'topology'} onClick={() => setMode('topology')}>TOPOLOGÍA</button>
            <button type="button" aria-pressed={mode === 'longitudinal'} onClick={() => setMode('longitudinal')}>LONGITUDINAL</button>
            <button type="button" aria-pressed={mode === 'world'} onClick={() => setMode('world')}>WORLDSPECT</button>
          </div>

          {mode !== 'world' ? <FieldEdges fieldState={fieldState} positions={positions} /> : null}

          {mode === 'world' ? (
            <div className="studio-world-contrast">
              <div className="studio-world-contrast__selected">
                <small>SELECCIÓN</small><strong>{selectedLabel}</strong>
                <span>Cultural Resonance: {metricText(metric(state, 'cultural_resonance'))}</span>
                <span>MIHM: {state.mihmReport.score === null ? '—' : state.mihmReport.score.toFixed(3)}</span>
              </div>
              <div className="studio-world-contrast__axis"><span>CONTRASTE VISUAL</span><i /></div>
              <div className="studio-world-contrast__world">
                <small>WORLDSPECT ACTUAL</small><strong>{fieldState.world?.dominant_signal ?? 'SIN DOMINANTE'}</strong>
                {(fieldState.world?.domain_values ?? []).slice(0, 8).map((domain) => <span key={domain.domain}>{domain.domain} {domain.value === null ? '—' : domain.value.toFixed(3)}</span>)}
              </div>
              <p>No se fabrica una distancia escalar si el objeto y WorldSpect no comparten una dimensión calibrada. El Ejector y las hipótesis usan el contraste completo y declaran su confianza.</p>
            </div>
          ) : (
            <>
              {fieldState.field.attractor ? (() => {
                const position = positions.get(fieldState.field.attractor!.id) ?? { x: 50, y: 46 };
                return <button type="button" className={`studio-node studio-node--attractor ${selection?.id === fieldState.field.attractor!.id ? 'is-selected' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} onClick={() => { setSelection({ type: 'attractor', id: fieldState.field.attractor!.id }); setHubTab('state'); }}><span>ATRACTOR</span><strong>{fieldState.field.attractor!.label}</strong><small>MOP-H</small></button>;
              })() : null}
              {fieldState.field.nodes.map((node) => {
                const position = positions.get(node.id) ?? { x: 50, y: 46 };
                return <button key={node.id} draggable={mode === 'topology'} onDragEnd={(event) => void repositionNode(event, node)} type="button" className={`studio-node studio-node--${node.kind} ${selection?.id === node.id ? 'is-selected' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} onClick={() => { setSelection({ type: 'node', id: node.id }); setHubTab('state'); }}><span>{node.kind.toUpperCase()}</span><strong>{node.label}</strong><small>{node.parentId === fieldState.field.attractor?.id ? 'DIRECTO' : 'DEPENDENCIA'}</small></button>;
              })}
              {fieldState.objects.map((object) => {
                const position = positions.get(`object:${object.id}`) ?? { x: 50, y: 46 };
                return <button key={object.id} type="button" className={`studio-node studio-node--object ${object.id === activeObjectId ? 'is-active-object' : ''} ${selection?.id === object.id ? 'is-selected' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} onClick={() => selectObject(object)}><span>OBJETO</span><strong>{object.title}</strong><small>{object.status.toUpperCase()}</small></button>;
              })}
              {ejector ? <div className="studio-ejector" style={{ '--ejector-magnitude': String(typeof asRecord(ejector).magnitude === 'number' ? asRecord(ejector).magnitude : 0.25) } as CSSProperties}><span>EJECTOR · PROYECCIÓN</span><i /><strong>{asStrings(asRecord(ejector).direction).join(' / ') || 'dirección no resuelta'}</strong><small>conf. {typeof asRecord(ejector).confidence === 'number' ? Number(asRecord(ejector).confidence).toFixed(2) : '—'}</small></div> : null}
            </>
          )}
        </section>

        <aside className="studio-hub" aria-label="HUB contextual">
          <header><div><span>{selection?.type?.toUpperCase() ?? 'CAMPO'}</span><strong>{selectedLabel}</strong></div><small>{state.activeObject.id ? state.activeObject.status.toUpperCase() : 'SIN OBJETO'}</small></header>
          <nav aria-label="Navegación contextual">
            {([['state', 'ESTADO'], ['analysis', 'ANÁLISIS'], ['evidence', 'EVIDENCIA'], ['hypothesis', 'HIPÓTESIS'], ['trajectory', 'TRAYECTORIA'], ['production', 'PRODUCCIÓN']] as Array<[HubTab, string]>).map(([tab, label]) => <button key={tab} type="button" aria-current={hubTab === tab ? 'page' : undefined} onClick={() => setHubTab(tab)}>{label}</button>)}
          </nav>

          <div className="studio-hub__content">
            {hubTab === 'state' ? (
              <>
                {selectedAttractor ? <div className="studio-hub__summary"><span>MÉTODO</span><strong>{selectedAttractor.method}</strong><p>{selectedAttractor.description ?? 'Atractor declarado. Su logro no se infiere por existir.'}</p><small>{formatTime(selectedAttractor.declaredAt)}</small></div> : null}
                {selectedNode ? <div className="studio-hub__summary"><span>{selectedNode.kind.toUpperCase()}</span><strong>{selectedNode.label}</strong><p>{selectedNode.description ?? 'Sin descripción adicional.'}</p><small>Creado {formatTime(selectedNode.createdAt)}</small></div> : null}
                {selectedObject || activeObject ? <div className="studio-hub__summary"><span>OBJETO ACTIVO</span><strong>{(selectedObject ?? activeObject)?.title ?? state.activeObject.title}</strong><p>{state.activeObject.mimeType ?? (selectedObject ?? activeObject)?.modality ?? 'tipo no resuelto'} · {state.activeObject.sizeBytes ? `${(state.activeObject.sizeBytes / 1024 / 1024).toFixed(2)} MB` : 'tamaño no disponible'}</p><small>SHA / lineage en evidencia del objeto cuando exista.</small></div> : null}
                {selection?.type === 'attractor' || selection?.type === 'node' ? <button className="studio-hub__primary" type="button" onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'CERRAR' : '+ PROYECTO / NODO'}</button> : null}
                {showCreate ? <div className="studio-hub__form"><select value={nodeKind} onChange={(event) => setNodeKind(event.target.value as 'project' | 'node')}><option value="project">Proyecto</option><option value="node">Nodo</option></select><input value={nodeLabel} onChange={(event) => setNodeLabel(event.target.value)} placeholder="Nombre" /><textarea value={nodeDescription} onChange={(event) => setNodeDescription(event.target.value)} placeholder="Descripción opcional" /><button className="studio-hub__primary" type="button" onClick={() => void createNode()} disabled={Boolean(busy)}>CREAR</button></div> : null}
                {selectedNode ? <div className="studio-hub__form"><span>DEPENDENCIA</span><select value={linkTarget} onChange={(event) => setLinkTarget(event.target.value)}><option value="">Seleccionar nodo</option>{[fieldState.field.attractor, ...fieldState.field.nodes].filter(Boolean).filter((item) => item!.id !== selectedNode.id).map((item) => <option key={item!.id} value={item!.id}>{item!.label}</option>)}</select><select value={linkRelation} onChange={(event) => setLinkRelation(event.target.value as typeof linkRelation)}><option value="DERIVED_FROM">Deriva de</option><option value="INFLUENCES">Influye</option><option value="CONTAINS">Contiene</option><option value="PROJECTS">Proyecta</option></select><button type="button" disabled={!linkTarget || Boolean(busy)} onClick={() => void fieldAction({ action: 'link_nodes', sourceId: selectedNode.id, targetId: linkTarget, relationType: linkRelation })}>VINCULAR</button>{activeObjectId ? <button type="button" onClick={() => void fieldAction({ action: 'attach_object', objectId: activeObjectId, nodeId: selectedNode.id })}>VINCULAR OBJETO ACTIVO</button> : null}<button className="studio-danger" type="button" onClick={() => void fieldAction({ action: 'archive_node', nodeId: selectedNode.id })}>ARCHIVAR NODO</button></div> : null}
              </>
            ) : null}

            {hubTab === 'analysis' ? (
              <>
                {activeObjectId ? <MetricStrip state={state} /> : <p className="studio-hub__empty">Carga un objeto para analizar.</p>}
                {cognitive.result ? <div className="studio-analysis-result"><span>SÍNTESIS · {cognitive.llmProvider?.toUpperCase() ?? 'SIN LLM'} {cognitive.llmModel ? `· ${cognitive.llmModel}` : ''}</span><h3>{cognitive.result.summary ?? 'Sin síntesis textual.'}</h3>{cognitive.result.inconsistencies.slice(0, 3).map((item, index) => <div key={index} className={`studio-finding studio-finding--${item.severity}`}><small>INCONSISTENCIA {index + 1}</small><p>{item.statement}</p></div>)}{cognitive.result.findings.slice(0, 5).map((item, index) => <div key={index} className="studio-finding"><small>{item.epistemicClass}</small><p>{item.statement}</p></div>)}</div> : null}
                {activeObjectId ? <button className="studio-hub__primary" type="button" onClick={() => void runCognitive('analyze')} disabled={Boolean(busy)}>{busy === 'cognitive:analyze' ? 'OBSERVANDO…' : 'EJECUTAR ANÁLISIS COGNITIVO'}</button> : null}
                {state.metricValues.length ? <details className="studio-details"><summary>DATOS COMPLETOS · {state.metricValues.length}</summary><div>{state.metricValues.map((item) => <p key={item.key}><span>{item.label}</span><strong>{metricText(item)}</strong><small>{item.status}</small></p>)}</div></details> : null}
              </>
            ) : null}

            {hubTab === 'evidence' ? (
              <>
                <div className="studio-evidence-list">{state.evidence.slice(0, 40).map((item) => <button key={item.id} type="button"><span>{item.type.toUpperCase()}</span><strong>{item.label}</strong><small>{item.source} · {formatTime(item.observedAt)}</small></button>)}</div>
                <StudioDirectIngestion sessionId={fieldState.session?.id ?? null} compact />
              </>
            ) : null}

            {hubTab === 'hypothesis' ? (
              <>
                {cognitive.result?.hypothesis ? <div className="studio-hypothesis"><span>HIPÓTESIS ACTIVA</span><strong>{cognitive.result.hypothesis.statement}</strong><p>{cognitive.result.hypothesis.perturbation}</p><small>Expected: {cognitive.result.hypothesis.expectedOutput}</small></div> : state.suggestions[0] ? <div className="studio-hypothesis"><span>{state.suggestions[0].status}</span><strong>{state.suggestions[0].justification}</strong><p>{state.suggestions[0].suggestion}</p><small>{state.suggestions[0].source}</small></div> : <p className="studio-hub__empty">No hay hipótesis activa.</p>}
                <button className="studio-hub__primary" type="button" onClick={() => void runCognitive('generate_hypothesis')} disabled={!activeObjectId || Boolean(busy) || Boolean(state.suggestions.find((item) => ['PROPOSED', 'ACCEPTED', 'IN_TEST', 'EVIDENCE_PENDING'].includes(item.status)))}>{busy === 'cognitive:generate_hypothesis' ? 'GENERANDO…' : 'GENERAR UNA HIPÓTESIS'}</button>
                <button type="button" onClick={() => void runCognitive('verify')} disabled={!activeObjectId || Boolean(busy)}>VERIFICAR CON EVIDENCIA NUEVA</button>
                {cognitive.result?.hypothesisOutcome ? <p className="studio-outcome">RESULTADO: {cognitive.result.hypothesisOutcome}</p> : null}
              </>
            ) : null}

            {hubTab === 'trajectory' ? (
              <>
                <div className="studio-hub__summary"><span>EJECTOR · PROYECCIÓN</span><strong>{asStrings(asRecord(ejector).direction).join(' / ') || 'NO RESUELTO'}</strong><p>{typeof asRecord(ejector).basis === 'string' ? String(asRecord(ejector).basis) : 'Ejecuta un ciclo cognitivo para proyectar deriva.'}</p><small>Magnitud {typeof asRecord(ejector).magnitude === 'number' ? Number(asRecord(ejector).magnitude).toFixed(3) : '—'} · Confianza {typeof asRecord(ejector).confidence === 'number' ? Number(asRecord(ejector).confidence).toFixed(3) : '—'}</small></div>
                <div className="studio-agent-list"><span>AGENTES DISPONIBLES · {fieldState.agents?.counts.total ?? 0}</span>{(fieldState.agents?.passports ?? []).map((agent) => <div key={agent.id}><strong>{agent.id}</strong><small>{agent.lifecycle} · executor {agent.executorBound ? 'sí' : 'no'} · {agent.latestExecutionAt ? formatTime(agent.latestExecutionAt) : 'sin ejecución observada'}</small></div>)}</div>
                {cognitive.executedAgents.length ? <div className="studio-agent-list studio-agent-list--cycle"><span>ÚLTIMO CICLO · {cognitive.executedAgents.length}</span>{cognitive.executedAgents.map((agent) => <strong key={agent}>{agent}</strong>)}</div> : null}
              </>
            ) : null}

            {hubTab === 'production' ? (
              <>
                <div className={`studio-production-gate studio-production-gate--${(cognitive.result?.production.status ?? 'EVIDENCE_PENDING').toLowerCase()}`}><span>PRODUCTION GATE</span><strong>{cognitive.result?.production.status ?? 'EVIDENCE_PENDING'}</strong><p>{cognitive.result?.production.reason ?? 'Ejecuta el análisis cognitivo antes de declarar cierre.'}</p>{(cognitive.result?.production.blockers ?? ['COGNITIVE_ANALYSIS_REQUIRED']).slice(0, 3).map((blocker) => <small key={blocker}>{blocker}</small>)}</div>
                {cognitive.result ? <div className="studio-hub__summary"><span>IDENTIDAD</span><strong>{cognitive.result.identity.status} · {(cognitive.result.identity.confidence * 100).toFixed(0)}%</strong><p>{cognitive.result.identity.reason}</p>{cognitive.result.identity.preserved.slice(0, 5).map((item) => <small key={item}>{item}</small>)}</div> : null}
                {cognitive.result?.changes.length ? <div className="studio-change-list"><span>CAMBIOS RELEVANTES · MÁX. 3</span>{cognitive.result.changes.slice(0, 3).map((change) => <div key={change.label}><strong>{change.label}</strong><small>{String(change.before ?? '—')} → {String(change.after ?? '—')}</small><p>{change.meaning}</p></div>)}</div> : null}
                <p className="studio-production-note">READY significa que Studio no encontró un bloqueo defendible con la evidencia disponible. Publicar o ejecutar una acción irreversible sigue bajo autoridad humana del Cognitive Twin.</p>
              </>
            ) : null}
          </div>
          {message ? <footer className="studio-hub__message">{message}</footer> : null}
        </aside>
      </div>

      <section className="studio-timelap" aria-label="TimeLapStamp">
        <header><span>TIMELAPSTAMP</span><strong>{fieldState.timeline.length} EVENTOS</strong><small>pasado → presente</small></header>
        <div className="studio-timelap__track">
          {fieldState.timeline.length ? fieldState.timeline.map((event) => <button key={event.id} type="button" onClick={() => selectTimeline(event)} title={`${event.type} · ${event.source}`}><i /><span>{formatTime(event.at)}</span><strong>{statusLabel(event.type)}</strong><small>{event.label}</small></button>) : <p>Sin eventos persistidos.</p>}
        </div>
      </section>
    </div>
  );
}

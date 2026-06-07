import { translateRootNode } from './rootNodeTranslator';
import { translateRootState, type RootStateTranslation } from './rootStateTranslator';

export type RootLogbookEntry = {
  id: string;
  title: string;
  date: string;
  origin: string;
  whyItMatters: string;
  layerLabel: string;
  state: RootStateTranslation;
  nodeAffected: string;
  patternFed: string;
  objectiveTouched: string;
  evidenceAttached: string;
  generalWeight: string;
  directionalWeight: string;
  whatIsMissing: string;
  openAction: string;
};

type VisibleRecord = Record<string, unknown>;

function record(value: unknown): VisibleRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as VisibleRecord : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function arrayText(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter((item): item is string => Boolean(item))
    : [];
}

function innerRecord(value: VisibleRecord) {
  return value.payload && typeof value.payload === 'object' && !Array.isArray(value.payload)
    ? value.payload as VisibleRecord
    : value;
}

function firstText(source: VisibleRecord, keys: string[]) {
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return undefined;
}

function originFor(entry: VisibleRecord, payload: VisibleRecord) {
  const source = firstText(entry, ['actor', 'actor_id', 'source', 'role', 'event_name', 'mutation_type', 'type'])
    || firstText(payload, ['actor', 'source', 'role', 'type']);
  if (!source) return 'Origen no visible';
  const normalized = source.toLowerCase();
  if (normalized.includes('user') || normalized.includes('usuario')) return 'Usuario';
  if (normalized.includes('agent') || normalized.includes('agente') || normalized.includes('proposal')) return 'Agente';
  if (normalized.includes('system') || normalized.includes('sistema') || normalized.includes('kernel')) return 'Sistema';
  return source;
}

function dateFor(entry: VisibleRecord, payload: VisibleRecord) {
  return firstText(entry, ['timestamp', 'occurred_at', 'createdAt', 'created_at', 'updated_at', 'time', 'date'])
    || firstText(payload, ['timestamp', 'occurred_at', 'createdAt', 'created_at', 'date'])
    || 'sin timestamp visible';
}

function titleFor(entry: VisibleRecord, payload: VisibleRecord, index: number) {
  return firstText(entry, ['summary', 'message', 'description', 'title', 'label', 'event', 'event_name', 'mutation_type', 'type'])
    || firstText(payload, ['summary', 'message', 'description', 'title', 'content', 'action'])
    || `entrada visible ${index + 1}`;
}

function idFor(entry: VisibleRecord, payload: VisibleRecord, index: number) {
  return firstText(entry, ['id', 'event_id', 'mutation_key', 'proposal_id'])
    || firstText(payload, ['id', 'event_id', 'proposal_id'])
    || `root-logbook-${index}`;
}

function relatedNode(entry: VisibleRecord, payload: VisibleRecord) {
  const nodeId = firstText(entry, ['node_id', 'nodeId', 'nodeKey'])
    || firstText(payload, ['node_id', 'nodeId', 'nodeKey']);
  const nodeLabel = firstText(entry, ['node_label', 'nodeLabel'])
    || firstText(payload, ['node_label', 'nodeLabel']);
  return nodeLabel || nodeId;
}

function evidenceFor(entry: VisibleRecord, payload: VisibleRecord) {
  const direct = firstText(entry, ['evidence', 'evidence_id', 'documentId', 'document_id'])
    || firstText(payload, ['evidence', 'evidence_id', 'documentId', 'document_id']);
  if (direct) return direct;
  const linked = [...arrayText(entry.linkedDocuments), ...arrayText(payload.linkedDocuments), ...arrayText(payload.evidence)];
  return linked.length > 0 ? linked.slice(0, 3).join(', ') : 'sin evidencia adjunta visible';
}

function collectEvents(twin: unknown): unknown[] {
  const root = record(twin);
  const data = record(root.data);
  const seed = record(data.seed);
  return [
    ...(Array.isArray(seed.recentEvents) ? seed.recentEvents : []),
    ...(Array.isArray(seed.logbook) ? seed.logbook : []),
    ...(Array.isArray(seed.events) ? seed.events : []),
    ...(Array.isArray(seed.mutations) ? seed.mutations : []),
    ...(Array.isArray(data.proposals) ? data.proposals : []),
  ];
}

export function translateRootLogbookEntry(value: unknown, index = 0): RootLogbookEntry | null {
  const entry = record(value);
  const payload = innerRecord(entry);
  const title = titleFor(entry, payload, index);
  if (!title) return null;
  const nodeProjection = translateRootNode({
    id: relatedNode(entry, payload) || idFor(entry, payload, index),
    label: relatedNode(entry, payload) || title,
    nodeType: firstText(entry, ['type', 'event_name']) || firstText(payload, ['type', 'eventName']),
    runtimeState: firstText(entry, ['status', 'state', 'phase']) || firstText(payload, ['status', 'state', 'phase']),
    linkedDocuments: arrayText(entry.linkedDocuments).concat(arrayText(payload.linkedDocuments)),
    tags: arrayText(entry.tags).concat(arrayText(payload.tags)),
    source: firstText(entry, ['source']) || firstText(payload, ['source']),
  }, `root-logbook-${index}`);
  const state = translateRootState(firstText(entry, ['status', 'state', 'phase']) || firstText(payload, ['status', 'state', 'phase']) || 'observed');
  const pattern = firstText(entry, ['pattern', 'pattern_id', 'patternId'])
    || firstText(payload, ['pattern', 'pattern_id', 'patternId'])
    || arrayText(payload.linkedPatterns)[0]
    || 'sin patron visible';
  const objective = firstText(entry, ['objective', 'requested_output'])
    || firstText(payload, ['objective', 'requested_output', 'goal'])
    || 'sin objetivo declarado';
  const evidence = evidenceFor(entry, payload);

  return {
    id: idFor(entry, payload, index),
    title,
    date: dateFor(entry, payload),
    origin: originFor(entry, payload),
    whyItMatters: 'Sirve para ubicar un rastro visible; no se convierte en hecho cerrado sin evidencia y criterio de cierre.',
    layerLabel: nodeProjection.layerLabel,
    state,
    nodeAffected: nodeProjection.operationalName,
    patternFed: pattern,
    objectiveTouched: objective,
    evidenceAttached: evidence,
    generalWeight: nodeProjection.generalWeight,
    directionalWeight: nodeProjection.directionalWeight,
    whatIsMissing: evidence === 'sin evidencia adjunta visible' ? 'falta evidencia adjunta visible' : 'falta confirmar criterio de cierre',
    openAction: state.recommendedAction,
  };
}

export function buildRootLogbookEntries(twin: unknown): RootLogbookEntry[] {
  return collectEvents(twin)
    .map((event, index) => translateRootLogbookEntry(event, index))
    .filter((entry): entry is RootLogbookEntry => entry !== null)
    .slice(0, 24);
}

import 'server-only';

import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { readStudioTwinContext } from '@/core/cognitive-twin/studioContext';
import { readAgentPassports } from '@/lib/sfi/cognitive-runtime/agentPassports';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';

type Row = Record<string, unknown>;

export type StudioFieldNodeKind = 'project' | 'node';
export type StudioPersistedFieldNode = {
  id: string;
  kind: StudioFieldNodeKind;
  label: string;
  description: string | null;
  parentId: string | null;
  x: number | null;
  y: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type StudioPersistedFieldEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: 'CONTAINS' | 'DERIVED_FROM' | 'INFLUENCES' | 'PROJECTS';
  createdAt: string;
};

export type StudioFieldAttractor = {
  id: string;
  label: string;
  method: 'MOP-H';
  declaredAt: string;
  description: string | null;
};

export type StudioFieldMetadata = {
  version: 'STUDIO_FIELD_V1';
  attractor: StudioFieldAttractor | null;
  nodes: StudioPersistedFieldNode[];
  edges: StudioPersistedFieldEdge[];
};

export type StudioTimelineEvent = {
  id: string;
  at: string;
  type: string;
  label: string;
  source: string;
  objectId: string | null;
  nodeId: string | null;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function fieldFromMetadata(metadata: unknown): StudioFieldMetadata {
  const field = record(record(metadata).field);
  const attractorRaw = record(field.attractor);
  const attractorId = text(attractorRaw.id);
  const attractor: StudioFieldAttractor | null = attractorId
    ? {
        id: attractorId,
        label: text(attractorRaw.label) ?? 'Atractor',
        method: 'MOP-H',
        declaredAt: text(attractorRaw.declaredAt) ?? new Date(0).toISOString(),
        description: text(attractorRaw.description),
      }
    : null;

  const nodes: StudioPersistedFieldNode[] = Array.isArray(field.nodes)
    ? field.nodes.map((value) => record(value)).map((node) => ({
        id: text(node.id) ?? '',
        kind: node.kind === 'project' ? 'project' as const : 'node' as const,
        label: text(node.label) ?? 'Nodo',
        description: text(node.description),
        parentId: text(node.parentId),
        x: number(node.x),
        y: number(node.y),
        createdAt: text(node.createdAt) ?? new Date(0).toISOString(),
        updatedAt: text(node.updatedAt) ?? text(node.createdAt) ?? new Date(0).toISOString(),
        archivedAt: text(node.archivedAt),
      })).filter((node) => node.id && !node.archivedAt)
    : [];

  const allowedRelations = new Set(['CONTAINS', 'DERIVED_FROM', 'INFLUENCES', 'PROJECTS']);
  const edges: StudioPersistedFieldEdge[] = Array.isArray(field.edges)
    ? field.edges.map((value) => record(value)).map((edge) => ({
        id: text(edge.id) ?? '',
        sourceId: text(edge.sourceId) ?? '',
        targetId: text(edge.targetId) ?? '',
        relationType: allowedRelations.has(String(edge.relationType)) ? String(edge.relationType) as StudioPersistedFieldEdge['relationType'] : 'DERIVED_FROM',
        createdAt: text(edge.createdAt) ?? new Date(0).toISOString(),
      })).filter((edge) => edge.id && edge.sourceId && edge.targetId)
    : [];

  return { version: 'STUDIO_FIELD_V1', attractor, nodes, edges };
}

function worldVisualState(domainValues: Array<{ value: number | null }>, confidence: number) {
  const values = domainValues.map((item) => item.value).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) {
    return {
      visualTension: null,
      mean: null,
      dispersion: null,
      formula: 'DISPLAY_ONLY: 0.55*mean(domain_values) + 0.45*min(1,2*stddev(domain_values))',
      epistemicClass: 'DERIVED_DISPLAY_ONLY' as const,
    };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const dispersion = Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length);
  const signal = clamp01(0.55 * mean + 0.45 * Math.min(1, 2 * dispersion));
  return {
    visualTension: Number((signal * clamp01(0.75 + 0.25 * confidence)).toFixed(4)),
    mean: Number(mean.toFixed(4)),
    dispersion: Number(dispersion.toFixed(4)),
    formula: 'DISPLAY_ONLY: [0.55*mean(domain_values)+0.45*min(1,2*stddev(domain_values))]*[0.75+0.25*confidence]',
    epistemicClass: 'DERIVED_DISPLAY_ONLY' as const,
  };
}

function timelineFromRows(input: {
  session: Row | null;
  field: StudioFieldMetadata;
  objects: Row[];
  jobs: Row[];
  evidence: Row[];
  hypotheses: Row[];
  interventions: Row[];
  archive: Row[];
}) {
  const events: StudioTimelineEvent[] = [];
  const push = (event: StudioTimelineEvent) => {
    if (event.at && !Number.isNaN(new Date(event.at).getTime())) events.push(event);
  };

  if (input.session) {
    const at = text(input.session.created_at);
    if (at) push({ id: `session:${String(input.session.id)}`, at, type: 'FIELD_CREATED', label: text(input.session.title) ?? 'Campo creado', source: 'studio_sessions', objectId: null, nodeId: null });
  }
  if (input.field.attractor) push({ id: `attractor:${input.field.attractor.id}`, at: input.field.attractor.declaredAt, type: 'ATTRACTOR_CREATED', label: input.field.attractor.label, source: 'studio_sessions.metadata.field', objectId: null, nodeId: input.field.attractor.id });
  input.field.nodes.forEach((node) => push({ id: `node:${node.id}`, at: node.createdAt, type: node.kind === 'project' ? 'PROJECT_CREATED' : 'NODE_CREATED', label: node.label, source: 'studio_sessions.metadata.field', objectId: null, nodeId: node.id }));
  input.objects.forEach((row) => {
    const metadata = record(row.metadata);
    const at = text(row.created_at);
    if (at) push({ id: `object:${String(row.id)}`, at, type: 'OBJECT_UPLOADED', label: text(row.title) ?? 'Objeto', source: 'studio_objects', objectId: String(row.id), nodeId: text(metadata.fieldNodeId) });
  });
  input.jobs.forEach((row) => {
    const at = text(row.updated_at) ?? text(row.created_at);
    if (at) push({ id: `job:${String(row.id)}`, at, type: String(row.status) === 'complete' ? 'ANALYSIS_COMPLETED' : 'ANALYSIS_STATE_CHANGED', label: text(record(row.payload).engine) ?? text(row.reason) ?? String(row.status ?? 'analysis'), source: 'studio_analysis_jobs', objectId: text(row.object_id), nodeId: null });
  });
  input.evidence.forEach((row) => {
    const at = text(row.created_at);
    if (at) push({ id: `evidence:${String(row.id)}`, at, type: 'EVIDENCE_RECORDED', label: text(row.label) ?? 'Evidencia', source: text(row.source) ?? 'studio_evidence_traces', objectId: text(row.object_id), nodeId: null });
  });
  input.hypotheses.forEach((row) => {
    const at = text(row.created_at);
    if (at) push({ id: `hypothesis:${String(row.id)}`, at, type: 'HYPOTHESIS_CREATED', label: text(row.statement) ?? 'Hipótesis', source: text(row.origin) ?? 'studio_hypotheses', objectId: text(row.object_id), nodeId: null });
  });
  input.interventions.forEach((row) => {
    const at = text(row.created_at);
    if (at) push({ id: `intervention:${String(row.id)}`, at, type: 'INTERVENTION_RECORDED', label: text(row.title) ?? 'Intervención', source: 'studio_interventions', objectId: text(row.object_id), nodeId: null });
  });
  input.archive.forEach((row) => {
    const at = text(row.created_at);
    if (at) push({ id: `archive:${String(row.id)}`, at, type: text(row.event_type) ?? 'ARCHIVE_EVENT', label: text(row.label) ?? 'Evento', source: text(row.source) ?? 'studio_archive_events', objectId: text(row.object_id), nodeId: text(record(row.payload).nodeId) });
  });

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(-500);
}

export async function readStudioFieldState(input: { ownerId: string; sessionId?: string | null }) {
  const db = createServiceSupabaseClient();
  let sessionQuery = db.from('studio_sessions').select('*').eq('owner_id', input.ownerId);
  const sessionResult = input.sessionId
    ? await sessionQuery.eq('id', input.sessionId).maybeSingle()
    : await sessionQuery.order('updated_at', { ascending: false }).limit(1).maybeSingle();

  const session = sessionResult.data ? record(sessionResult.data) : null;
  const sessionId = session ? text(session.id) : null;
  const field = fieldFromMetadata(session?.metadata);
  const worldPromise = getWorldVectorToday().catch(() => null);
  const twinPromise = readStudioTwinContext().catch(() => ({ contractVersion: 'unknown', memory: [], decisions: [], warnings: ['cognitive_twin_unavailable'] }));
  const agentPromise = readAgentPassports().catch(() => null);

  if (!sessionId) {
    const [world, twin, agents] = await Promise.all([worldPromise, twinPromise, agentPromise]);
    const visual = world ? worldVisualState(world.observation.domain_values, world.observation.confidence) : worldVisualState([], 0);
    return {
      generatedAt: new Date().toISOString(),
      session: null,
      field,
      objects: [],
      timeline: [],
      world: world ? { ...world.observation, visual } : null,
      providers: getLlmProviderStatus(),
      twin: { contractVersion: twin.contractVersion, memoryCount: twin.memory.length, approvedDecisionCount: twin.decisions.length, warnings: twin.warnings },
      agents: agents ? { counts: agents.counts, passports: agents.passports.map((item) => ({ id: item.id, name: item.name, lifecycle: item.lifecycle, executorBound: item.executorBound, latestExecutionAt: item.latestExecutionAt })) } : null,
      ejector: null,
      warnings: [...(sessionResult.error ? [`studio_session_read_failed:${sessionResult.error.message}`] : [])],
    };
  }

  const activeSession = session ?? {};
  const objectsResult = await db.from('studio_objects').select('*').eq('session_id', sessionId).eq('owner_id', input.ownerId).order('created_at', { ascending: true }).limit(120);
  const objects = (objectsResult.data ?? []).map((item) => record(item));
  const objectIds = objects.map((item) => text(item.id)).filter((value): value is string => Boolean(value));

  const byObject = async (table: string) => objectIds.length
    ? db.from(table).select('*').in('object_id', objectIds).eq('owner_id', input.ownerId).order('created_at', { ascending: true }).limit(1000)
    : Promise.resolve({ data: [], error: null } as { data: unknown[]; error: null });

  const [jobsResult, evidenceResult, hypothesesResult, interventionsResult, archiveResult, world, twin, agents] = await Promise.all([
    byObject('studio_analysis_jobs'),
    byObject('studio_evidence_traces'),
    byObject('studio_hypotheses'),
    byObject('studio_interventions'),
    db.from('studio_archive_events').select('*').eq('session_id', sessionId).eq('owner_id', input.ownerId).order('created_at', { ascending: true }).limit(1000),
    worldPromise,
    twinPromise,
    agentPromise,
  ]);

  const jobs = (jobsResult.data ?? []).map((item) => record(item));
  const evidence = (evidenceResult.data ?? []).map((item) => record(item));
  const hypotheses = (hypothesesResult.data ?? []).map((item) => record(item));
  const interventions = (interventionsResult.data ?? []).map((item) => record(item));
  const archive = (archiveResult.data ?? []).map((item) => record(item));
  const cognitiveEvidence = [...evidence].reverse().find((row) => text(row.source) === 'studio_cognitive_runtime_v1');
  const cognitivePayload = record(cognitiveEvidence?.payload);
  const cognitiveResult = record(cognitivePayload.result);
  const ejector = Object.keys(record(cognitiveResult.ejector)).length ? record(cognitiveResult.ejector) : null;
  const visual = world ? worldVisualState(world.observation.domain_values, world.observation.confidence) : worldVisualState([], 0);
  const timeline = timelineFromRows({ session: activeSession, field, objects, jobs, evidence, hypotheses, interventions, archive });

  return {
    generatedAt: new Date().toISOString(),
    session: {
      id: sessionId,
      title: text(activeSession.title) ?? 'Studio Field',
      status: text(activeSession.status) ?? 'active',
      createdAt: text(activeSession.created_at),
      updatedAt: text(activeSession.updated_at),
    },
    field,
    objects: objects.map((row) => {
      const metadata = record(row.metadata);
      return {
        id: text(row.id) ?? '',
        title: text(row.title) ?? 'Objeto',
        objectType: text(row.object_type) ?? 'unknown',
        status: text(row.status) ?? 'unknown',
        createdAt: text(row.created_at),
        updatedAt: text(row.updated_at),
        fieldNodeId: text(metadata.fieldNodeId),
        modality: text(metadata.modality),
        sourceRetention: text(metadata.sourceRetention),
      };
    }),
    timeline,
    world: world ? { ...world.observation, visual } : null,
    providers: getLlmProviderStatus(),
    twin: { contractVersion: twin.contractVersion, memoryCount: twin.memory.length, approvedDecisionCount: twin.decisions.length, warnings: twin.warnings },
    agents: agents ? { counts: agents.counts, passports: agents.passports.map((item) => ({ id: item.id, name: item.name, lifecycle: item.lifecycle, executorBound: item.executorBound, latestExecutionAt: item.latestExecutionAt })) } : null,
    ejector,
    warnings: [
      ...(sessionResult.error ? [`studio_session_read_failed:${sessionResult.error.message}`] : []),
      ...(objectsResult.error ? [`studio_objects_read_failed:${objectsResult.error.message}`] : []),
      ...(archiveResult.error ? [`studio_archive_read_failed:${archiveResult.error.message}`] : []),
      ...twin.warnings,
    ],
  };
}

export function studioFieldMetadataFromUnknown(value: unknown) {
  return fieldFromMetadata(value);
}

export function studioFieldStringArray(value: unknown) {
  return stringArray(value);
}

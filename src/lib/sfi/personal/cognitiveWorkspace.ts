import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeRegisteredAgent } from '@/lib/sfi/cognitive-runtime/agentExecutionMap';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';

type Row = Record<string, unknown>;
type PersonalProtocol = 'sociotechnical_simulation' | 'economic_simulation';

const PERSONAL_COGNITIVE_CONTRACT = '2026-08-27.personal-cognitive.v1';
const PERSONAL_LAB_CONTRACT = '2026-08-27.personal-lab.v1';

const PERSONAL_LAB_AUTOMATIONS: Record<PersonalProtocol, string[]> = {
  sociotechnical_simulation: [
    'social_field_simulator',
    'friction_field_simulator',
    'cross_impact',
    'entropy_redistribution',
    'multi_stakeholder_bootstrap',
  ],
  economic_simulation: ['economic_field_simulator', 'cross_impact'],
};

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function clamp01(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function ownedCase(ownerId: string, caseId: string) {
  const db = createServiceSupabaseClient();
  const result = await db
    .from('field_cases')
    .select('id,title,domain,status,declared_attractor,baseline,verification_window,created_at,updated_at')
    .eq('id', caseId)
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .maybeSingle();
  if (result.error) throw new Error(`PERSONAL_CASE_READ_FAILED:${result.error.message}`);
  if (!result.data) throw new Error('PERSONAL_CASE_NOT_FOUND');
  return result.data as Row;
}

async function personalEvidence(ownerId: string, input: { caseId?: string | null; evidenceIds?: string[] }) {
  const db = createServiceSupabaseClient();
  const evidenceIds = [...new Set((input.evidenceIds ?? []).filter(Boolean))];
  let query = db
    .from('field_case_evidence')
    .select('id,case_id,evidence_type,label,source,reliability,uri,payload,observed_at,created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (input.caseId) query = query.eq('case_id', input.caseId);
  if (evidenceIds.length) query = query.in('id', evidenceIds);
  const result = await query;
  if (result.error) throw new Error(`PERSONAL_EVIDENCE_READ_FAILED:${result.error.message}`);
  const found = rows(result.data);
  if (evidenceIds.length) {
    const foundIds = new Set(found.map((item) => String(item.id)));
    const missing = evidenceIds.filter((id) => !foundIds.has(id));
    if (missing.length) throw new Error(`PERSONAL_EVIDENCE_NOT_FOUND:${missing.join(',')}`);
  }
  return found;
}

function toKernelEvidence(items: Row[]): KernelEvidence[] {
  return items.map((item) => ({
    id: String(item.id),
    source: `field_case_evidence:${text(item.evidence_type) || 'evidence'}`,
    confidence: clamp01(item.reliability),
    payload: {
      label: item.label ?? null,
      source: item.source ?? null,
      uri: item.uri ?? null,
      observedAt: item.observed_at ?? item.created_at ?? null,
      caseId: item.case_id ?? null,
      payload: item.payload ?? {},
      persistenceSource: 'field_case_evidence',
      ownerScoped: true,
    },
  }));
}

export async function readPersonalCognitiveWorkspace(ownerId: string) {
  const db = createServiceSupabaseClient();
  const [cases, evidence, cognitiveRuns, labRuns, studioObjects] = await Promise.all([
    db.from('field_cases')
      .select('id,title,domain,status,verification_window,created_at,updated_at')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50),
    db.from('field_case_evidence')
      .select('id,case_id,evidence_type,label,source,reliability,observed_at,created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(80),
    db.from('sfi_cognitive_twin_runs')
      .select('id,case_id,task_id,status,objective,provider,model,evidence_refs,started_at,finished_at,created_at,output_envelope')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('sfi_lab_analyses')
      .select('id,case_id,mode,data_mode,systems,variables,limitations,recommendations,raw_analysis,created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('studio_objects')
      .select('id,title,object_type,status,updated_at')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(30),
  ]);

  const warnings = [
    cases.error ? `field_cases:${cases.error.message}` : null,
    evidence.error ? `field_case_evidence:${evidence.error.message}` : null,
    cognitiveRuns.error ? `sfi_cognitive_twin_runs:${cognitiveRuns.error.message}` : null,
    labRuns.error ? `sfi_lab_analyses:${labRuns.error.message}` : null,
    studioObjects.error ? `studio_objects:${studioObjects.error.message}` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    ok: warnings.length === 0,
    generatedAt: new Date().toISOString(),
    ownershipBoundary: 'Every mutable personal artifact is filtered by owner_id == authenticated subject.',
    cases: cases.data ?? [],
    evidence: evidence.data ?? [],
    cognitiveRuns: cognitiveRuns.data ?? [],
    labRuns: labRuns.data ?? [],
    studioObjects: studioObjects.data ?? [],
    warnings,
  };
}

export async function createPersonalCase(input: {
  ownerId: string;
  title: string;
  domain?: string;
  objective: string;
  baseline?: string;
  verificationWindow?: '72h' | '7d' | '30d';
}) {
  const title = input.title.trim();
  const objective = input.objective.trim();
  if (!title || !objective) throw new Error('PERSONAL_CASE_TITLE_AND_OBJECTIVE_REQUIRED');
  const db = createServiceSupabaseClient();
  const result = await db.from('field_cases').insert({
    owner_id: input.ownerId,
    title,
    domain: input.domain?.trim() || 'personal',
    declared_attractor: objective,
    baseline: input.baseline?.trim() || 'Personal workspace baseline not yet established.',
    consent: true,
    visibility: 'private',
    verification_window: input.verificationWindow ?? '7d',
    status: 'PENDING',
    metadata: {
      personalWorkspace: true,
      createdThrough: 'cognitive_workspace',
    },
  }).select('id,title,domain,status,verification_window,created_at').single();
  if (result.error || !result.data) throw new Error(`PERSONAL_CASE_CREATE_FAILED:${result.error?.message ?? 'unknown'}`);
  return result.data;
}

export async function persistPersonalEvidence(input: {
  ownerId: string;
  caseId: string;
  label: string;
  content: string;
  source?: string;
  reliability?: number;
  evidenceType?: string;
  uri?: string | null;
  observedAt?: string | null;
}) {
  await ownedCase(input.ownerId, input.caseId);
  const label = input.label.trim();
  const content = input.content.trim();
  if (!label || !content) throw new Error('PERSONAL_EVIDENCE_LABEL_AND_CONTENT_REQUIRED');
  const db = createServiceSupabaseClient();
  const result = await db.from('field_case_evidence').insert({
    case_id: input.caseId,
    owner_id: input.ownerId,
    evidence_type: input.evidenceType?.trim() || 'note',
    label,
    source: input.source?.trim() || 'personal_workspace',
    reliability: clamp01(input.reliability ?? 1),
    uri: input.uri?.trim() || null,
    visibility: 'private',
    payload: { content, personalWorkspace: true },
    observed_at: input.observedAt || new Date().toISOString(),
  }).select('id,case_id,evidence_type,label,source,reliability,observed_at,created_at').single();
  if (result.error || !result.data) throw new Error(`PERSONAL_EVIDENCE_PERSIST_FAILED:${result.error?.message ?? 'unknown'}`);
  return result.data;
}

export async function runPersonalCognitive(input: {
  ownerId: string;
  objective: string;
  caseId?: string | null;
  evidenceIds?: string[];
  requestedAutomations?: string[];
  cognitiveIntents?: string[];
}) {
  const objective = input.objective.trim();
  if (!objective) throw new Error('PERSONAL_COGNITIVE_OBJECTIVE_REQUIRED');
  const caseRow = input.caseId ? await ownedCase(input.ownerId, input.caseId) : null;
  const persistedEvidence = await personalEvidence(input.ownerId, {
    caseId: input.caseId,
    evidenceIds: input.evidenceIds,
  });
  const evidence = toKernelEvidence(persistedEvidence);
  const startedAt = new Date().toISOString();
  const taskId = crypto.randomUUID();

  let context: KernelContext = {
    cycleId: taskId,
    logbookId: `PERSONAL:${input.ownerId}:${taskId}`,
    taskId,
    currentEvent: 'SFI_PERSONAL_COGNITIVE_TASK_REQUESTED',
    evidence,
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      tenantScope: 'personal',
      ownerId: input.ownerId,
      caseId: input.caseId ?? null,
      objective,
      question: objective,
      cognitiveIntents: input.cognitiveIntents ?? [],
      requestedAutomations: input.requestedAutomations ?? [],
      externalExecutionAllowed: false,
      authorityEscalationAllowed: false,
    },
  };

  const executions: Array<{ automationId: string; ok: boolean; error: string | null }> = [];
  try {
    context = executeRegisteredAgent('meta_orchestrator', context);
    executions.push({ automationId: 'meta_orchestrator', ok: true, error: null });
  } catch (error) {
    throw new Error(`PERSONAL_COGNITIVE_PLAN_FAILED:${error instanceof Error ? error.message : String(error)}`);
  }

  const plan = context.metadata.cognitivePlan && typeof context.metadata.cognitivePlan === 'object'
    ? context.metadata.cognitivePlan as Record<string, unknown>
    : {};
  const selected = stringArray(plan.requiredAgents);
  for (const automationId of selected) {
    try {
      context = executeRegisteredAgent(automationId, context);
      executions.push({ automationId, ok: true, error: null });
    } catch (error) {
      executions.push({ automationId, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const failed = executions.filter((item) => !item.ok);
  const finishedAt = new Date().toISOString();
  const outputEnvelope = {
    contractVersion: PERSONAL_COGNITIVE_CONTRACT,
    epistemicClass: 'DERIVED',
    validationLevel: 'PERSONAL_WORKSPACE',
    selectionMode: plan.selectionMode ?? 'auto',
    selectionReasons: plan.selectionReasons ?? {},
    selectedAutomations: selected,
    executions,
    case: caseRow ? { id: caseRow.id, title: caseRow.title, domain: caseRow.domain } : null,
    evidenceRefs: persistedEvidence.map((item) => String(item.id)),
    evidenceCount: persistedEvidence.length,
    hypotheses: context.hypotheses,
    contradictions: context.contradictions.map((item) => ({ id: item.id, source: item.source, confidence: item.confidence })),
    simulations: context.simulations,
    predictions: context.predictions,
    risks: context.risks,
    opportunities: context.opportunities,
    taskGraph: context.metadata.taskGraph ?? null,
    limitations: [
      'Personal cognitive automations are bounded transformations over owner-scoped inputs.',
      'Selection does not grant execution, publication, spending, access-control or canonical authority.',
      'Outputs are not institutional evidence or SFI canon by inheritance.',
    ],
  };

  const db = createServiceSupabaseClient();
  const persisted = await db.from('sfi_cognitive_twin_runs').insert({
    owner_id: input.ownerId,
    case_id: input.caseId ?? null,
    task_id: taskId,
    contract_version: PERSONAL_COGNITIVE_CONTRACT,
    provider: 'deterministic:sfi-cognitive-runtime',
    model: 'cognitive_automations_v1',
    role: 'personal_workspace',
    status: failed.length ? 'DEGRADED' : 'COMPLETED',
    objective,
    input_snapshot: {
      tenantScope: 'personal',
      caseId: input.caseId ?? null,
      evidenceRefs: persistedEvidence.map((item) => String(item.id)),
      requestedAutomations: input.requestedAutomations ?? [],
      cognitiveIntents: input.cognitiveIntents ?? [],
    },
    output_envelope: outputEnvelope,
    evidence_refs: persistedEvidence.map((item) => String(item.id)),
    limitations: outputEnvelope.limitations,
    started_at: startedAt,
    finished_at: finishedAt,
  }).select('id,status,created_at').single();
  if (persisted.error || !persisted.data) throw new Error(`PERSONAL_COGNITIVE_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);

  return {
    ok: failed.length === 0,
    runId: persisted.data.id,
    status: persisted.data.status,
    objective,
    output: outputEnvelope,
    createdAt: persisted.data.created_at,
  };
}

export async function runPersonalLab(input: {
  ownerId: string;
  protocolId: PersonalProtocol;
  caseId: string;
  evidenceIds?: string[];
  objective?: string;
  parameters?: Record<string, unknown>;
}) {
  const caseRow = await ownedCase(input.ownerId, input.caseId);
  const persistedEvidence = await personalEvidence(input.ownerId, {
    caseId: input.caseId,
    evidenceIds: input.evidenceIds,
  });
  if (!persistedEvidence.length) throw new Error('PERSONAL_LAB_PERSISTED_EVIDENCE_REQUIRED');
  const automationIds = PERSONAL_LAB_AUTOMATIONS[input.protocolId];
  if (!automationIds) throw new Error('PERSONAL_LAB_PROTOCOL_NOT_SUPPORTED');

  const startedAt = new Date().toISOString();
  const labRunId = crypto.randomUUID();
  let context: KernelContext = {
    cycleId: labRunId,
    logbookId: `PERSONAL_LAB:${input.ownerId}:${labRunId}`,
    taskId: labRunId,
    currentEvent: 'SFI_PERSONAL_LAB_SIMULATION_REQUESTED',
    evidence: toKernelEvidence(persistedEvidence),
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      tenantScope: 'personal',
      ownerId: input.ownerId,
      caseId: input.caseId,
      objective: input.objective?.trim() || String(caseRow.declared_attractor ?? ''),
      protocolId: input.protocolId,
      parameters: input.parameters ?? {},
      externalExecutionAllowed: false,
      authorityEscalationAllowed: false,
    },
  };

  const executionTrace: Array<{ automationId: string; ok: boolean; error: string | null; simulationsBefore: number; simulationsAfter: number }> = [];
  const initialEvidenceRefs = context.evidence.map((item) => item.id);
  for (const automationId of automationIds) {
    const simulationsBefore = context.simulations.length;
    try {
      const next = executeRegisteredAgent(automationId, context);
      const afterEvidenceRefs = next.evidence.map((item) => item.id);
      if (afterEvidenceRefs.length !== initialEvidenceRefs.length || afterEvidenceRefs.some((id, index) => id !== initialEvidenceRefs[index])) {
        throw new Error(`PERSONAL_LAB_EVIDENCE_MUTATION_FORBIDDEN:${automationId}`);
      }
      context = next;
      executionTrace.push({ automationId, ok: true, error: null, simulationsBefore, simulationsAfter: context.simulations.length });
    } catch (error) {
      executionTrace.push({ automationId, ok: false, error: error instanceof Error ? error.message : String(error), simulationsBefore, simulationsAfter: context.simulations.length });
    }
  }

  const finishedAt = new Date().toISOString();
  const evidenceRefs = persistedEvidence.map((item) => String(item.id));
  const resultHash = sha256({
    ownerId: input.ownerId,
    caseId: input.caseId,
    protocolId: input.protocolId,
    evidenceRefs,
    parameters: input.parameters ?? {},
    simulations: context.simulations,
  });
  const limitations = [
    'This is a private owner-scoped simulation, not observed evidence.',
    'The personal Lab does not read or mutate the institutional Cognitive Spine, ROOT evidence or canonical memory.',
    'A later owner-observed return is required to evaluate the simulation.',
  ];

  const db = createServiceSupabaseClient();
  const persisted = await db.from('sfi_lab_analyses').insert({
    owner_id: input.ownerId,
    case_id: input.caseId,
    scope: 'personal_workspace',
    input_text: input.objective?.trim() || String(caseRow.declared_attractor ?? ''),
    mode: input.protocolId,
    source: 'field_case_evidence',
    data_mode: 'SIMULATED',
    systems: automationIds,
    variables: [],
    result: { resultHash, simulations: context.simulations },
    recommendations: ['Observe the return and persist new evidence before treating any simulated signal as supported.'],
    limitations,
    raw_analysis: {
      contractVersion: PERSONAL_LAB_CONTRACT,
      labRunId,
      epistemicClass: 'SIMULATED',
      validationLevel: 'PERSONAL_WORKSPACE',
      resultHash,
      caseId: input.caseId,
      evidenceRefs,
      parameters: input.parameters ?? {},
      automationIds,
      executionTrace,
      simulations: context.simulations,
      startedAt,
      finishedAt,
      promotionAllowed: false,
    },
  }).select('id,created_at').single();
  if (persisted.error || !persisted.data) throw new Error(`PERSONAL_LAB_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);

  return {
    ok: executionTrace.every((item) => item.ok),
    labAnalysisId: persisted.data.id,
    protocolId: input.protocolId,
    caseId: input.caseId,
    evidenceRefs,
    resultHash,
    automations: executionTrace,
    simulations: context.simulations,
    limitations,
    createdAt: persisted.data.created_at,
  };
}

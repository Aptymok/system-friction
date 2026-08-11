import 'server-only';

import { runLlmTask } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope, evaluateCognitiveTwinAuthority } from '@/lib/cognitive-twin/contract';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

export type CognitiveLabCondition =
  | 'FOUNDER_SOLO'
  | 'FOUNDER_MODEL'
  | 'FOUNDER_TWIN'
  | 'FOUNDER_HUMAN_TECH'
  | 'TWIN_ONLY'
  | 'OTHER';

export type CognitiveLabEventKind =
  | 'PROMPT'
  | 'MODEL_OUTPUT'
  | 'FOUNDER_DECISION'
  | 'TOOL_EXECUTION'
  | 'ARTIFACT'
  | 'OUTCOME'
  | 'OBSERVATION'
  | 'FRICTION'
  | 'OMISSION'
  | 'OTHER';

export type CognitiveLabProvenance =
  | 'FOUNDER_ORIGINATED'
  | 'MODEL_PROPOSED'
  | 'CO_DEVELOPED'
  | 'SYSTEM_EMERGENT'
  | 'EXTERNAL'
  | 'FOUNDER_AUTHORIZATION'
  | 'UNKNOWN';

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, maximum = 12000): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function textOrNull(value: unknown, maximum = 12000): string | null {
  const valueText = text(value, maximum);
  return valueText || null;
}

function stringArray(value: unknown, maximum = 100): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
  )).slice(0, maximum);
}

function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, 100) : [];
}

function sessionKey() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CRL-${stamp}-${suffix}`;
}

function eventEvidenceRefs(events: Row[]) {
  return Array.from(new Set(events.flatMap((event) => [
    `cognitive-lab-event:${String(event.id)}`,
    ...stringArray(event.evidence_refs),
  ]))).slice(0, 120);
}

async function requireSession(sessionId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_lab_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (result.error || !result.data) throw new Error('COGNITIVE_LAB_SESSION_NOT_FOUND');
  return result.data as Row;
}

async function readSessionEvents(sessionId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_lab_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('occurred_at', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(500);
  if (result.error) throw new Error(`COGNITIVE_LAB_EVENTS_READ_FAILED:${result.error.message}`);
  return (result.data ?? []) as Row[];
}

export async function createCognitiveLabSession(createdBy: string, input: {
  title: string;
  objective: string;
  condition: CognitiveLabCondition;
  technologyNodes?: unknown[];
  humanNodes?: unknown[];
  baselineSessionId?: string | null;
  metadata?: Row;
}) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_lab_sessions').insert({
    session_key: sessionKey(),
    title: input.title,
    objective: input.objective,
    condition: input.condition,
    status: 'OPEN',
    subject_actor: 'FOUNDER',
    technology_nodes: jsonArray(input.technologyNodes),
    human_nodes: jsonArray(input.humanNodes),
    baseline_session_id: input.baselineSessionId ?? null,
    metadata: record(input.metadata),
    created_by: createdBy,
    started_at: new Date().toISOString(),
  }).select('*').single();

  if (result.error) throw new Error(`COGNITIVE_LAB_SESSION_CREATE_FAILED:${result.error.message}`);
  return result.data;
}

export async function listCognitiveLabSessions(limit = 30) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_lab_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (result.error) throw new Error(`COGNITIVE_LAB_SESSION_LIST_FAILED:${result.error.message}`);
  return result.data ?? [];
}

export async function getCognitiveLabSession(sessionId: string) {
  const db = createServiceSupabaseClient();
  const [session, events, analyses] = await Promise.all([
    db.from('sfi_cognitive_lab_sessions').select('*').eq('id', sessionId).single(),
    db.from('sfi_cognitive_lab_events').select('*').eq('session_id', sessionId).order('occurred_at', { ascending: true }).order('created_at', { ascending: true }),
    db.from('sfi_cognitive_lab_analyses').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
  ]);
  if (session.error || !session.data) throw new Error('COGNITIVE_LAB_SESSION_NOT_FOUND');
  return {
    session: session.data,
    events: events.data ?? [],
    analyses: analyses.data ?? [],
    warnings: [events.error?.message, analyses.error?.message].filter((item): item is string => Boolean(item)),
  };
}

export async function appendCognitiveLabEvent(createdBy: string, sessionId: string, input: {
  eventKind: CognitiveLabEventKind;
  provenance: CognitiveLabProvenance;
  actorKey: string;
  relationFrom?: string | null;
  relationTo?: string | null;
  payload?: Row;
  evidenceRefs?: string[];
  sourceRef?: string | null;
  occurredAt?: string | null;
}) {
  const db = createServiceSupabaseClient();
  const session = await requireSession(sessionId);
  const status = text(session.status, 80);
  if (['CLOSED', 'REJECTED'].includes(status)) throw new Error('COGNITIVE_LAB_SESSION_NOT_OPEN');

  const result = await db.from('sfi_cognitive_lab_events').insert({
    session_id: sessionId,
    event_kind: input.eventKind,
    provenance: input.provenance,
    actor_key: input.actorKey,
    relation_from: input.relationFrom ?? null,
    relation_to: input.relationTo ?? null,
    payload: record(input.payload),
    evidence_refs: stringArray(input.evidenceRefs),
    source_ref: input.sourceRef ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    created_by: createdBy,
  }).select('*').single();
  if (result.error) throw new Error(`COGNITIVE_LAB_EVENT_CREATE_FAILED:${result.error.message}`);

  if (status === 'OPEN') {
    await db.from('sfi_cognitive_lab_sessions')
      .update({ status: 'READY_FOR_BLIND', updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  return result.data;
}

export async function runCognitiveLabBlindTwin(createdBy: string, sessionId: string) {
  const db = createServiceSupabaseClient();
  const session = await requireSession(sessionId);
  const events = await readSessionEvents(sessionId);
  if (events.length === 0) throw new Error('COGNITIVE_LAB_BLIND_REQUIRES_EVENTS');

  // Blind analysis deliberately excludes CANDIDATE memory to reduce circular learning.
  const [memoryResult, decisionsResult] = await Promise.all([
    db.from('sfi_cognitive_twin_memory')
      .select('memory_key,memory_type,status,content,evidence_refs,source_kind,source_ref,version,updated_at')
      .in('status', ['VERIFIED', 'CANONICAL'])
      .order('updated_at', { ascending: false })
      .limit(80),
    db.from('sfi_cognitive_twin_decisions')
      .select('decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_at')
      .eq('status', 'APPROVED')
      .order('approved_at', { ascending: false })
      .limit(50),
  ]);

  const warnings = [memoryResult.error?.message, decisionsResult.error?.message]
    .filter((item): item is string => Boolean(item));
  const memory = memoryResult.data ?? [];
  const decisions = decisionsResult.data ?? [];
  const evidenceRefs = eventEvidenceRefs(events);
  const startedAt = new Date().toISOString();

  const fallback = [
    'Cognitive Lab blind analysis unavailable through an LLM provider.',
    `Session: ${String(session.session_key)}`,
    `Events: ${events.length}.`,
    'No relational conclusion is promoted.',
  ].join('\n');

  const llm = await runLlmTask({
    task: 'deep_report',
    system: [
      'You are executing a BLIND relational analysis for the System Friction Institute Cognitive Twin.',
      'Do not assume the founder originated an operation merely because the founder authorized execution.',
      'Use the event provenance labels as evidence, not as psychological interpretation.',
      'Do not use candidate learning. Use only the supplied VERIFIED/CANONICAL memory and APPROVED decisions.',
      'Separate observed interaction from inferred relation.',
      'Identify: objective reconstruction; founder function; technology function; initiative direction; expansion events; contraction events; induced friction; omissions; material trajectory changes; candidate relational phenomena; uncertainties; and what must not be learned yet.',
      'Explicitly answer WHO CHANGED WHOM for each material transformation when evidence allows.',
      'Do not promote anything to canon.',
    ].join(' '),
    prompt: JSON.stringify({
      session,
      events,
      verifiedCanonicalMemory: memory,
      approvedFounderDecisions: decisions,
      warnings,
    }),
    fallbackResult: fallback,
    maxTokens: 1800,
  });

  const finishedAt = new Date().toISOString();
  const analysisStatus = llm.ok ? 'CANDIDATE' : 'BLOCKED';
  const analysis = await db.from('sfi_cognitive_lab_analyses').insert({
    session_id: sessionId,
    analysis_kind: 'BLIND_TWIN',
    status: analysisStatus,
    input_event_ids: events.map((event) => String(event.id)),
    output: {
      answer: llm.result,
      providerExecutionSucceeded: llm.ok,
      corpus: {
        events: events.length,
        verifiedCanonicalMemory: memory.length,
        approvedFounderDecisions: decisions.length,
      },
    },
    provider: llm.provider,
    model: llm.model,
    evidence_refs: evidenceRefs,
    limitations: [...warnings, ...llm.warnings],
    created_by: createdBy,
  }).select('*').single();
  if (analysis.error) throw new Error(`COGNITIVE_LAB_BLIND_PERSIST_FAILED:${analysis.error.message}`);

  const authority = evaluateCognitiveTwinAuthority({
    action: 'propose',
    founderAbsent: false,
    evidencePresent: evidenceRefs.length > 0,
  });
  const taskId = `cognitive-lab:blind:${sessionId}:${Date.now()}`;
  const envelope = createCognitiveTwinEnvelope({
    status: llm.ok ? 'PROPOSED' : 'REJECTED',
    taskId,
    modelId: `${llm.provider}:${llm.model}`,
    result: {
      labSessionId: sessionId,
      labAnalysisId: analysis.data.id,
      answer: llm.result,
      authority,
      providerExecutionSucceeded: llm.ok,
    },
    limitations: [...warnings, ...llm.warnings],
    missingEvidence: [],
    actionsExecuted: ['read_lab_events', 'read_verified_canonical_memory', 'read_approved_decisions', llm.ok ? 'blind_relational_analysis' : 'blind_relational_analysis_failed'],
    recommendedTransition: llm.ok ? 'VERIFYING' : 'BLOCKED',
  });

  await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: envelope.contractVersion,
    provider: llm.provider,
    model: llm.model,
    role: 'cognitive_lab_blind_relational_analysis',
    status: llm.ok ? 'VERIFYING' : 'BLOCKED',
    objective: `Blind relational reconstruction for ${String(session.session_key)}`,
    input_snapshot: {
      labSessionId: sessionId,
      eventCount: events.length,
      requestedBy: createdBy,
    },
    output_envelope: envelope,
    evidence_refs: evidenceRefs,
    limitations: envelope.limitations,
    started_at: startedAt,
    finished_at: finishedAt,
  });

  await db.from('sfi_cognitive_lab_sessions').update({
    status: llm.ok ? 'BLIND_COMPLETE' : 'READY_FOR_BLIND',
    updated_at: new Date().toISOString(),
  }).eq('id', sessionId);

  return { analysis: analysis.data, envelope, cognitiveExecution: llm.ok ? 'EXECUTED' : 'DEGRADED' };
}

export async function runCognitiveLabFounderContrast(createdBy: string, sessionId: string, founderReadingInput: unknown) {
  const db = createServiceSupabaseClient();
  const session = await requireSession(sessionId);
  const events = await readSessionEvents(sessionId);
  if (events.length === 0) throw new Error('COGNITIVE_LAB_CONTRAST_REQUIRES_EVENTS');

  const blindResult = await db.from('sfi_cognitive_lab_analyses')
    .select('*')
    .eq('session_id', sessionId)
    .eq('analysis_kind', 'BLIND_TWIN')
    .eq('status', 'CANDIDATE')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (blindResult.error || !blindResult.data) throw new Error('COGNITIVE_LAB_BLIND_ANALYSIS_REQUIRED');

  const founderReading = typeof founderReadingInput === 'string'
    ? { narrative: text(founderReadingInput, 30000) }
    : record(founderReadingInput);
  if (Object.keys(founderReading).length === 0) throw new Error('COGNITIVE_LAB_FOUNDER_READING_REQUIRED');

  const evidenceRefs = eventEvidenceRefs(events);
  const founderAnalysis = await db.from('sfi_cognitive_lab_analyses').insert({
    session_id: sessionId,
    analysis_kind: 'FOUNDER_READING',
    status: 'VERIFIED',
    input_event_ids: events.map((event) => String(event.id)),
    output: founderReading,
    provider: null,
    model: null,
    evidence_refs: evidenceRefs,
    limitations: [],
    created_by: createdBy,
  }).select('*').single();
  if (founderAnalysis.error) throw new Error(`COGNITIVE_LAB_FOUNDER_READING_PERSIST_FAILED:${founderAnalysis.error.message}`);

  const fallback = [
    'Cognitive Lab divergence analysis unavailable through an LLM provider.',
    'Blind and founder readings were persisted but no machine divergence claim is made.',
  ].join('\n');

  const llm = await runLlmTask({
    task: 'deep_report',
    system: [
      'You are comparing a BLIND Cognitive Twin relational reading against a later founder reading.',
      'The founder reading is contrast evidence, not automatic ground truth for every causal interpretation.',
      'Separate agreement, divergence, provenance conflicts, omissions, relation errors, and genuinely new founder information.',
      'Identify which differences imply missing memory, missing relational representation, instrument bias, or legitimate ambiguity.',
      'Generate learning candidates only for claims supported by interaction evidence plus contrast. Never mark them canonical.',
      'For each learning candidate state: operation/relation, provenance, evidence basis, transfer boundary, counterexample needed, and reopen condition.',
    ].join(' '),
    prompt: JSON.stringify({
      session,
      events,
      blindReading: blindResult.data,
      founderReading,
    }),
    fallbackResult: fallback,
    maxTokens: 1800,
  });

  const divergence = await db.from('sfi_cognitive_lab_analyses').insert({
    session_id: sessionId,
    analysis_kind: 'DIVERGENCE',
    status: llm.ok ? 'CANDIDATE' : 'BLOCKED',
    input_event_ids: events.map((event) => String(event.id)),
    output: {
      answer: llm.result,
      blindAnalysisId: blindResult.data.id,
      founderAnalysisId: founderAnalysis.data.id,
      providerExecutionSucceeded: llm.ok,
    },
    provider: llm.provider,
    model: llm.model,
    evidence_refs: [
      ...evidenceRefs,
      `cognitive-lab-analysis:${String(blindResult.data.id)}`,
      `cognitive-lab-analysis:${String(founderAnalysis.data.id)}`,
    ],
    limitations: llm.warnings,
    created_by: createdBy,
  }).select('*').single();
  if (divergence.error) throw new Error(`COGNITIVE_LAB_DIVERGENCE_PERSIST_FAILED:${divergence.error.message}`);

  let learning: Row = { persisted: false, reason: 'divergence_analysis_degraded' };
  if (llm.ok) {
    const memoryEvidenceRefs = [
      ...evidenceRefs,
      `cognitive-lab-analysis:${String(blindResult.data.id)}`,
      `cognitive-lab-analysis:${String(founderAnalysis.data.id)}`,
      `cognitive-lab-analysis:${String(divergence.data.id)}`,
    ];
    const authority = evaluateCognitiveTwinAuthority({
      action: 'persist_memory',
      founderAbsent: false,
      evidencePresent: memoryEvidenceRefs.length > 0,
    });

    if (authority.decision === 'ALLOW') {
      const memory = await db.from('sfi_cognitive_twin_memory').upsert({
        memory_key: `cognitive_lab:${sessionId}:relational_contrast`,
        memory_type: 'STATE',
        status: 'CANDIDATE',
        content: {
          epistemicStatus: 'CANDIDATE',
          learningClass: 'RELATIONAL_COUPLING_CONTRAST',
          labSessionId: sessionId,
          sessionKey: session.session_key,
          condition: session.condition,
          blindAnalysisId: blindResult.data.id,
          founderAnalysisId: founderAnalysis.data.id,
          divergenceAnalysisId: divergence.data.id,
          divergence: llm.result,
          provenanceRule: 'FOUNDER_AUTHORIZATION_IS_NOT_FOUNDER_ORIGIN',
          promotionRule: 'Requires later replication or explicit verification before VERIFIED/CANONICAL.',
        },
        evidence_refs: memoryEvidenceRefs,
        source_kind: 'COGNITIVE_LAB_CONTRAST',
        source_ref: String(divergence.data.id),
        version: 'cognitive-lab-v1',
        created_by: createdBy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'memory_key,version' }).select('id,status,memory_key,version').single();

      learning = memory.error
        ? { persisted: false, reason: memory.error.message }
        : { persisted: true, ...record(memory.data) };
    } else {
      learning = { persisted: false, reason: authority.reason };
    }
  }

  await db.from('sfi_cognitive_lab_sessions').update({
    status: llm.ok ? 'CLOSED' : 'CONTRAST_PENDING',
    ended_at: llm.ok ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', sessionId);

  return {
    founderReading: founderAnalysis.data,
    divergence: divergence.data,
    learning,
    cognitiveExecution: llm.ok ? 'EXECUTED' : 'DEGRADED',
  };
}

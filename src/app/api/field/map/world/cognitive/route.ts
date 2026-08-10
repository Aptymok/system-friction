import { NextResponse } from 'next/server';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope } from '@/lib/cognitive-twin/contract';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { executeSfiRuntime } from '@/lib/sfi/cognitive-runtime/runtime';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FRAME_AGENT_SET = [
  'field_observer',
  'evidence_hunter',
  'temporal_resolver',
  'context_builder',
  'cross_impact',
  'friction_field_simulator',
  'trajectory_agent',
  'risk_agent',
] as const;

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function finite(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function iso(value: unknown, fallback = new Date().toISOString()) {
  const candidate = text(value);
  if (!candidate) return fallback;
  const parsed = new Date(candidate);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : fallback;
}

function clampHours(value: unknown) {
  return Math.max(6, Math.min(24 * 7, Math.round(finite(value, 72))));
}

function confidence(value: unknown) {
  return Math.max(0, Math.min(1, finite(value, 0)));
}

function knownByCutoff(row: Row, cutoffMs: number) {
  const fetchedAt = Date.parse(text(row.fetched_at));
  if (!Number.isFinite(fetchedAt) || fetchedAt > cutoffMs) return false;
  const released = text(row.released_at);
  if (!released) return true;
  const releasedAt = Date.parse(released);
  return !Number.isFinite(releasedAt) || releasedAt <= cutoffMs;
}

export async function POST(request: Request) {
  const authClient = await createServerSupabaseClient();
  const { data: auth, error: authError } = await authClient.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Row;
  const cutoffAt = iso(body.cutoffAt);
  const windowHours = clampHours(body.windowHours);
  const cutoffMs = new Date(cutoffAt).getTime();
  const windowStart = new Date(cutoffMs - windowHours * 60 * 60 * 1000).toISOString();
  const db = createServiceSupabaseClient();
  const startedAt = new Date().toISOString();
  const taskId = `world-field-frame:${auth.user.id}:${Date.now()}`;
  const cycleId = crypto.randomUUID();

  const [observationsResult, hypothesesResult, canonicalMemoryResult, approvedRulesResult] = await Promise.all([
    db.from('world_source_observations')
      .select('id,source_id,source_family,publisher,title,summary,observed_at,released_at,fetched_at,latitude,longitude,affected_systems,actors,confidence')
      .gte('observed_at', windowStart)
      .lte('observed_at', cutoffAt)
      .lte('fetched_at', cutoffAt)
      .order('observed_at', { ascending: true })
      .limit(500),
    db.from('world_hypotheses')
      .select('id,statement,status,current_confidence,cutoff_at,validation_ends_at,evidence_ids,graph_snapshot')
      .gte('cutoff_at', windowStart)
      .lte('cutoff_at', cutoffAt)
      .order('cutoff_at', { ascending: true })
      .limit(300),
    db.from('sfi_cognitive_twin_memory')
      .select('id,memory_key,memory_type,status,content,evidence_refs,source_kind,version,updated_at')
      .eq('status', 'CANONICAL')
      .in('memory_type', ['CANON', 'METHOD', 'DEFINITION', 'CAPABILITY'])
      .order('updated_at', { ascending: false })
      .limit(40),
    db.from('sfi_cognitive_twin_decisions')
      .select('id,decision_id,general_rule,required_evidence,evidence_refs,approved_at')
      .eq('status', 'APPROVED')
      .order('approved_at', { ascending: false })
      .limit(40),
  ]);

  const primaryError = observationsResult.error ?? hypothesesResult.error;
  if (primaryError) {
    return NextResponse.json({ ok: false, error: 'WORLD_FRAME_READ_FAILED', details: primaryError.message }, { status: 503 });
  }

  const observations = (observationsResult.data ?? []).map(record).filter((row) => knownByCutoff(row, cutoffMs));
  const hypotheses = (hypothesesResult.data ?? []).map(record);
  const observationIds = observations.map((row) => text(row.id)).filter(Boolean);
  const readingsResult = observationIds.length
    ? await db.from('world_friction_readings')
      .select('id,observation_id,systemic_friction,interaction_density,friction_gradient,systemic_coherence,tension,pain_map,field_drivers,permissions,trajectory,minimum_viable_perturbation,created_at')
      .in('observation_id', observationIds)
      .order('created_at', { ascending: true })
    : { data: [], error: null };

  if (readingsResult.error) {
    return NextResponse.json({ ok: false, error: 'WORLD_FRAME_READING_FAILED', details: readingsResult.error.message }, { status: 503 });
  }

  const readingByObservation = new Map((readingsResult.data ?? []).map((row) => [String(row.observation_id), record(row)]));
  const evidence: KernelEvidence[] = observations.map((row) => {
    const id = text(row.id);
    const reading = readingByObservation.get(id) ?? null;
    return {
      id,
      source: `world_source_observations:${text(row.source_family, 'unknown')}`,
      confidence: confidence(row.confidence),
      payload: {
        publisher: text(row.publisher),
        title: text(row.title),
        summary: text(row.summary),
        observedAt: text(row.observed_at),
        releasedAt: text(row.released_at),
        fetchedAt: text(row.fetched_at),
        knowledgeAt: text(row.fetched_at),
        affectedSystems: Array.isArray(row.affected_systems) ? row.affected_systems : [],
        actors: Array.isArray(row.actors) ? row.actors : [],
        geography: row.latitude === null || row.longitude === null ? null : { lat: Number(row.latitude), lng: Number(row.longitude) },
        reading,
        epistemicClass: reading ? 'OBSERVED_WITH_DERIVED_SFI_READING' : 'IMPORTED_OBSERVATION',
      },
    };
  }).filter((item) => item.id);

  const context: KernelContext = {
    taskId,
    cycleId,
    logbookId: `world-field-frame:${taskId}`,
    currentEvent: 'SFI_WORLD_FIELD_FRAME_ANALYSIS',
    evidence,
    hypotheses: hypotheses.map((row) => ({
      id: text(row.id),
      statement: text(row.statement),
      confidence: confidence(row.current_confidence),
    })).filter((item) => item.id && item.statement),
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      requestedAgents: [...FRAME_AGENT_SET],
      llmAugmentation: false,
      cutoffAt,
      windowStart,
      windowHours,
      requestedBy: auth.user.id,
      temporalKnowledgeRule: 'An observation is admissible only if SFI fetched it by the cutoff and, when a release timestamp exists, the source had released it by the cutoff.',
      rule: 'The temporal frame is persisted evidence. Agent output is derived/inferred context. The LLM synthesis is PROPOSED and cannot rewrite observations, hypotheses, outcomes, memory or canon.',
    },
  };

  const cycle = await executeSfiRuntime(context);
  const canonicalMemory = (canonicalMemoryResult.data ?? []).map((row) => ({
    memoryKey: row.memory_key,
    memoryType: row.memory_type,
    content: row.content,
    version: row.version,
  }));
  const approvedRules = (approvedRulesResult.data ?? []).map((row) => ({
    decisionId: row.decision_id,
    generalRule: row.general_rule,
    requiredEvidence: row.required_evidence,
  }));
  const corpusWarnings = [canonicalMemoryResult.error?.message, approvedRulesResult.error?.message].filter((value): value is string => Boolean(value));

  const fallback = [
    `Temporal frame ${windowStart} → ${cutoffAt}.`,
    `${evidence.length} persisted observations and ${hypotheses.length} hypotheses were available.`,
    `Executed agents: ${cycle.executedAgents.join(', ') || 'none'}.`,
    'LLM synthesis unavailable. Inspect the persisted evidence and agent trace directly.',
  ].join('\n');

  const llm = await runLlmTask({
    task: 'deep_report',
    system: [
      'You are the bounded synthesis layer for System Friction Institute World Field.',
      'Evidence before inference. The map frame and persisted WORLD records are evidence/context; agent output is derived or inferred; your text is PROPOSED.',
      'Use the supplied canonical Cognitive Twin corpus only as institutional method/rules, never as new evidence about the world.',
      'Do not invent measurements, causes, routing, geography, probabilities or events.',
      'Separate OBSERVED, DERIVED, INFERRED, PROPOSED and MISSING explicitly.',
      'Return a concise operational reading: what changed inside the frame, active contradictions, trajectory, missing evidence, and one next observation question. Do not authorize external execution.',
    ].join(' '),
    prompt: JSON.stringify({
      frame: { cutoffAt, windowStart, windowHours },
      observations: evidence.slice(-80),
      persistedHypotheses: hypotheses.slice(-80),
      agentExecution: {
        executedAgents: cycle.executedAgents,
        contradictions: cycle.context.contradictions,
        predictions: cycle.context.predictions,
        risks: cycle.context.risks,
        opportunities: cycle.context.opportunities,
        metadata: cycle.context.metadata,
      },
      cognitiveTwinCanonicalMemory: canonicalMemory,
      approvedInstitutionalRules: approvedRules,
      corpusWarnings,
    }),
    fallbackResult: fallback,
    maxTokens: 1400,
  });

  const finishedAt = new Date().toISOString();
  const evidenceRefs = evidence.map((item) => item.id);
  const envelope = createCognitiveTwinEnvelope({
    taskId,
    status: llm.ok ? 'PROPOSED' : 'REJECTED',
    modelId: `${llm.provider}:${llm.model}`,
    result: {
      frame: { cutoffAt, windowStart, windowHours },
      synthesis: llm.result,
      executedAgents: cycle.executedAgents,
      observationCount: evidence.length,
      hypothesisCount: hypotheses.length,
      provider: llm.provider,
      model: llm.model,
      providerExecutionSucceeded: llm.ok,
      latencyMs: llm.latency_ms,
      cognitiveTwinCorpus: {
        canonicalMemoryRecords: canonicalMemory.length,
        approvedInstitutionalRules: approvedRules.length,
      },
    },
    limitations: [
      'Temporal proximity and shared affected systems do not prove causal relation.',
      'Agent execution is not independent validation.',
      'LLM synthesis is a proposed interpretation and is not persisted as WORLD observation or hypothesis truth.',
      ...corpusWarnings,
      ...llm.warnings,
    ],
    missingEvidence: evidence.length ? [] : ['world_frame_observations'],
    actionsExecuted: [
      ...cycle.executedAgents.map((agent) => `cognitive:${agent}`),
      'read_canonical_cognitive_twin_corpus',
      llm.ok ? 'llm_frame_synthesis' : 'llm_frame_synthesis_failed',
    ],
    recommendedTransition: !llm.ok ? 'BLOCKED' : evidence.length ? 'VERIFYING' : 'EVIDENCE_PENDING',
  });

  const runStatus = !llm.ok ? 'BLOCKED' : evidence.length ? 'READY' : 'EVIDENCE_PENDING';
  const persisted = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: envelope.contractVersion,
    provider: llm.provider,
    model: llm.model,
    role: 'world_field_frame_analysis',
    status: runStatus,
    objective: `Interpret the persisted World Field frame ending ${cutoffAt} without mutating evidence or world state.`,
    input_snapshot: {
      requestedBy: auth.user.id,
      cutoffAt,
      windowStart,
      windowHours,
      observationCount: evidence.length,
      hypothesisCount: hypotheses.length,
      requestedAgents: FRAME_AGENT_SET,
      temporalKnowledgeRule: 'fetched_at <= cutoff and released_at <= cutoff when known',
    },
    output_envelope: envelope,
    evidence_refs: evidenceRefs,
    limitations: envelope.limitations,
    started_at: startedAt,
    finished_at: finishedAt,
  }).select('id,task_id,role,status,provider,model,created_at').single();

  if (persisted.error) {
    return NextResponse.json({ ok: false, error: 'WORLD_FRAME_TWIN_RUN_PERSISTENCE_FAILED', details: persisted.error.message, envelope }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    frame: { cutoffAt, windowStart, windowHours },
    synthesis: llm.result,
    epistemicClass: llm.ok ? 'PROPOSED' : 'MISSING',
    cognitiveExecution: llm.ok ? 'EXECUTED' : 'DEGRADED',
    agents: cycle.executedAgents,
    llm: { ok: llm.ok, provider: llm.provider, model: llm.model, latencyMs: llm.latency_ms, warnings: llm.warnings },
    twin: { runId: persisted.data.id, role: persisted.data.role, status: persisted.data.status, corpusWarnings },
    evidenceRefs,
    limitations: envelope.limitations,
  });
}

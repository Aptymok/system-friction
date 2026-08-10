import 'server-only';

import { runLlmTask } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope } from '@/lib/cognitive-twin/contract';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { executeSfiRuntime } from '@/lib/sfi/cognitive-runtime/runtime';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { INEGI_NATIONAL_SCENARIOS } from '@/lib/world-observatory/inegiNationalField';

const NATIONAL_AGENT_SET = [
  'field_observer',
  'evidence_hunter',
  'temporal_resolver',
  'context_builder',
  'cross_impact',
  'trajectory_agent',
  'risk_agent',
  'opportunity_agent',
] as const;

type Row = Record<string, unknown>;

type NationalScenarioInput = {
  scenarioId: string;
  cutoffAt?: string | null;
  referenceStart?: string | null;
  referenceEnd?: string | null;
  requestedBy: string;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(record).filter((row) => Object.keys(row).length > 0) : [];
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}

function confidence(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}

function isoOrNow(value: string | null | undefined) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function optionalIso(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function scenarioIds(row: Row) {
  return strings(record(row.payload).scenarioIds);
}

export async function runNationalFieldScenario(input: NationalScenarioInput) {
  const scenario = INEGI_NATIONAL_SCENARIOS.find((item) => item.id === input.scenarioId);
  if (!scenario) return { ok: false as const, error: 'NATIONAL_SCENARIO_NOT_FOUND' };

  const cutoffAt = isoOrNow(input.cutoffAt);
  const cutoffMs = Date.parse(cutoffAt);
  const referenceStart = optionalIso(input.referenceStart);
  const referenceEnd = optionalIso(input.referenceEnd);
  const db = createServiceSupabaseClient();
  const startedAt = new Date().toISOString();
  const taskId = `national-field:${scenario.id}:${Date.now()}`;
  const cycleId = crypto.randomUUID();

  let observationQuery = db.from('world_source_observations')
    .select('id,source_id,source_family,publisher,observation_kind,external_id,title,summary,observed_at,released_at,fetched_at,country_codes,actors,affected_systems,payload,confidence')
    .eq('publisher', 'INEGI')
    .contains('country_codes', ['MX'])
    .lte('fetched_at', cutoffAt)
    .order('observed_at', { ascending: true })
    .limit(1500);
  if (referenceStart) observationQuery = observationQuery.gte('observed_at', referenceStart);
  if (referenceEnd) observationQuery = observationQuery.lte('observed_at', referenceEnd);

  const [observationResult, memoryResult, decisionResult] = await Promise.all([
    observationQuery,
    db.from('sfi_cognitive_twin_memory')
      .select('id,memory_key,memory_type,status,content,evidence_refs,version,updated_at')
      .eq('status', 'CANONICAL')
      .in('memory_type', ['CANON', 'METHOD', 'DEFINITION', 'CAPABILITY'])
      .order('updated_at', { ascending: false })
      .limit(60),
    db.from('sfi_cognitive_twin_decisions')
      .select('id,decision_id,general_rule,required_evidence,evidence_refs,approved_at')
      .eq('status', 'APPROVED')
      .order('approved_at', { ascending: false })
      .limit(60),
  ]);

  if (observationResult.error) return { ok: false as const, error: `NATIONAL_FIELD_READ_FAILED:${observationResult.error.message}` };

  const observations = (observationResult.data ?? []).map(record).filter((row) => {
    const released = text(row.released_at);
    if (released) {
      const releaseMs = Date.parse(released);
      if (Number.isFinite(releaseMs) && releaseMs > cutoffMs) return false;
    }
    return scenarioIds(row).includes(scenario.id);
  });

  const evidence: KernelEvidence[] = observations.map((row) => ({
    id: text(row.id),
    source: `inegi:${text(row.source_id, 'unknown')}`,
    confidence: confidence(row.confidence),
    payload: {
      publisher: 'INEGI',
      sourceFamily: text(row.source_family),
      observationKind: text(row.observation_kind),
      title: text(row.title),
      summary: text(row.summary),
      referenceAt: text(row.observed_at),
      releasedAt: text(row.released_at),
      fetchedAt: text(row.fetched_at),
      affectedSystems: strings(row.affected_systems),
      actors: strings(row.actors),
      statisticalPayload: record(row.payload),
      epistemicClass: 'IMPORTED',
      claimBoundary: 'Official statistical evidence is an input to analysis. It is not itself a friction score, causal claim, hypothesis validation or canonical memory.',
    },
  })).filter((item) => item.id);

  const context: KernelContext = {
    taskId,
    cycleId,
    logbookId: `national-field:${scenario.id}`,
    currentEvent: 'SFI_NATIONAL_FIELD_SCENARIO_ANALYSIS',
    evidence,
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      requestedAgents: [...NATIONAL_AGENT_SET],
      llmAugmentation: false,
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      scenarioQuestion: scenario.question,
      sourceInstitution: 'INEGI',
      cutoffAt,
      referenceStart,
      referenceEnd,
      requestedBy: input.requestedBy,
      temporalKnowledgeRule: 'Only records fetched by SFI by cutoffAt and released by the publisher by cutoffAt are admissible.',
      epistemicRule: 'Imported official statistics may support comparison and hypothesis generation; they do not automatically become SFI friction measurements or truth claims.',
    },
  };

  const cycle = await executeSfiRuntime(context);
  const canonicalMemory = rows(memoryResult.data).map((row) => ({
    memoryKey: row.memory_key,
    memoryType: row.memory_type,
    content: row.content,
    version: row.version,
  }));
  const approvedRules = rows(decisionResult.data).map((row) => ({
    decisionId: row.decision_id,
    generalRule: row.general_rule,
    requiredEvidence: row.required_evidence,
  }));
  const corpusWarnings = [memoryResult.error?.message, decisionResult.error?.message].filter((value): value is string => Boolean(value));

  const fallback = [
    `National scenario ${scenario.id} could not be synthesized by an LLM provider.`,
    `${evidence.length} INEGI observations were admissible at cutoff ${cutoffAt}.`,
    `Agents executed: ${cycle.executedAgents.join(', ') || 'none'}.`,
    'No Cognitive Twin synthesis is declared. Inspect evidence and deterministic agent outputs.',
  ].join('\n');

  const llm = await runLlmTask({
    task: 'deep_report',
    system: [
      'You are the bounded synthesis layer of the System Friction Institute Cognitive Twin for the Mexico National Observation Field.',
      'Use INEGI statistical records as IMPORTED evidence, not as pre-labeled friction.',
      'Separate reference time, publication time and SFI acquisition time.',
      'Do not infer individual persons from microdata or aggregate records.',
      'Do not claim causality from correlation or geographic co-movement.',
      'Use the supplied Cognitive Twin canon/rules only as method, never as evidence about Mexico.',
      'Return: observed structure, longitudinal contrasts, cross-domain contradictions, alternative hypotheses, missing variables, one prospectively testable prediction, and the evidence that would falsify it.',
      'All conclusions remain PROPOSED until independently verified and later confronted with an outcome.',
    ].join(' '),
    prompt: JSON.stringify({
      scenario,
      cutoffAt,
      referenceWindow: { start: referenceStart, end: referenceEnd },
      evidence: evidence.slice(-500),
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
    maxTokens: 1800,
  });

  const evidenceRefs = evidence.map((item) => item.id);
  const envelope = createCognitiveTwinEnvelope({
    taskId,
    status: llm.ok ? 'PROPOSED' : 'REJECTED',
    modelId: `${llm.provider}:${llm.model}`,
    result: {
      scenario,
      cutoffAt,
      referenceWindow: { start: referenceStart, end: referenceEnd },
      synthesis: llm.result,
      provider: llm.provider,
      model: llm.model,
      providerExecutionSucceeded: llm.ok,
      executedAgents: cycle.executedAgents,
      observationCount: evidence.length,
      agentContradictions: cycle.context.contradictions,
      agentPredictions: cycle.context.predictions,
      risks: cycle.context.risks,
      opportunities: cycle.context.opportunities,
    },
    limitations: [
      'INEGI evidence is official statistical evidence, not an SFI causal label.',
      'Backfilled records cannot be used as if SFI possessed them before fetched_at.',
      'Aggregate and microdata-derived statistics cannot identify or reconstruct individuals.',
      'Agent output is derived/inferred; LLM synthesis is PROPOSED.',
      ...corpusWarnings,
      ...llm.warnings,
    ],
    missingEvidence: evidence.length ? [] : [`inegi_evidence_for:${scenario.id}`],
    actionsExecuted: [
      ...cycle.executedAgents.map((agent) => `cognitive:${agent}`),
      'read_inegi_national_field',
      'read_canonical_cognitive_twin_corpus',
      llm.ok ? 'llm_national_synthesis' : 'llm_national_synthesis_failed',
    ],
    recommendedTransition: !llm.ok ? 'BLOCKED' : evidence.length ? 'VERIFYING' : 'EVIDENCE_PENDING',
  });

  const runStatus = !llm.ok ? 'BLOCKED' : evidence.length ? 'READY' : 'EVIDENCE_PENDING';
  const persisted = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: envelope.contractVersion,
    provider: llm.provider,
    model: llm.model,
    role: 'national_field_scenario_analysis',
    status: runStatus,
    objective: `${scenario.label}: ${scenario.question}`,
    input_snapshot: {
      scenarioId: scenario.id,
      cutoffAt,
      referenceStart,
      referenceEnd,
      requestedBy: input.requestedBy,
      observationCount: evidence.length,
      requestedAgents: NATIONAL_AGENT_SET,
      temporalKnowledgeRule: 'fetched_at <= cutoff and released_at <= cutoff when known',
    },
    output_envelope: envelope,
    evidence_refs: evidenceRefs.slice(0, 500),
    limitations: envelope.limitations,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  }).select('id,task_id,status,provider,model,role,objective,created_at').single();

  if (persisted.error) return { ok: false as const, error: `NATIONAL_FIELD_RUN_PERSISTENCE_FAILED:${persisted.error.message}`, envelope };

  return {
    ok: true as const,
    cognitiveExecution: llm.ok ? 'EXECUTED' as const : 'DEGRADED' as const,
    run: persisted.data,
    envelope,
    scenario,
    observationCount: evidence.length,
    evidenceRefs,
    agents: cycle.executedAgents,
    llm: { ok: llm.ok, provider: llm.provider, model: llm.model, latencyMs: llm.latency_ms, warnings: llm.warnings },
  };
}

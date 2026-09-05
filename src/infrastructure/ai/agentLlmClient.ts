import 'server-only';

import { runLlmTask, type LlmProviderId } from '@/lib/ai/providerRouter';
import { COGNITIVE_TWIN_CONTRACT_VERSION } from '@/core/cognitive-twin/contract';
import type { StudioTwinContext } from '@/core/cognitive-twin/studioContext';
import { readStudioTwinContext } from '@/core/cognitive-twin/studioContext';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { executionContractForAgent } from '@/lib/sfi/cognitive-runtime/executionContracts';
import { llmRequirementsForAgent } from '@/lib/sfi/cognitive-runtime/agentModelRequirements';
import { materialEvidenceView } from '@/lib/sfi/cognitive-runtime/materialEvidence';
import {
  compactObservedGenAiTelemetry,
  mapGenAiTelemetryToOpenTelemetry,
  normalizeObservedGenAiTelemetry,
} from '@/lib/sfi/cognitive-runtime/genAiTelemetry';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';

type SystemicInterventionCandidate = {
  title: string;
  rationale: string;
  evidenceRefs: string[];
  hardRules: string[];
  exceptions: string[];
  returnContract: string[];
  falsificationConditions: string[];
};

type AgentInsight = {
  status: 'COMPLETE' | 'DEGRADED' | 'FAILED';
  agentId: string;
  provider: string | null;
  model: string | null;
  summary: string | null;
  observations: string[];
  hypotheses: string[];
  contradictions: string[];
  rivalCauses: string[];
  systemicMechanism: string | null;
  missingEvidence: string[];
  recommendations: string[];
  interventions: SystemicInterventionCandidate[];
  confidence: number | null;
  epistemicClass: 'INFERENCE';
  warnings: string[];
  raw: string | null;
  generatedAt: string;
};

const MAX_PROMPT_CHARS = 7_500;
const MAX_AGENT_OUTPUT_TOKENS = 800;
const TWIN_RELEVANT_AGENTS = new Set([
  'historical_scout',
  'phenotype_resolver',
  'trajectory_agent',
  'reality_calibration',
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function strings(value: unknown, max = 8): string[] {
  return Array.isArray(value)
    ? value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean).slice(0, max)
    : [];
}
function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : null;
}
function stripFence(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
function interventionCandidates(value: unknown): SystemicInterventionCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((item) => {
    const candidate = record(item);
    const title = typeof candidate.title === 'string' ? candidate.title.trim().slice(0, 180) : '';
    const rationale = typeof candidate.rationale === 'string' ? candidate.rationale.trim().slice(0, 1_200) : '';
    if (!title || !rationale) return [];
    return [{
      title,
      rationale,
      evidenceRefs: strings(candidate.evidenceRefs, 12),
      hardRules: strings(candidate.hardRules, 8),
      exceptions: strings(candidate.exceptions, 8),
      returnContract: strings(candidate.returnContract, 10),
      falsificationConditions: strings(candidate.falsificationConditions, 8),
    }];
  });
}
function parseInsight(value: string): Omit<AgentInsight, 'status' | 'agentId' | 'provider' | 'model' | 'warnings' | 'raw' | 'generatedAt' | 'epistemicClass'> | null {
  try {
    const parsed = record(JSON.parse(stripFence(value)));
    return {
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim().slice(0, 1_400) : null,
      observations: strings(parsed.observations, 8),
      hypotheses: strings(parsed.hypotheses, 6),
      contradictions: strings(parsed.contradictions, 6),
      rivalCauses: strings(parsed.rivalCauses, 8),
      systemicMechanism: typeof parsed.systemicMechanism === 'string' && parsed.systemicMechanism.trim()
        ? parsed.systemicMechanism.trim().slice(0, 1_600)
        : null,
      missingEvidence: strings(parsed.missingEvidence, 6),
      recommendations: strings(parsed.recommendations, 6),
      interventions: interventionCandidates(parsed.interventions),
      confidence: number(parsed.confidence),
    };
  } catch {
    return null;
  }
}

function compactUnknown(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 420 ? `${value.slice(0, 420)}…[truncated]` : value;
  if (depth >= 4) return '[depth_limit]';
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => compactUnknown(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 16).map(([key, item]) => [key, compactUnknown(item, depth + 1)]));
  }
  return String(value).slice(0, 200);
}
function compactEvidence(context: KernelContext, max = 8) {
  const material = materialEvidenceView(context);
  const sourceClaims = context.evidence.filter((item) => String(record(item.payload).epistemicClass ?? '').toLowerCase() === 'source_claim');
  const selected = material.length
    ? [...material.slice(-max), ...sourceClaims.slice(-2)]
    : context.evidence.slice(-max);
  return selected.slice(-Math.max(max, 10)).map((item) => ({
    id: item.id,
    source: item.source,
    confidence: item.confidence,
    payload: compactUnknown(item.payload),
  }));
}
function compactTwin(twin: StudioTwinContext) {
  const extended = record(twin as unknown);
  return {
    contractVersion: twin.contractVersion,
    memory: twin.memory.slice(0, 4).map((item) => compactUnknown(item)),
    approvedDecisions: twin.decisions.slice(0, 3).map((item) => compactUnknown(item)),
    adaptiveLearning: compactUnknown(extended.adaptiveLearning),
    warnings: twin.warnings.slice(0, 3),
  };
}
function boundedPrompt(value: unknown) {
  const serialized = JSON.stringify(value);
  if (serialized.length <= MAX_PROMPT_CHARS) return serialized;
  return `${serialized.slice(0, MAX_PROMPT_CHARS)}\n[CONTEXT_TRUNCATED_BY_SFI_AT_${MAX_PROMPT_CHARS}_CHARS]`;
}
function providerPreference(value: unknown): LlmProviderId | undefined {
  const allowed: LlmProviderId[] = ['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface'];
  return typeof value === 'string' && allowed.includes(value as LlmProviderId) ? value as LlmProviderId : undefined;
}

async function resolveTwinContextForExecution(context: KernelContext): Promise<StudioTwinContext> {
  const spine = record(context.metadata?.cognitiveSpine);
  const explicitConsumption = typeof spine.ctSnapshotConsumed === 'boolean';
  const twinFromContext = context.metadata?.cognitiveTwinContext;
  const injectedTwin = twinFromContext && typeof twinFromContext === 'object' && !Array.isArray(twinFromContext)
    ? twinFromContext as StudioTwinContext
    : null;

  if (explicitConsumption) {
    if (spine.ctSnapshotConsumed === false) {
      return {
        contractVersion: COGNITIVE_TWIN_CONTRACT_VERSION,
        memory: [],
        decisions: [],
        warnings: ['cognitive_spine_snapshot_available_but_not_consumed'],
      };
    }
    if (!injectedTwin) throw new Error('COGNITIVE_SPINE_SEALED_TWIN_CONTEXT_REQUIRED');
    return injectedTwin;
  }

  return injectedTwin ?? await readStudioTwinContext();
}

function baseProjection(context: KernelContext) {
  const metadata = record(context.metadata);
  return {
    currentEvent: context.currentEvent,
    phenomenonId: context.phenomenonId ?? null,
    question: compactUnknown(metadata.question),
    objective: compactUnknown(metadata.objective),
    executionRequest: compactUnknown(metadata.executionRequest),
    declaredFunction: compactUnknown(metadata.declaredFunction),
    declaredTarget: compactUnknown(metadata.declaredTarget),
    declaredExclusions: compactUnknown(metadata.declaredExclusions),
    invariants: compactUnknown(metadata.invariants),
    constraints: compactUnknown(metadata.constraints),
    signal: compactUnknown(metadata.signal),
    materialEvidenceResolution: compactUnknown(metadata.materialEvidenceResolution),
  };
}

function projectContextForAgent(agentId: string, context: KernelContext, twin: StudioTwinContext | null) {
  const base = baseProjection(context);
  const evidence = compactEvidence(context);
  const hypotheses = context.hypotheses.slice(-6).map((item) => compactUnknown(item));
  const contradictions = context.contradictions.slice(-6).map((item) => compactUnknown(item));

  switch (agentId) {
    case 'evidence_hunter':
      return { ...base, observedEvidence: evidence, hypotheses, contradictions };
    case 'reality_calibration':
      return {
        ...base,
        observedEvidence: evidence,
        hypotheses,
        predictions: context.predictions.slice(-5).map((item) => compactUnknown(item)),
        cognitiveTwin: twin ? compactTwin(twin) : null,
      };
    case 'risk_agent':
      return {
        ...base,
        observedEvidence: evidence,
        hypotheses,
        contradictions,
        risksAlreadyDetected: context.risks.slice(-4).map((item) => compactUnknown(item)),
      };
    case 'field_observer':
      return { ...base, observedEvidence: evidence, contradictions };
    case 'friction_field_simulator':
    case 'temporal_resolver':
      return {
        ...base,
        observedEvidence: evidence,
        hypotheses,
        contradictions,
        risks: context.risks.slice(-4).map((item) => compactUnknown(item)),
        simulations: context.simulations.slice(-4).map((item) => compactUnknown(item)),
      };
    case 'opportunity_agent':
    case 'cultural_simulator':
    case 'economic_field_simulator':
      return {
        ...base,
        observedEvidence: evidence,
        hypotheses,
        contradictions,
        risks: context.risks.slice(-4).map((item) => compactUnknown(item)),
        simulations: context.simulations.slice(-4).map((item) => compactUnknown(item)),
        worldSpect: compactUnknown(context.metadata?.worldSpect),
      };
    default:
      return {
        ...base,
        observedEvidence: evidence,
        hypotheses,
        contradictions,
        simulations: context.simulations.slice(-3).map((item) => compactUnknown(item)),
        ...(twin ? { cognitiveTwin: compactTwin(twin) } : {}),
      };
  }
}

export async function augmentAgentWithLlm(agentId: string, context: KernelContext): Promise<KernelContext> {
  const governedUniversalAi = context.metadata?.ctSnapshotConsumed === true
    && context.metadata?.aiGovernancePolicyId === 'SFI-AIMS-2026-08';
  if (context.metadata?.llmAugmentation !== true && !governedUniversalAi) return context;
  if (agentId === 'meta_orchestrator') return context;

  const contract = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!contract) return context;
  const executionContract = executionContractForAgent(agentId);

  const twin = TWIN_RELEVANT_AGENTS.has(agentId) ? await resolveTwinContextForExecution(context) : null;
  const requestedProvider = providerPreference(context.metadata?.preferredLlmProvider);
  const requirements = llmRequirementsForAgent(agentId);
  const existingInsights = record(context.metadata?.agentInsights);
  const material = materialEvidenceView(context);

  const system = [
    'You are an executor inside the System Friction Institute Cognitive Runtime.',
    `Agent: ${contract.name} (${contract.id}). Purpose: ${contract.purpose}`,
    `Layer: ${contract.layer}. Domain: ${contract.domain}. Authority: ${contract.authorityLevel}.`,
    'Evidence before inference. Simulation is not observation. Missing evidence remains missing. Never invent measurements, history, lineage, causal relations, attractor attainment, completed interventions or RETURN outcomes.',
    'Persisted OBSERVED/DERIVED/CANONICAL/IMPORTED/EXTRACTED material supplied in the projection is reusable evidence. Do not ask the operator to re-upload or re-provide a dataset merely because it arrived through a selected Case, Cycle or evidence reference.',
    'Before declaring evidence missing, distinguish actual material absence from a provenance wrapper. Existing evidence must be reused before new evidence is requested.',
    'Treat deterministic metrics and persisted evidence as observations. Treat your interpretation, mechanisms, causal candidates and interventions as INFERENCE/PROPOSAL only.',
    'For material anomalies, reason through: OBSERVATION -> CONTRADICTION -> RIVAL CAUSES -> FRICTION -> SYSTEMIC MECHANISM -> INTERVENTION -> HARD RULE -> RETURN CONTRACT. Do not stop at generic recommendations such as automate, standardize or validate.',
    'Never collapse rival causes into a single attribution. For temporal inconsistencies consider, when applicable, retrospective capture, field semantics, migration, timezone, ETL/import and application defects before attributing human behavior.',
    'A HARD RULE must state a machine-testable invariant plus explicit legitimate exceptions and provenance requirements where correction/backfill/migration is possible.',
    'A RETURN CONTRACT must define observable post-intervention measures and time/recurrence checks. Never describe a future RETURN as already observed.',
    'Objects supplied as execution context are not automatically admitted evidence. Public research is a source candidate until evidence governance admits it.',
    'Cognitive Twin adaptive learning may contain evidence-complete calibrated candidates that are explicitly non-canonical. Use them as prior operational context, never as KernelEvidence, authority, or permanent truth.',
    ...(executionContract?.forbiddenClaims.map((rule) => `Execution-contract boundary: ${rule}`) ?? []),
    'Return ONLY valid JSON with this exact shape: {"summary":string|null,"observations":string[],"hypotheses":string[],"contradictions":string[],"rivalCauses":string[],"systemicMechanism":string|null,"missingEvidence":string[],"recommendations":string[],"interventions":[{"title":string,"rationale":string,"evidenceRefs":string[],"hardRules":string[],"exceptions":string[],"returnContract":string[],"falsificationConditions":string[]}],"confidence":number}.',
    'Keep it specific to the supplied evidence. If evidence does not justify an intervention, return interventions:[] instead of inventing one.',
  ].join('\n');

  const projection = projectContextForAgent(agentId, context, twin);
  const coverage = {
    evidenceAvailable: context.evidence.length,
    materialEvidenceResolved: material.length,
    evidenceDelivered: compactEvidence(context).length,
    hypothesesAvailable: context.hypotheses.length,
    hypothesesDelivered: Math.min(context.hypotheses.length, 6),
    contradictionsAvailable: context.contradictions.length,
    contradictionsDelivered: Math.min(context.contradictions.length, 6),
    predictionsAvailable: context.predictions.length,
    simulationsAvailable: context.simulations.length,
  };
  const promptValue = {
    task: context.metadata?.studioAction ?? 'analyze',
    agentProjection: projection,
    modelRequirements: requirements,
    contextBoundary: {
      maxPromptCharacters: MAX_PROMPT_CHARS,
      projection: `AGENT_SPECIFIC:${agentId}`,
      coverage,
      rule: 'Only evidence and state required for this role are supplied. Previous agent prose is not recursively injected. Persisted material evidence is resolved before missing-evidence conclusions.',
    },
  };
  const promptSourceCharacters = JSON.stringify(promptValue).length;
  const prompt = boundedPrompt(promptValue);
  const promptBounded = promptSourceCharacters > MAX_PROMPT_CHARS;

  const result = await runLlmTask({
    task: 'graph_interpretation',
    system,
    prompt,
    fallbackResult: '{"status":"LLM_UNAVAILABLE"}',
    preferredProvider: requestedProvider,
    requirements,
    maxTokens: MAX_AGENT_OUTPUT_TOKENS,
  });
  const telemetry = normalizeObservedGenAiTelemetry({
    ok: result.ok,
    provider: result.provider,
    model: result.model,
    usage: result.usage,
    latencyMs: result.latency_ms,
  });
  const telemetryOpenTelemetry = mapGenAiTelemetryToOpenTelemetry(telemetry);
  const parsed = result.ok ? parseInsight(result.result) : null;
  const generatedAt = new Date().toISOString();
  const insight: AgentInsight = parsed
    ? {
        status: 'COMPLETE',
        agentId,
        provider: result.provider,
        model: result.model,
        ...parsed,
        epistemicClass: 'INFERENCE',
        warnings: result.warnings,
        raw: null,
        generatedAt,
      }
    : {
        status: result.ok ? 'FAILED' : 'DEGRADED',
        agentId,
        provider: result.ok ? result.provider : null,
        model: result.ok ? result.model : null,
        summary: null,
        observations: [],
        hypotheses: [],
        contradictions: [],
        rivalCauses: [],
        systemicMechanism: null,
        missingEvidence: result.ok ? ['LLM_RESPONSE_SCHEMA_INVALID'] : ['LLM_PROVIDER_UNAVAILABLE'],
        recommendations: [],
        interventions: [],
        confidence: null,
        epistemicClass: 'INFERENCE',
        warnings: [...result.warnings, ...(result.ok ? ['invalid_json_schema'] : [])],
        raw: result.ok ? result.result.slice(0, 2_400) : null,
        generatedAt,
      };

  const llmCoverage = {
    ...coverage,
    promptSourceCharacters,
    promptCharacters: prompt.length,
    maxPromptCharacters: MAX_PROMPT_CHARS,
    promptBounded,
    promptProjection: `AGENT_SPECIFIC:${agentId}`,
  };

  context.metadata = {
    ...context.metadata,
    ...(twin ? { cognitiveTwinContext: twin } : {}),
    contextCoverage: {
      ...record(context.metadata?.contextCoverage),
      llm: llmCoverage,
    },
    agentInsights: {
      ...existingInsights,
      [agentId]: insight,
    },
    llmRuntime: {
      ...record(context.metadata?.llmRuntime),
      lastProvider: insight.provider,
      lastModel: insight.model,
      lastAgentId: agentId,
      lastStatus: insight.status,
      modelRequirements: requirements,
      explicitProviderOverride: requestedProvider ?? null,
      contextCoverage: llmCoverage,
      promptSourceCharacters,
      promptCharacters: prompt.length,
      promptBounded,
      promptProjection: `AGENT_SPECIFIC:${agentId}`,
      maxPromptCharacters: MAX_PROMPT_CHARS,
      maxOutputTokens: MAX_AGENT_OUTPUT_TOKENS,
      ...compactObservedGenAiTelemetry(telemetry),
      telemetryOpenTelemetry,
      updatedAt: generatedAt,
    },
  };

  return context;
}

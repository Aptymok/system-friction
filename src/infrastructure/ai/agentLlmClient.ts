import 'server-only';

import { runLlmTask, type LlmProviderId, type LlmRequirements } from '@/lib/ai/providerRouter';
import { COGNITIVE_TWIN_CONTRACT_VERSION } from '@/core/cognitive-twin/contract';
import type { StudioTwinContext } from '@/core/cognitive-twin/studioContext';
import { readStudioTwinContext } from '@/core/cognitive-twin/studioContext';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';

type AgentInsight = {
  status: 'COMPLETE' | 'DEGRADED' | 'FAILED';
  agentId: string;
  provider: string | null;
  model: string | null;
  summary: string | null;
  observations: string[];
  hypotheses: string[];
  contradictions: string[];
  missingEvidence: string[];
  recommendations: string[];
  confidence: number | null;
  epistemicClass: 'INFERENCE';
  warnings: string[];
  raw: string | null;
  generatedAt: string;
};

const MAX_PROMPT_CHARS = 6_000;
const MAX_AGENT_OUTPUT_TOKENS = 450;
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
function parseInsight(value: string): Omit<AgentInsight, 'status' | 'agentId' | 'provider' | 'model' | 'warnings' | 'raw' | 'generatedAt' | 'epistemicClass'> | null {
  try {
    const parsed = record(JSON.parse(stripFence(value)));
    return {
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim().slice(0, 1200) : null,
      observations: strings(parsed.observations, 6),
      hypotheses: strings(parsed.hypotheses, 4),
      contradictions: strings(parsed.contradictions, 4),
      missingEvidence: strings(parsed.missingEvidence, 5),
      recommendations: strings(parsed.recommendations, 5),
      confidence: number(parsed.confidence),
    };
  } catch {
    return null;
  }
}

function compactUnknown(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 320 ? `${value.slice(0, 320)}…[truncated]` : value;
  if (depth >= 3) return '[depth_limit]';
  if (Array.isArray(value)) return value.slice(0, 6).map((item) => compactUnknown(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 10).map(([key, item]) => [key, compactUnknown(item, depth + 1)]));
  }
  return String(value).slice(0, 160);
}
function compactEvidence(context: KernelContext, max = 6) {
  return context.evidence.slice(-max).map((item) => ({
    id: item.id,
    source: item.source,
    confidence: item.confidence,
    payload: compactUnknown(item.payload),
  }));
}
function compactTwin(twin: StudioTwinContext) {
  return {
    contractVersion: twin.contractVersion,
    memory: twin.memory.slice(0, 4).map((item) => compactUnknown(item)),
    approvedDecisions: twin.decisions.slice(0, 3).map((item) => compactUnknown(item)),
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

function requirementsForAgent(agentId: string): LlmRequirements {
  if (['risk_agent', 'economic_field_simulator', 'cross_impact', 'trajectory_agent', 'reality_calibration', 'phenotype_resolver'].includes(agentId)) {
    return { reasoning: true, structuredOutput: true, minContextTokens: 100_000, priority: 'quality' };
  }
  if (['evidence_hunter', 'field_observer', 'temporal_resolver', 'project_execution_manager'].includes(agentId)) {
    return { structuredOutput: true, priority: 'speed' };
  }
  if (['historical_scout', 'context_builder'].includes(agentId)) {
    return { reasoning: true, structuredOutput: true, minContextTokens: 100_000, priority: 'balanced' };
  }
  return { reasoning: true, structuredOutput: true, priority: 'balanced' };
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
    declaredFunction: compactUnknown(metadata.declaredFunction),
    declaredTarget: compactUnknown(metadata.declaredTarget),
    declaredExclusions: compactUnknown(metadata.declaredExclusions),
    invariants: compactUnknown(metadata.invariants),
    constraints: compactUnknown(metadata.constraints),
    signal: compactUnknown(metadata.signal),
  };
}

function projectContextForAgent(agentId: string, context: KernelContext, twin: StudioTwinContext | null) {
  const base = baseProjection(context);
  const evidence = compactEvidence(context);
  const hypotheses = context.hypotheses.slice(-5).map((item) => compactUnknown(item));
  const contradictions = context.contradictions.slice(-4).map((item) => compactUnknown(item));

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
      return {
        ...base,
        observedEvidence: evidence,
        hypotheses,
        risks: context.risks.slice(-4).map((item) => compactUnknown(item)),
        simulations: context.simulations.slice(-3).map((item) => compactUnknown(item)),
      };
    case 'opportunity_agent':
    case 'cultural_simulator':
    case 'economic_field_simulator':
      return {
        ...base,
        observedEvidence: evidence,
        hypotheses,
        risks: context.risks.slice(-4).map((item) => compactUnknown(item)),
        worldSpect: compactUnknown(context.metadata?.worldSpect),
      };
    default:
      return {
        ...base,
        observedEvidence: evidence,
        hypotheses,
        contradictions,
        ...(twin ? { cognitiveTwin: compactTwin(twin) } : {}),
      };
  }
}

export async function augmentAgentWithLlm(agentId: string, context: KernelContext): Promise<KernelContext> {
  if (context.metadata?.llmAugmentation !== true) return context;
  if (agentId === 'meta_orchestrator') return context;

  const contract = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!contract) return context;

  const twin = TWIN_RELEVANT_AGENTS.has(agentId) ? await resolveTwinContextForExecution(context) : null;
  // Explicit operator override remains possible, but agents are no longer bound to Groq (or any model) by default.
  const requestedProvider = providerPreference(context.metadata?.preferredLlmProvider);
  const requirements = requirementsForAgent(agentId);
  const existingInsights = record(context.metadata?.agentInsights);

  const system = [
    'You are an executor inside the System Friction Institute Cognitive Runtime.',
    `Agent: ${contract.name} (${contract.id}). Purpose: ${contract.purpose}`,
    `Layer: ${contract.layer}. Domain: ${contract.domain}. Authority: ${contract.authorityLevel}.`,
    'Evidence before inference. Simulation is not observation. Missing evidence remains missing. Never invent measurements, history, lineage, causal relations, attractor attainment, or completed actions.',
    'Treat deterministic metrics and persisted evidence as observations. Treat your interpretation as INFERENCE only.',
    'Return ONLY valid JSON: {"summary":string|null,"observations":string[],"hypotheses":string[],"contradictions":string[],"missingEvidence":string[],"recommendations":string[],"confidence":number}.',
    'Keep lists short and specific. Do not restate policy boilerplate in the analysis.',
  ].join('\n');

  const projection = projectContextForAgent(agentId, context, twin);
  const prompt = boundedPrompt({
    task: context.metadata?.studioAction ?? 'analyze',
    agentProjection: projection,
    modelRequirements: requirements,
    contextBoundary: {
      maxPromptCharacters: MAX_PROMPT_CHARS,
      projection: `AGENT_SPECIFIC:${agentId}`,
      rule: 'Only evidence and state required for this role are supplied. Previous agent prose is not recursively injected.',
    },
  });

  const result = await runLlmTask({
    task: 'graph_interpretation',
    system,
    prompt,
    fallbackResult: '{"status":"LLM_UNAVAILABLE"}',
    preferredProvider: requestedProvider,
    requirements,
    maxTokens: MAX_AGENT_OUTPUT_TOKENS,
  });
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
        missingEvidence: result.ok ? ['LLM_RESPONSE_SCHEMA_INVALID'] : ['LLM_PROVIDER_UNAVAILABLE'],
        recommendations: [],
        confidence: null,
        epistemicClass: 'INFERENCE',
        warnings: [...result.warnings, ...(result.ok ? ['invalid_json_schema'] : [])],
        raw: result.ok ? result.result.slice(0, 1800) : null,
        generatedAt,
      };

  context.metadata = {
    ...context.metadata,
    ...(twin ? { cognitiveTwinContext: twin } : {}),
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
      promptCharacters: prompt.length,
      promptBounded: prompt.length >= MAX_PROMPT_CHARS,
      promptProjection: `AGENT_SPECIFIC:${agentId}`,
      maxOutputTokens: MAX_AGENT_OUTPUT_TOKENS,
      updatedAt: generatedAt,
    },
  };

  return context;
}

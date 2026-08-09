import 'server-only';

import { runLlmTask, type LlmProviderId } from '@/lib/ai/providerRouter';
import type { StudioTwinContext } from '@/lib/cognitive-twin/studioContext';
import { readStudioTwinContext } from '@/lib/cognitive-twin/studioContext';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import type { KernelContext } from './kernelContext';

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
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim().slice(0, 1600) : null,
      observations: strings(parsed.observations, 8),
      hypotheses: strings(parsed.hypotheses, 6),
      contradictions: strings(parsed.contradictions, 6),
      missingEvidence: strings(parsed.missingEvidence, 6),
      recommendations: strings(parsed.recommendations, 6),
      confidence: number(parsed.confidence),
    };
  } catch {
    return null;
  }
}

function compactEvidence(context: KernelContext) {
  return context.evidence.slice(-30).map((item) => ({
    id: item.id,
    source: item.source,
    confidence: item.confidence,
    payload: item.payload,
  }));
}

function compactTwin(twin: StudioTwinContext) {
  return {
    contractVersion: twin.contractVersion,
    memory: twin.memory.slice(0, 24),
    approvedDecisions: twin.decisions.slice(0, 20),
    warnings: twin.warnings,
  };
}

function providerPreference(value: unknown): LlmProviderId | undefined {
  const allowed: LlmProviderId[] = ['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface'];
  return typeof value === 'string' && allowed.includes(value as LlmProviderId) ? value as LlmProviderId : undefined;
}

export async function augmentAgentWithLlm(agentId: string, context: KernelContext): Promise<KernelContext> {
  if (context.metadata?.llmAugmentation !== true) return context;
  if (agentId === 'meta_orchestrator') return context;

  const contract = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!contract) return context;

  const twinFromContext = context.metadata?.cognitiveTwinContext;
  const twin = twinFromContext && typeof twinFromContext === 'object'
    ? twinFromContext as StudioTwinContext
    : await readStudioTwinContext();
  const requestedProvider = providerPreference(context.metadata?.preferredLlmProvider) ?? 'groq';
  const studio = record(context.metadata?.studio);
  const existingInsights = record(context.metadata?.agentInsights);

  const system = [
    'You are an executor inside the System Friction Institute Cognitive Runtime.',
    `Agent: ${contract.name} (${contract.id}). Purpose: ${contract.purpose}`,
    `Layer: ${contract.layer}. Domain: ${contract.domain}. Authority: ${contract.authorityLevel}.`,
    'The Cognitive Twin contract is binding: evidence before inference; simulation is not observation; missing evidence remains missing; presentation is not state; never invent measurements, history, lineage, causal relations, attractor attainment, or completed actions.',
    'CANDIDATE Cognitive Twin memory is evidence-bound prior learning only. It is not VERIFIED or CANONICAL fact, must retain its status, and must never be promoted by the model. VERIFIED and CANONICAL memory remain distinct governed states.',
    'Treat deterministic metrics and persisted evidence as observations. Treat your interpretation as INFERENCE only.',
    'Do not issue irreversible actions. Do not claim that an object is ready for production unless explicit persisted checks support it.',
    'Return ONLY valid JSON using this schema: {"summary":string|null,"observations":string[],"hypotheses":string[],"contradictions":string[],"missingEvidence":string[],"recommendations":string[],"confidence":number}.',
    'Keep every list short and specific. If the evidence cannot support a claim, put the need in missingEvidence instead.',
  ].join('\n');

  const prompt = JSON.stringify({
    task: context.metadata?.studioAction ?? 'analyze',
    currentEvent: context.currentEvent,
    phenomenonId: context.phenomenonId ?? null,
    studio,
    observedEvidence: compactEvidence(context),
    deterministicHypotheses: context.hypotheses.slice(-12),
    deterministicContradictions: context.contradictions.slice(-12),
    simulations: context.simulations.slice(-12),
    predictions: context.predictions.slice(-12),
    risks: context.risks.slice(-12),
    opportunities: context.opportunities.slice(-12),
    cognitiveTwin: compactTwin(twin),
    previousAgentInsights: Object.fromEntries(Object.entries(existingInsights).slice(-8)),
  });

  const result = await runLlmTask({
    task: 'graph_interpretation',
    system,
    prompt,
    fallbackResult: '{"status":"LLM_UNAVAILABLE"}',
    preferredProvider: requestedProvider,
    maxTokens: 900,
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
        raw: result.ok ? result.result.slice(0, 3000) : null,
        generatedAt,
      };

  context.metadata = {
    ...context.metadata,
    cognitiveTwinContext: twin,
    agentInsights: {
      ...existingInsights,
      [agentId]: insight,
    },
    llmRuntime: {
      ...(record(context.metadata?.llmRuntime)),
      lastProvider: insight.provider,
      lastModel: insight.model,
      lastAgentId: agentId,
      lastStatus: insight.status,
      updatedAt: generatedAt,
    },
  };

  return context;
}

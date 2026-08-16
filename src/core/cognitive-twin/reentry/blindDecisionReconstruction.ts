import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { runLlmTask, type LlmProviderId } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalJson, decisionTraceCommitmentMaterial } from './decisionCommitment';
import { executeDecisionTransferEvaluation } from './decisionTransferRun';

const dispositionSchema = z.enum(['PROPOSE', 'REQUEST_EVIDENCE', 'ESCALATE', 'WITHHOLD', 'ARCHIVE_ONLY']);
const epistemicClassSchema = z.enum(['OBSERVED', 'VERIFIED_CONTRAST', 'DERIVED', 'INFERRED', 'SIMULATED']);
const providerSchema = z.enum(['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface']);

export const decisionTransferArmSchema = z.enum([
  'B0_BASE',
  'B1_RAW_HISTORY',
  'B2_MEMORY',
  'B3_CDT',
  'B4_PATTERNS',
  'B5_RULE_STRUCTURE',
  'CT_FULL',
]);
export type DecisionTransferArm = z.infer<typeof decisionTransferArmSchema>;

const evidenceItemSchema = z.object({
  ref: z.string().trim().min(1).max(500),
  summary: z.string().trim().min(1).max(8000),
  epistemicClass: epistemicClassSchema,
}).strict();

const currentCaseSchema = z.object({
  situation: z.string().trim().min(5).max(16000),
  priorState: z.string().trim().max(12000).optional(),
  evidence: z.array(evidenceItemSchema).max(120),
  constraints: z.array(z.string().trim().min(1).max(1200)).max(120).default([]),
}).strict();

const rawHistorySchema = z.object({
  ref: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1).max(12000),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
}).strict();

const memoryItemSchema = z.object({
  key: z.string().trim().min(1).max(500),
  content: z.unknown(),
  status: z.string().trim().min(1).max(80),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
}).strict();

const historicalTraceSchema = z.object({
  traceId: z.string().trim().min(1).max(240),
  domain: z.string().trim().min(1).max(160),
  disposition: dispositionSchema,
  operations: z.array(z.string().trim().min(1).max(240)).max(100),
  relevantVariables: z.array(z.string().trim().min(1).max(240)).max(100),
  rejectedConditions: z.array(z.string().trim().min(1).max(500)).max(100),
  whatWouldChangeDecision: z.array(z.string().trim().min(1).max(500)).max(100),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(300),
  epistemicClass: epistemicClassSchema,
}).strict();

const patternSchema = z.object({
  key: z.string().trim().min(1).max(500),
  maturity: z.string().trim().min(1).max(100),
  operations: z.array(z.string().trim().min(1).max(240)).max(100).default([]),
  domains: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(300).default([]),
}).strict();

const ruleSchema = z.object({
  key: z.string().trim().min(1).max(500),
  statement: z.string().trim().min(1).max(4000),
  constraints: z.array(z.string().trim().min(1).max(1200)).max(100).default([]),
  exceptions: z.array(z.string().trim().min(1).max(1200)).max(100).default([]),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(300).default([]),
}).strict();

const contextPoolSchema = z.object({
  currentCase: currentCaseSchema,
  rawHistory: z.array(rawHistorySchema).max(120).default([]),
  memory: z.array(memoryItemSchema).max(120).default([]),
  decisionTraces: z.array(historicalTraceSchema).max(120).default([]),
  patterns: z.array(patternSchema).max(120).default([]),
  rules: z.array(ruleSchema).max(120).default([]),
  operatingMode: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const blindDecisionRunInputSchema = z.object({
  experimentId: z.string().trim().min(1).max(240),
  targetTraceId: z.string().trim().min(1).max(240),
  targetDomain: z.string().trim().min(1).max(160),
  targetCommitmentSha256: z.string().regex(/^[0-9a-f]{64}$/i),
  arm: decisionTransferArmSchema,
  contextPool: contextPoolSchema,
  preferredProvider: providerSchema.optional(),
  strictProvider: z.boolean().default(true),
  maxTokens: z.number().int().min(200).max(2500).default(1000),
}).strict();
export type BlindDecisionRunInput = z.infer<typeof blindDecisionRunInputSchema>;

const predictionSchema = z.object({
  traceId: z.string().trim().min(1).max(240),
  disposition: dispositionSchema,
  operations: z.array(z.string().trim().min(1).max(240)).max(100),
  relevantVariables: z.array(z.string().trim().min(1).max(240)).max(100),
  rejectedConditions: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  whatWouldChangeDecision: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  confidence: z.number().finite().min(0).max(1).nullable().default(null),
}).strict();

const occurrenceSchema = z.object({
  occurrenceId: z.string().trim().min(1).max(240),
  operationKey: z.string().trim().min(1).max(240),
  traceId: z.string().trim().min(1).max(240),
  domain: z.string().trim().min(1).max(160),
  support: z.enum(['SUPPORT', 'COUNTEREXAMPLE']),
  epistemicClass: epistemicClassSchema,
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(500),
}).strict();

const counterfactualProbeSchema = z.object({
  probeId: z.string().trim().min(1).max(240),
  baseTraceId: z.string().trim().min(1).max(240),
  variableKey: z.string().trim().min(1).max(240),
  direction: z.enum(['INCREASE', 'DECREASE', 'TOGGLE', 'REPLACE']),
  baselineDisposition: dispositionSchema,
  expectedDispositionAfterPerturbation: dispositionSchema,
  predictedDispositionAfterPerturbation: dispositionSchema,
  epistemicClass: z.enum(['OBSERVED', 'VERIFIED_CONTRAST', 'SIMULATED', 'DERIVED']),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(500),
}).strict();

const targetTraceSchema = historicalTraceSchema;
const thresholdSchema = z.number().finite().min(0).max(1);

export const blindDecisionRevealInputSchema = z.object({
  blindRunId: z.string().uuid(),
  target: targetTraceSchema,
  commitmentSalt: z.string().min(16).max(256),
  operationKey: z.string().trim().min(1).max(240),
  occurrences: z.array(occurrenceSchema).max(2000),
  counterfactualProbes: z.array(counterfactualProbeSchema).max(1000),
  boundaryProbeCount: z.number().int().min(0).max(100000),
  thresholds: z.object({
    minimumDecisionAccuracy: thresholdSchema.optional(),
    minimumStructuralFidelity: thresholdSchema.optional(),
    minimumCounterfactualTargetAccuracy: thresholdSchema.optional(),
  }).strict().optional(),
}).strict();
export type BlindDecisionRevealInput = z.infer<typeof blindDecisionRevealInputSchema>;

const FORBIDDEN_CONTEXT_KEYS = new Set([
  'targetDisposition',
  'expectedDisposition',
  'observedDisposition',
  'groundTruthDisposition',
  'targetDecision',
  'expectedDecision',
  'observedDecision',
  'groundTruth',
  'answerKey',
  'revealedTarget',
]);

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function inspectForbiddenKeys(value: unknown, path = 'contextPool') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectForbiddenKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_CONTEXT_KEYS.has(key)) throw new Error(`BLIND_CONTEXT_TARGET_KEY_FORBIDDEN:${path}.${key}`);
    inspectForbiddenKeys(child, `${path}.${key}`);
  }
}

function selectedContext(input: BlindDecisionRunInput) {
  const source = input.contextPool;
  const selected: Record<string, unknown> = { currentCase: source.currentCase };
  if (input.arm !== 'B0_BASE') selected.rawHistory = source.rawHistory;
  if (['B2_MEMORY', 'B3_CDT', 'B4_PATTERNS', 'B5_RULE_STRUCTURE', 'CT_FULL'].includes(input.arm)) selected.memory = source.memory;
  if (['B3_CDT', 'B4_PATTERNS', 'B5_RULE_STRUCTURE', 'CT_FULL'].includes(input.arm)) selected.decisionTraces = source.decisionTraces;
  if (['B4_PATTERNS', 'B5_RULE_STRUCTURE', 'CT_FULL'].includes(input.arm)) selected.patterns = source.patterns;
  if (['B5_RULE_STRUCTURE', 'CT_FULL'].includes(input.arm)) selected.rules = source.rules;
  if (input.arm === 'CT_FULL' && source.operatingMode) selected.operatingMode = source.operatingMode;
  return selected;
}

function selectedEvidenceRefs(context: Record<string, unknown>): string[] {
  const refs: string[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.ref === 'string') refs.push(record.ref);
    if (Array.isArray(record.evidenceRefs)) refs.push(...record.evidenceRefs.filter((item): item is string => typeof item === 'string'));
    Object.values(record).forEach(walk);
  };
  walk(context);
  return unique(refs);
}

function parsePrediction(raw: string, targetTraceId: string) {
  const fenced = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('BLIND_PREDICTION_JSON_MISSING');
  let value: unknown;
  try {
    value = JSON.parse(fenced.slice(start, end + 1));
  } catch {
    throw new Error('BLIND_PREDICTION_JSON_INVALID');
  }
  const parsed = predictionSchema.parse(value);
  if (parsed.traceId !== targetTraceId) throw new Error('BLIND_PREDICTION_TRACE_ID_MISMATCH');
  return parsed;
}

function buildPrompt(input: BlindDecisionRunInput, context: Record<string, unknown>) {
  return [
    `EXPERIMENT: ${input.experimentId}`,
    `TREATMENT ARM: ${input.arm}`,
    `TARGET TRACE ID: ${input.targetTraceId}`,
    `TARGET DOMAIN: ${input.targetDomain}`,
    '',
    'The observed target decision has been cryptographically committed but is NOT available to you. Reconstruct the decision from the supplied pre-reveal context only.',
    'Do not infer an answer from experiment labels, IDs or hidden-answer assumptions. Do not invent facts. If evidence is insufficient, that uncertainty must be reflected in disposition/operations/confidence.',
    '',
    'PRE-REVEAL CONTEXT:',
    JSON.stringify(context, null, 2),
    '',
    'Return ONLY one JSON object with exactly this shape:',
    JSON.stringify({
      traceId: input.targetTraceId,
      disposition: 'PROPOSE | REQUEST_EVIDENCE | ESCALATE | WITHHOLD | ARCHIVE_ONLY',
      operations: ['operation_key'],
      relevantVariables: ['variable_key'],
      rejectedConditions: ['condition'],
      whatWouldChangeDecision: ['condition'],
      confidence: 0.0,
    }, null, 2),
  ].join('\n');
}

export function parseBlindDecisionRunInput(value: unknown): BlindDecisionRunInput {
  const parsed = blindDecisionRunInputSchema.parse(value);
  inspectForbiddenKeys(parsed.contextPool);
  if (parsed.contextPool.decisionTraces.some((trace) => trace.traceId === parsed.targetTraceId)) {
    throw new Error('BLIND_CONTEXT_CONTAINS_TARGET_TRACE');
  }
  return parsed;
}

export function parseBlindDecisionRevealInput(value: unknown): BlindDecisionRevealInput {
  return blindDecisionRevealInputSchema.parse(value);
}

export async function executeBlindDecisionReconstruction(input: BlindDecisionRunInput) {
  const context = selectedContext(input);
  const contextHash = sha256(canonicalJson(context));
  const contextPoolHash = sha256(canonicalJson(input.contextPool));
  const evidenceRefs = selectedEvidenceRefs(context);
  const llm = await runLlmTask({
    task: 'prediction',
    system: 'You are the SFI blind decision reconstructor. The target outcome is withheld. Reconstruct only from supplied context. Return JSON only. Never claim subjective experience or identity. Never turn model output into evidence.',
    prompt: buildPrompt(input, context),
    fallbackResult: '{}',
    preferredProvider: input.preferredProvider as LlmProviderId | undefined,
    maxTokens: input.maxTokens,
  });
  if (!llm.ok) throw new Error(`BLIND_LLM_PROVIDER_UNAVAILABLE:${llm.warnings.join(' · ')}`);
  if (input.preferredProvider && input.strictProvider && llm.provider !== input.preferredProvider) {
    throw new Error(`BLIND_PROVIDER_FALLBACK_REJECTED:${input.preferredProvider}->${llm.provider}`);
  }
  const prediction = parsePrediction(llm.result, input.targetTraceId);
  const predictionHash = sha256(canonicalJson(prediction));
  const taskId = `DT-BLIND-${randomUUID()}`;
  const startedAt = new Date().toISOString();
  const db = createServiceSupabaseClient();
  const insert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: 'SFI-CT-BLIND-DECISION-1.0',
    provider: llm.provider,
    model: llm.model,
    role: 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR',
    status: 'EVIDENCE_PENDING',
    objective: `Blindly reconstruct ${input.targetTraceId} under treatment arm ${input.arm} before target reveal.`,
    input_snapshot: {
      experimentId: input.experimentId,
      targetTraceId: input.targetTraceId,
      targetDomain: input.targetDomain,
      targetCommitmentSha256: input.targetCommitmentSha256.toLowerCase(),
      arm: input.arm,
      selectedContext: context,
      selectedContextHash: contextHash,
      contextPoolHash,
      strictProvider: input.strictProvider,
      preferredProvider: input.preferredProvider ?? null,
      protocolBoundary: 'TARGET_DECISION_ABSENT_UNTIL_COMMITMENT_VERIFIED_REVEAL',
    },
    output_envelope: {
      prediction,
      predictionHash,
      provider: llm.provider,
      model: llm.model,
      usage: llm.usage,
      latencyMs: llm.latency_ms,
      warnings: llm.warnings,
      epistemicClass: 'INFERRED',
      revealed: false,
    },
    evidence_refs: evidenceRefs,
    limitations: [
      'Cryptographic commitment proves the revealed target matches the pre-run commitment; it cannot prove that free-text context was semantically uncontaminated.',
      'The reconstruction is INFERRED and is not evidence, memory, canon or authority.',
      'Provider/model identity is persisted so treatment arms can be compared without silently mixing engines.',
    ],
    started_at: startedAt,
  }).select('id').single();
  if (insert.error || !insert.data?.id) throw new Error(`BLIND_RUN_PERSIST_FAILED:${insert.error?.message ?? 'unknown'}`);

  return {
    ok: true as const,
    runId: String(insert.data.id),
    taskId,
    experimentId: input.experimentId,
    arm: input.arm,
    provider: llm.provider,
    model: llm.model,
    targetTraceId: input.targetTraceId,
    targetDomain: input.targetDomain,
    targetCommitmentSha256: input.targetCommitmentSha256.toLowerCase(),
    selectedContextHash: contextHash,
    predictionHash,
    prediction,
    evidenceRefs,
    epistemicClass: 'INFERRED' as const,
    status: 'EVIDENCE_PENDING' as const,
  };
}

export async function executeBlindDecisionReveal(input: BlindDecisionRevealInput, actorId: string) {
  const db = createServiceSupabaseClient();
  const read = await db.from('sfi_cognitive_twin_runs')
    .select('id,task_id,contract_version,provider,model,role,status,input_snapshot,output_envelope,evidence_refs,started_at')
    .eq('id', input.blindRunId)
    .eq('role', 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR')
    .maybeSingle();
  if (read.error || !read.data) throw new Error(`BLIND_RUN_NOT_FOUND:${read.error?.message ?? input.blindRunId}`);
  if (read.data.status !== 'EVIDENCE_PENDING') throw new Error(`BLIND_RUN_NOT_REVEALABLE:${read.data.status}`);

  const snapshot = (read.data.input_snapshot ?? {}) as Record<string, unknown>;
  const output = (read.data.output_envelope ?? {}) as Record<string, unknown>;
  const targetTraceId = typeof snapshot.targetTraceId === 'string' ? snapshot.targetTraceId : '';
  const targetDomain = typeof snapshot.targetDomain === 'string' ? snapshot.targetDomain : '';
  const commitment = typeof snapshot.targetCommitmentSha256 === 'string' ? snapshot.targetCommitmentSha256.toLowerCase() : '';
  if (input.target.traceId !== targetTraceId) throw new Error('BLIND_REVEAL_TRACE_ID_MISMATCH');
  if (input.target.domain !== targetDomain) throw new Error('BLIND_REVEAL_DOMAIN_MISMATCH');
  const revealedCommitment = sha256(decisionTraceCommitmentMaterial(input.target, input.commitmentSalt));
  if (revealedCommitment !== commitment) throw new Error('BLIND_REVEAL_COMMITMENT_MISMATCH');
  const prediction = predictionSchema.parse(output.prediction);
  const predictionHash = sha256(canonicalJson(prediction));
  if (predictionHash !== output.predictionHash) throw new Error('BLIND_PREDICTION_INTEGRITY_MISMATCH');

  const lock = await db.from('sfi_cognitive_twin_runs')
    .update({ status: 'VERIFYING' })
    .eq('id', input.blindRunId)
    .eq('status', 'EVIDENCE_PENDING')
    .select('id')
    .maybeSingle();
  if (lock.error || !lock.data) throw new Error(`BLIND_REVEAL_LOCK_FAILED:${lock.error?.message ?? 'concurrent_or_already_revealed'}`);

  try {
    const evaluation = await executeDecisionTransferEvaluation({
      provider: typeof read.data.provider === 'string' ? read.data.provider : 'unknown',
      model: typeof read.data.model === 'string' ? read.data.model : 'unknown',
      operationKey: input.operationKey,
      expected: [{ ...input.target, evidenceRefs: unique([...input.target.evidenceRefs, `blind-run:${input.blindRunId}`]) }],
      predicted: [prediction],
      occurrences: input.occurrences,
      counterfactualProbes: input.counterfactualProbes,
      boundaryProbeCount: input.boundaryProbeCount,
      thresholds: input.thresholds,
    }, actorId);

    const revealedAt = new Date().toISOString();
    const finalize = await db.from('sfi_cognitive_twin_runs').update({
      status: 'CLOSED',
      finished_at: revealedAt,
      output_envelope: {
        ...output,
        revealed: true,
        reveal: {
          revealedAt,
          targetCommitmentSha256: revealedCommitment,
          targetHash: sha256(canonicalJson(input.target)),
          evaluationId: evaluation.evaluationId,
          evaluationRunId: evaluation.runId,
          outcome: evaluation.outcome,
        },
      },
    }).eq('id', input.blindRunId).eq('status', 'VERIFYING');
    if (finalize.error) {
      throw new Error(`BLIND_REVEAL_FINALIZE_FAILED:${finalize.error.message}:evaluation=${evaluation.evaluationId}`);
    }

    return {
      ok: true as const,
      blindRunId: input.blindRunId,
      blindTaskId: String(read.data.task_id),
      experimentId: typeof snapshot.experimentId === 'string' ? snapshot.experimentId : null,
      arm: typeof snapshot.arm === 'string' ? snapshot.arm : null,
      prediction,
      predictionHash,
      targetCommitmentSha256: revealedCommitment,
      evaluation,
      status: 'CLOSED' as const,
    };
  } catch (error) {
    if (!(error instanceof Error && error.message.startsWith('BLIND_REVEAL_FINALIZE_FAILED:'))) {
      await db.from('sfi_cognitive_twin_runs').update({ status: 'EVIDENCE_PENDING' }).eq('id', input.blindRunId).eq('status', 'VERIFYING');
    }
    throw error;
  }
}

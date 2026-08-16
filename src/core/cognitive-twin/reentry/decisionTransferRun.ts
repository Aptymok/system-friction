import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  buildDecisionTransferEvaluation,
  evaluateCounterfactualProbes,
  evaluateDecisionHoldout,
  evaluateOperationPromotion,
  type DecisionTransferEvaluation,
} from './decisionTransfer';

const dispositionSchema = z.enum(['PROPOSE', 'REQUEST_EVIDENCE', 'ESCALATE', 'WITHHOLD', 'ARCHIVE_ONLY']);
const epistemicClassSchema = z.enum(['OBSERVED', 'VERIFIED_CONTRAST', 'DERIVED', 'INFERRED', 'SIMULATED']);

const decisionTraceSchema = z.object({
  traceId: z.string().trim().min(1).max(240),
  domain: z.string().trim().min(1).max(160),
  disposition: dispositionSchema,
  operations: z.array(z.string().trim().min(1).max(240)).max(100),
  relevantVariables: z.array(z.string().trim().min(1).max(240)).max(100),
  rejectedConditions: z.array(z.string().trim().min(1).max(500)).max(100),
  whatWouldChangeDecision: z.array(z.string().trim().min(1).max(500)).max(100),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(500),
  epistemicClass: epistemicClassSchema,
}).strict();

const reconstructionSchema = z.object({
  traceId: z.string().trim().min(1).max(240),
  disposition: dispositionSchema,
  operations: z.array(z.string().trim().min(1).max(240)).max(100),
  relevantVariables: z.array(z.string().trim().min(1).max(240)).max(100),
  rejectedConditions: z.array(z.string().trim().min(1).max(500)).max(100).optional(),
  whatWouldChangeDecision: z.array(z.string().trim().min(1).max(500)).max(100).optional(),
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

const probeSchema = z.object({
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

const thresholdSchema = z.number().finite().min(0).max(1);
const hashSchema = z.string().regex(/^[0-9a-f]{64}$/i);
const evaluationEvidenceSchema = z.object({
  protocol: z.literal('SFI-DT-EVIDENCE-MATERIALIZATION-1.0'),
  materializationRunId: z.string().uuid(),
  receiptHash: hashSchema,
  evidencePoolHash: hashSchema,
  validationStatus: z.enum(['QUALIFIED', 'BLOCKED']),
  boundaryValidationStatus: z.enum(['QUALIFIED', 'BLOCKED']),
}).strict();

export const decisionTransferRunInputSchema = z.object({
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(240),
  operationKey: z.string().trim().min(1).max(240),
  expected: z.array(decisionTraceSchema).min(1).max(500),
  predicted: z.array(reconstructionSchema).max(500),
  occurrences: z.array(occurrenceSchema).max(2000),
  counterfactualProbes: z.array(probeSchema).max(1000),
  boundaryProbeCount: z.number().int().min(0).max(100000),
  thresholds: z.object({
    minimumDecisionAccuracy: thresholdSchema.optional(),
    minimumStructuralFidelity: thresholdSchema.optional(),
    minimumCounterfactualTargetAccuracy: thresholdSchema.optional(),
  }).strict().optional(),
  experimentalMode: z.enum(['CONFIRMATORY_FROZEN', 'NON_CONFIRMATORY_DIAGNOSTIC']).optional(),
  evaluationEvidence: evaluationEvidenceSchema.optional(),
}).strict();

export type DecisionTransferRunInput = z.infer<typeof decisionTransferRunInputSchema>;

type EvaluationOutcome = 'PASS' | 'FAIL' | 'BLOCKED';
type EvaluationMode = 'CONFIRMATORY_FROZEN' | 'NON_CONFIRMATORY_DIAGNOSTIC';

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function classifyOutcome(evaluation: DecisionTransferEvaluation): EvaluationOutcome {
  const validationReady = evaluation.holdout.validatedTraceCount > 0
    && evaluation.promotion.qualifyingSupportCount > 0
    && evaluation.counterfactual.validatedExpectedSwitchCount > 0;
  if (!validationReady) return 'BLOCKED';
  return evaluation.pass ? 'PASS' : 'FAIL';
}

async function compensateInsert(table: 'sfi_cognitive_twin_runs' | 'sfi_cognitive_twin_evaluations', id: string | null) {
  if (!id) return;
  const db = createServiceSupabaseClient();
  await db.from(table).delete().eq('id', id);
}

export function parseDecisionTransferRunInput(value: unknown): DecisionTransferRunInput {
  return decisionTransferRunInputSchema.parse(value);
}

export async function executeDecisionTransferEvaluation(input: DecisionTransferRunInput, actorId: string) {
  const experimentalMode: EvaluationMode = input.experimentalMode
    ?? (input.evaluationEvidence ? 'CONFIRMATORY_FROZEN' : 'NON_CONFIRMATORY_DIAGNOSTIC');
  if (experimentalMode === 'CONFIRMATORY_FROZEN' && !input.evaluationEvidence) {
    throw new Error('DECISION_TRANSFER_CONFIRMATORY_EVIDENCE_LINEAGE_REQUIRED');
  }
  if (experimentalMode === 'NON_CONFIRMATORY_DIAGNOSTIC' && input.evaluationEvidence) {
    throw new Error('DECISION_TRANSFER_DIAGNOSTIC_EVIDENCE_LINEAGE_FORBIDDEN');
  }

  const holdout = evaluateDecisionHoldout({ expected: input.expected, predicted: input.predicted });
  const counterfactual = evaluateCounterfactualProbes(input.counterfactualProbes);
  const promotion = evaluateOperationPromotion({
    operationKey: input.operationKey,
    occurrences: input.occurrences,
    boundaryProbeCount: input.boundaryProbeCount,
  });
  const rawEvaluation = buildDecisionTransferEvaluation({
    holdout,
    counterfactual,
    promotion,
    thresholds: input.thresholds,
  });
  const boundaryBlocked = input.evaluationEvidence?.boundaryValidationStatus === 'BLOCKED';
  const evaluation = boundaryBlocked
    ? {
        ...rawEvaluation,
        counterfactual: {
          ...rawEvaluation.counterfactual,
          validatedTargetDispositionAccuracy: null,
        },
      }
    : rawEvaluation;
  const outcome: EvaluationOutcome = boundaryBlocked ? 'BLOCKED' : classifyOutcome(rawEvaluation);
  const evidenceRefs = unique([
    ...input.expected.flatMap((item) => item.evidenceRefs),
    ...input.occurrences.flatMap((item) => item.evidenceRefs),
    ...input.counterfactualProbes.flatMap((item) => item.evidenceRefs),
  ]);
  const taskId = `DT-${randomUUID()}`;
  const startedAt = new Date().toISOString();
  const finishedAt = startedAt;
  const inputHash = hash({ ...input, experimentalMode });
  const db = createServiceSupabaseClient();

  const runInsert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: rawEvaluation.schemaVersion,
    provider: input.provider,
    model: input.model,
    role: 'DECISION_TRANSFER_EVALUATOR',
    status: 'CLOSED',
    objective: `Evaluate withheld decision reconstruction and decision-boundary transfer for ${input.operationKey}.`,
    input_snapshot: {
      ...input,
      experimentalMode,
      inputHash,
      holdoutPolicy: 'TARGET_DECISION_MUST_BE_EXCLUDED_FROM_RECONSTRUCTION_CONTEXT_UNTIL_REVEAL',
      evaluationStage: 'POST_REVEAL_SCORING',
    },
    output_envelope: {
      operationKey: input.operationKey,
      outcome,
      evaluation,
      inputHash,
      experimentalMode,
      evaluationEvidence: input.evaluationEvidence ?? null,
    },
    evidence_refs: evidenceRefs,
    limitations: rawEvaluation.limitations,
    started_at: startedAt,
    finished_at: finishedAt,
  }).select('id').single();
  if (runInsert.error || !runInsert.data?.id) {
    throw new Error(`DECISION_TRANSFER_RUN_PERSIST_FAILED:${runInsert.error?.message ?? 'unknown'}`);
  }
  const runId = String(runInsert.data.id);

  const evaluationInsert = await db.from('sfi_cognitive_twin_evaluations').insert({
    provider: input.provider,
    model: input.model,
    test_key: `decision_transfer:${input.operationKey}`,
    test_version: rawEvaluation.schemaVersion,
    outcome,
    observed_result: {
      operationKey: input.operationKey,
      taskId,
      runId,
      inputHash,
      experimentalMode,
      evaluation,
      evaluationEvidence: input.evaluationEvidence ?? null,
    },
    evidence_refs: evidenceRefs,
    executor: actorId,
  }).select('id').single();
  if (evaluationInsert.error || !evaluationInsert.data?.id) {
    await compensateInsert('sfi_cognitive_twin_runs', runId);
    throw new Error(`DECISION_TRANSFER_EVALUATION_PERSIST_FAILED:${evaluationInsert.error?.message ?? 'unknown'}`);
  }
  const evaluationId = String(evaluationInsert.data.id);

  const labInsert = await db.from('sfi_lab_analyses').insert({
    mode: 'ct_reentry',
    source: `sfi_cognitive_twin_evaluations:${evaluationId}`,
    data_mode: 'DERIVED',
    systems: ['cognitive_twin', 'decision_transfer_observatory', input.provider, input.model],
    variables: unique([
      'decision_accuracy',
      'structural_fidelity',
      'operation_similarity',
      'variable_similarity',
      'counterfactual_target_accuracy',
      input.operationKey,
    ]),
    limitations: rawEvaluation.limitations,
    recommendations: outcome === 'BLOCKED'
      ? ['Collect OBSERVED or VERIFIED_CONTRAST holdout traces, qualifying operation support and at least one observed/verified decision-boundary switch before validation.']
      : ['Compare this evaluation against declared baseline arms before making any transfer claim or governed promotion request.'],
    raw_analysis: {
      protocol: 'decision_transfer',
      schemaVersion: rawEvaluation.schemaVersion,
      operationKey: input.operationKey,
      taskId,
      runId,
      evaluationId,
      provider: input.provider,
      model: input.model,
      outcome,
      inputHash,
      epistemicClass: 'DERIVED',
      experimentalMode,
      evaluation,
      evaluationEvidence: input.evaluationEvidence ?? null,
      promotionAllowed: false,
    },
  }).select('id').single();
  if (labInsert.error || !labInsert.data?.id) {
    await compensateInsert('sfi_cognitive_twin_evaluations', evaluationId);
    await compensateInsert('sfi_cognitive_twin_runs', runId);
    throw new Error(`DECISION_TRANSFER_LAB_PROJECTION_FAILED:${labInsert.error?.message ?? 'unknown'}`);
  }

  return {
    ok: true as const,
    taskId,
    runId,
    evaluationId,
    labAnalysisId: String(labInsert.data.id),
    operationKey: input.operationKey,
    provider: input.provider,
    model: input.model,
    outcome,
    experimentalMode,
    evaluation,
    evaluationEvidence: input.evaluationEvidence ?? null,
    evidenceRefs,
    claimBoundary: 'This result is a governed DERIVED evaluation. SIMULATED/DERIVED inputs may remain diagnostic but cannot satisfy validation gates, promote a rule, mutate canonical memory or expand authority.',
  };
}

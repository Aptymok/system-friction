import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalJson } from './decisionCommitment';
import {
  SFI_DT_BLIND_PROMPT_TEMPLATE_SHA256,
  SFI_DT_BLIND_SYSTEM_PROMPT_SHA256,
  SFI_DT_CONFIRMATORY_MODEL,
  SFI_DT_PROTOCOL_VERSION,
} from './decisionTransferExperimentFreeze';
import type {
  CounterfactualProbe,
  DecisionTrace,
  DecisionTraceEpistemicClass,
  OperationOccurrence,
} from './decisionTransfer';

type Row = Record<string, unknown>;
type EvidenceClass = DecisionTraceEpistemicClass;
type ReceiptValidationStatus = 'QUALIFIED' | 'BLOCKED';

const dispositionSchema = z.enum(['PROPOSE', 'REQUEST_EVIDENCE', 'ESCALATE', 'WITHHOLD', 'ARCHIVE_ONLY']);
const epistemicClassSchema = z.enum(['OBSERVED', 'VERIFIED_CONTRAST', 'DERIVED', 'INFERRED', 'SIMULATED']);

const targetTraceSchema = z.object({
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

export const decisionTransferConfirmatoryRevealInputSchema = z.object({
  blindRunId: z.string().uuid(),
  target: targetTraceSchema,
  commitmentSalt: z.string().min(16).max(256),
  operationKey: z.string().trim().min(1).max(240),
}).strict().superRefine((value, ctx) => {
  if (value.target.epistemicClass !== 'OBSERVED') {
    ctx.addIssue({
      code: 'custom',
      path: ['target', 'epistemicClass'],
      message: 'confirmatory target must be OBSERVED',
    });
  }
  if (!value.target.operations.includes(value.operationKey)) {
    ctx.addIssue({
      code: 'custom',
      path: ['operationKey'],
      message: 'operationKey must be present in the observed target operations',
    });
  }
});

export type DecisionTransferConfirmatoryRevealInput = z.infer<typeof decisionTransferConfirmatoryRevealInputSchema>;

type CandidateOccurrence = OperationOccurrence & {
  sourceRecordId: string;
};

type CandidateProbe = CounterfactualProbe & {
  sourceRecordId: string;
};

type Grounding = {
  evidenceIds: string[];
  eventIds: string[];
  observedEventIds: string[];
};

export type DecisionTransferEvaluationEvidenceReceipt = {
  protocol: 'SFI-DT-EVIDENCE-MATERIALIZATION-1.0';
  experimentId: string;
  blindRunId: string;
  targetTraceId: string;
  operationKey: string;
  contextReceiptHash: string;
  targetTimingProofHash: string;
  modelContractHash: string;
  materializedAt: string;

  recordsSeen: number;
  uniqueEvidenceObjects: number;
  uniqueEvents: number;
  independentObservationGroups: number;

  occurrences: OperationOccurrence[];
  supports: OperationOccurrence[];
  counterexamples: OperationOccurrence[];
  contrasts: OperationOccurrence[];
  empiricalBoundaryProbes: CounterfactualProbe[];
  diagnosticCounterfactuals: CounterfactualProbe[];

  evidenceIds: string[];
  eventIds: string[];
  sourceStores: string[];
  epistemicClasses: EvidenceClass[];

  qualifyingOccurrenceCount: number;
  qualifyingDomainCount: number;
  qualifyingCounterexampleCount: number;
  qualifyingContrastCount: number;
  qualifyingBoundaryProbeCount: number;

  boundaryValidationStatus: ReceiptValidationStatus;
  validationStatus: ReceiptValidationStatus;
  blockReasons: string[];

  evidencePoolHash: string;
  receiptHash: string;
};

const ROOT_EVIDENCE_PREFIX = 'root_evidence_entries:';
const VALIDATION_CLASSES = new Set<EvidenceClass>(['OBSERVED', 'VERIFIED_CONTRAST']);

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function assertFrozenModelContract(blindSnapshot: Row, providerValue: unknown, modelValue: unknown) {
  const contract = record(blindSnapshot.experimentalFreeze);
  const contractHash = text(contract.contractHash);
  if (!contractHash) throw new Error('DT_EVIDENCE_MODEL_CONTRACT_MISSING');
  const { contractHash: _contractHash, ...contractBase } = contract;
  if (sha256(canonicalJson(contractBase)) !== contractHash) {
    throw new Error('DT_EVIDENCE_MODEL_CONTRACT_INTEGRITY_MISMATCH');
  }
  if (text(contract.protocolVersion) !== SFI_DT_PROTOCOL_VERSION) {
    throw new Error('DT_EVIDENCE_MODEL_PROTOCOL_MISMATCH');
  }
  if (text(contract.provider) !== SFI_DT_CONFIRMATORY_MODEL.provider) {
    throw new Error('DT_EVIDENCE_MODEL_PROVIDER_MISMATCH');
  }
  if (
    text(contract.expectedModel) !== SFI_DT_CONFIRMATORY_MODEL.expectedModel
    || text(contract.actualModel) !== SFI_DT_CONFIRMATORY_MODEL.expectedModel
  ) {
    throw new Error('DT_EVIDENCE_MODEL_EXPECTED_MODEL_MISMATCH');
  }
  if (
    text(providerValue) !== SFI_DT_CONFIRMATORY_MODEL.provider
    || text(modelValue) !== SFI_DT_CONFIRMATORY_MODEL.expectedModel
  ) {
    throw new Error('DT_EVIDENCE_BLIND_RUN_MODEL_MISMATCH');
  }
  if (contract.maxTokens !== SFI_DT_CONFIRMATORY_MODEL.maxTokens) {
    throw new Error('DT_EVIDENCE_MODEL_MAX_TOKENS_MISMATCH');
  }
  if (record(contract.generationConfig).temperature !== SFI_DT_CONFIRMATORY_MODEL.temperature) {
    throw new Error('DT_EVIDENCE_MODEL_TEMPERATURE_MISMATCH');
  }
  if (text(contract.systemPromptHash) !== SFI_DT_BLIND_SYSTEM_PROMPT_SHA256) {
    throw new Error('DT_EVIDENCE_SYSTEM_PROMPT_HASH_MISMATCH');
  }
  if (text(contract.promptTemplateHash) !== SFI_DT_BLIND_PROMPT_TEMPLATE_SHA256) {
    throw new Error('DT_EVIDENCE_PROMPT_TEMPLATE_HASH_MISMATCH');
  }
  return contractHash;
}

function asEvidenceClass(value: unknown): EvidenceClass {
  const normalized = text(value)?.toUpperCase();
  if (normalized === 'OBSERVED') return 'OBSERVED';
  if (normalized === 'VERIFIED_CONTRAST') return 'VERIFIED_CONTRAST';
  if (normalized === 'SIMULATED') return 'SIMULATED';
  if (normalized === 'INFERRED') return 'INFERRED';
  return 'DERIVED';
}

function validationClass(value: EvidenceClass) {
  return VALIDATION_CLASSES.has(value);
}

function rootEvidenceId(ref: string): string | null {
  const raw = ref.startsWith(ROOT_EVIDENCE_PREFIX) ? ref.slice(ROOT_EVIDENCE_PREFIX.length) : ref;
  return z.string().uuid().safeParse(raw).success ? raw : null;
}

function normalizeTrace(value: unknown): DecisionTrace | null {
  const parsed = targetTraceSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function normalizeOccurrence(value: unknown, sourceRecordId: string): CandidateOccurrence | null {
  const item = record(value);
  const operationKey = text(item.operationKey);
  const traceId = text(item.traceId);
  const domain = text(item.domain);
  const support = text(item.support);
  if (!operationKey || !traceId || !domain || (support !== 'SUPPORT' && support !== 'COUNTEREXAMPLE')) return null;
  return {
    occurrenceId: text(item.occurrenceId) ?? `materialized:${sha256(`${sourceRecordId}:${traceId}:${operationKey}:${support}`).slice(0, 24)}`,
    operationKey,
    traceId,
    domain,
    support,
    epistemicClass: asEvidenceClass(item.epistemicClass),
    evidenceRefs: unique(strings(item.evidenceRefs)),
    sourceRecordId,
  };
}

function normalizeProbe(value: unknown, sourceRecordId: string): CandidateProbe | null {
  const item = record(value);
  const probeId = text(item.probeId);
  const baseTraceId = text(item.baseTraceId);
  const variableKey = text(item.variableKey);
  const direction = text(item.direction);
  const baselineDisposition = text(item.baselineDisposition);
  const expectedDisposition = text(item.expectedDispositionAfterPerturbation);
  const predictedDisposition = text(item.predictedDispositionAfterPerturbation);
  if (!probeId || !baseTraceId || !variableKey) return null;
  if (!['INCREASE', 'DECREASE', 'TOGGLE', 'REPLACE'].includes(direction ?? '')) return null;
  if (![baselineDisposition, expectedDisposition, predictedDisposition].every((value) => dispositionSchema.safeParse(value).success)) return null;
  const epistemicClass = asEvidenceClass(item.epistemicClass);
  if (epistemicClass === 'INFERRED') return null;
  return {
    probeId,
    baseTraceId,
    variableKey,
    direction: direction as CounterfactualProbe['direction'],
    baselineDisposition: baselineDisposition as CounterfactualProbe['baselineDisposition'],
    expectedDispositionAfterPerturbation: expectedDisposition as CounterfactualProbe['expectedDispositionAfterPerturbation'],
    predictedDispositionAfterPerturbation: predictedDisposition as CounterfactualProbe['predictedDispositionAfterPerturbation'],
    epistemicClass,
    evidenceRefs: unique(strings(item.evidenceRefs)),
    sourceRecordId,
  };
}

function classRank(value: EvidenceClass) {
  if (value === 'VERIFIED_CONTRAST') return 5;
  if (value === 'OBSERVED') return 4;
  if (value === 'DERIVED') return 3;
  if (value === 'INFERRED') return 2;
  return 1;
}

function receiptIntegrity(receipt: DecisionTransferEvaluationEvidenceReceipt) {
  const { receiptHash: _receiptHash, ...base } = receipt;
  return sha256(canonicalJson(base)) === receipt.receiptHash;
}

export function parseDecisionTransferConfirmatoryRevealInput(value: unknown): DecisionTransferConfirmatoryRevealInput {
  return decisionTransferConfirmatoryRevealInputSchema.parse(value);
}

async function loadGrounding(refSets: string[][]) {
  const db = createServiceSupabaseClient();
  const evidenceIds = unique(refSets.flat().map(rootEvidenceId).filter((value): value is string => Boolean(value)));
  const evidenceRead = evidenceIds.length
    ? await db.from('root_evidence_entries').select('id,epistemic_event_id,created_at').in('id', evidenceIds)
    : { data: [], error: null };
  if (evidenceRead.error) throw new Error(`DT_EVIDENCE_ROOT_READ_FAILED:${evidenceRead.error.message}`);

  const evidenceRows = (evidenceRead.data ?? []) as Row[];
  const evidenceById = new Map(evidenceRows.map((item) => [String(item.id), item]));
  const eventIds = unique(evidenceRows.map((item) => text(item.epistemic_event_id)).filter((value): value is string => Boolean(value)));
  const eventRead = eventIds.length
    ? await db.from('epistemic_events').select('event_id,epistemic_class,occurred_at,checksum,hash_self').in('event_id', eventIds)
    : { data: [], error: null };
  if (eventRead.error) throw new Error(`DT_EVIDENCE_EVENT_READ_FAILED:${eventRead.error.message}`);

  const eventRows = (eventRead.data ?? []) as Row[];
  const eventById = new Map(eventRows.map((item) => [String(item.event_id), item]));

  const groundingFor = (refs: string[]): Grounding => {
    const itemEvidenceIds = unique(refs.map(rootEvidenceId).filter((value): value is string => Boolean(value)));
    const itemEventIds = unique(itemEvidenceIds
      .map((id) => text(evidenceById.get(id)?.epistemic_event_id))
      .filter((value): value is string => Boolean(value)));
    const observedEventIds = itemEventIds.filter((id) => text(eventById.get(id)?.epistemic_class)?.toLowerCase() === 'observed');
    return { evidenceIds: itemEvidenceIds, eventIds: itemEventIds, observedEventIds };
  };

  return {
    evidenceIds,
    eventIds,
    evidenceRows,
    eventRows,
    groundingFor,
  };
}

function demoteIfUngrounded<T extends { epistemicClass: EvidenceClass; evidenceRefs: string[] }>(
  candidate: T,
  grounding: Grounding,
): T {
  if (!validationClass(candidate.epistemicClass) || grounding.observedEventIds.length > 0) return candidate;
  return { ...candidate, epistemicClass: 'DERIVED' };
}

function deduplicateOccurrences(candidates: CandidateOccurrence[], groundings: Map<CandidateOccurrence, Grounding>) {
  const byTrace = new Map<string, Array<{ candidate: CandidateOccurrence; grounding: Grounding }>>();
  for (const candidate of candidates) {
    const grounding = groundings.get(candidate) ?? { evidenceIds: [], eventIds: [], observedEventIds: [] };
    const bucket = byTrace.get(candidate.traceId) ?? [];
    bucket.push({ candidate: demoteIfUngrounded(candidate, grounding), grounding });
    byTrace.set(candidate.traceId, bucket);
  }

  const traceLevel: Array<{ occurrence: OperationOccurrence; grounding: Grounding }> = [];
  for (const [traceId, bucket] of byTrace.entries()) {
    const items = bucket.map((item) => item.candidate);
    const supports = new Set(items.map((item) => item.support));
    const domains = unique(items.map((item) => item.domain));
    const evidenceRefs = unique(items.flatMap((item) => item.evidenceRefs));
    const grounding: Grounding = {
      evidenceIds: unique(bucket.flatMap((item) => item.grounding.evidenceIds)),
      eventIds: unique(bucket.flatMap((item) => item.grounding.eventIds)),
      observedEventIds: unique(bucket.flatMap((item) => item.grounding.observedEventIds)),
    };
    const strongest = [...items].sort((a, b) => classRank(b.epistemicClass) - classRank(a.epistemicClass))[0];
    const conflicted = supports.size > 1 || domains.length > 1;
    traceLevel.push({
      occurrence: {
        occurrenceId: `dt-evidence:${sha256(`${traceId}:${strongest.operationKey}`).slice(0, 24)}`,
        operationKey: strongest.operationKey,
        traceId,
        domain: domains[0] ?? strongest.domain,
        support: strongest.support,
        epistemicClass: conflicted ? 'DERIVED' : strongest.epistemicClass,
        evidenceRefs,
      },
      grounding,
    });
  }

  const byIndependentGroup = new Map<string, Array<{ occurrence: OperationOccurrence; grounding: Grounding }>>();
  for (const item of traceLevel) {
    const observed = item.grounding.observedEventIds[0];
    const key = observed ? `event:${observed}` : `trace:${item.occurrence.traceId}`;
    const bucket = byIndependentGroup.get(key) ?? [];
    bucket.push(item);
    byIndependentGroup.set(key, bucket);
  }

  const occurrences: OperationOccurrence[] = [];
  for (const bucket of byIndependentGroup.values()) {
    const strongest = [...bucket].sort((a, b) => classRank(b.occurrence.epistemicClass) - classRank(a.occurrence.epistemicClass))[0];
    const supportKinds = new Set(bucket.map((item) => item.occurrence.support));
    occurrences.push({
      ...strongest.occurrence,
      evidenceRefs: unique(bucket.flatMap((item) => item.occurrence.evidenceRefs)),
      epistemicClass: supportKinds.size > 1 ? 'DERIVED' : strongest.occurrence.epistemicClass,
    });
  }

  occurrences.sort((a, b) => a.traceId.localeCompare(b.traceId));
  return { occurrences, independentObservationGroups: byIndependentGroup.size };
}

function deduplicateProbes(candidates: CandidateProbe[], groundings: Map<CandidateProbe, Grounding>) {
  const byIdentity = new Map<string, CandidateProbe[]>();
  for (const candidate of candidates) {
    const grounding = groundings.get(candidate) ?? { evidenceIds: [], eventIds: [], observedEventIds: [] };
    const effective = demoteIfUngrounded(candidate, grounding);
    const identity = [
      effective.baseTraceId,
      effective.variableKey,
      effective.direction,
      effective.baselineDisposition,
      effective.expectedDispositionAfterPerturbation,
    ].join('|');
    const bucket = byIdentity.get(identity) ?? [];
    bucket.push(effective);
    byIdentity.set(identity, bucket);
  }

  const probes: CounterfactualProbe[] = [];
  for (const [identity, bucket] of byIdentity.entries()) {
    const strongest = [...bucket].sort((a, b) => classRank(b.epistemicClass) - classRank(a.epistemicClass))[0];
    const predicted = new Set(bucket.map((item) => item.predictedDispositionAfterPerturbation));
    probes.push({
      probeId: `dt-probe:${sha256(identity).slice(0, 24)}`,
      baseTraceId: strongest.baseTraceId,
      variableKey: strongest.variableKey,
      direction: strongest.direction,
      baselineDisposition: strongest.baselineDisposition,
      expectedDispositionAfterPerturbation: strongest.expectedDispositionAfterPerturbation,
      predictedDispositionAfterPerturbation: strongest.predictedDispositionAfterPerturbation,
      epistemicClass: predicted.size > 1 ? 'DERIVED' : strongest.epistemicClass as CounterfactualProbe['epistemicClass'],
      evidenceRefs: unique(bucket.flatMap((item) => item.evidenceRefs)),
    });
  }
  return probes.sort((a, b) => a.probeId.localeCompare(b.probeId));
}

function existingReceiptFromRow(row: Row): DecisionTransferEvaluationEvidenceReceipt | null {
  const output = record(row.output_envelope);
  const receipt = record(output.receipt) as DecisionTransferEvaluationEvidenceReceipt;
  if (receipt.protocol !== 'SFI-DT-EVIDENCE-MATERIALIZATION-1.0') return null;
  return receiptIntegrity(receipt) ? receipt : null;
}

export async function materializeDecisionTransferEvaluationEvidence(input: {
  blindRunId: string;
  target: DecisionTrace;
  operationKey: string;
  targetTimingProofHash: string;
}) {
  const db = createServiceSupabaseClient();
  const blindRead = await db.from('sfi_cognitive_twin_runs')
    .select('id,provider,model,role,status,input_snapshot')
    .eq('id', input.blindRunId)
    .maybeSingle();
  if (blindRead.error || !blindRead.data) throw new Error(`DT_EVIDENCE_BLIND_RUN_NOT_FOUND:${blindRead.error?.message ?? input.blindRunId}`);
  if (blindRead.data.role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR' || blindRead.data.status !== 'EVIDENCE_PENDING') {
    throw new Error(`DT_EVIDENCE_BLIND_RUN_STATE_INVALID:${blindRead.data.role}:${blindRead.data.status}`);
  }

  const blindSnapshot = record(blindRead.data.input_snapshot);
  const modelContractHash = assertFrozenModelContract(blindSnapshot, blindRead.data.provider, blindRead.data.model);
  const contextReceipt = record(blindSnapshot.contextMaterialization);
  if (text(contextReceipt.protocol) !== 'SFI-DT-CONTEXT-MATERIALIZATION-1.0' || text(contextReceipt.source) !== 'CANONICAL_MATERIALIZED') {
    throw new Error('DT_EVIDENCE_CANONICAL_CONTEXT_REQUIRED');
  }
  const contextReceiptHash = text(contextReceipt.receiptHash);
  if (!contextReceiptHash) throw new Error('DT_EVIDENCE_CONTEXT_RECEIPT_HASH_MISSING');
  const { receiptHash: _contextHash, ...contextBase } = contextReceipt;
  if (sha256(canonicalJson(contextBase)) !== contextReceiptHash) throw new Error('DT_EVIDENCE_CONTEXT_RECEIPT_INTEGRITY_MISMATCH');
  if (text(contextReceipt.targetTraceId) !== input.target.traceId) throw new Error('DT_EVIDENCE_TARGET_TRACE_MISMATCH');

  const experimentId = text(blindSnapshot.experimentId);
  if (!experimentId) throw new Error('DT_EVIDENCE_EXPERIMENT_ID_MISSING');

  const existing = await db.from('sfi_cognitive_twin_runs')
    .select('id,input_snapshot,output_envelope,created_at')
    .eq('role', 'DECISION_TRANSFER_EVIDENCE_MATERIALIZER')
    .eq('status', 'CLOSED')
    .order('created_at', { ascending: false })
    .limit(100);
  if (existing.error) throw new Error(`DT_EVIDENCE_EXISTING_RECEIPT_READ_FAILED:${existing.error.message}`);
  for (const row of (existing.data ?? []) as Row[]) {
    const snapshot = record(row.input_snapshot);
    if (
      text(snapshot.blindRunId) === input.blindRunId
      && text(snapshot.operationKey) === input.operationKey
      && text(snapshot.targetTimingProofHash) === input.targetTimingProofHash
    ) {
      const receipt = existingReceiptFromRow(row);
      if (!receipt) throw new Error(`DT_EVIDENCE_EXISTING_RECEIPT_INTEGRITY_MISMATCH:${String(row.id)}`);
      if (receipt.contextReceiptHash !== contextReceiptHash) throw new Error('DT_EVIDENCE_EXISTING_CONTEXT_HASH_MISMATCH');
      if (receipt.modelContractHash !== modelContractHash) throw new Error('DT_EVIDENCE_EXISTING_MODEL_CONTRACT_HASH_MISMATCH');
      return { materializationRunId: String(row.id), receipt, reused: true as const };
    }
  }

  const historyRead = await db.from('sfi_cognitive_twin_runs')
    .select('id,input_snapshot,output_envelope,evidence_refs,created_at')
    .eq('role', 'DECISION_TRANSFER_EVALUATOR')
    .eq('status', 'CLOSED')
    .order('created_at', { ascending: false })
    .limit(500);
  if (historyRead.error) throw new Error(`DT_EVIDENCE_HISTORY_READ_FAILED:${historyRead.error.message}`);
  const historyRows = (historyRead.data ?? []) as Row[];

  const occurrenceCandidates: CandidateOccurrence[] = [];
  const probeCandidates: CandidateProbe[] = [];

  for (const row of historyRows) {
    const sourceRecordId = `sfi_cognitive_twin_runs:${String(row.id)}`;
    const snapshot = record(row.input_snapshot);

    for (const rawTrace of Array.isArray(snapshot.expected) ? snapshot.expected : []) {
      const trace = normalizeTrace(rawTrace);
      if (!trace || !trace.operations.includes(input.operationKey)) continue;
      occurrenceCandidates.push({
        occurrenceId: `trace:${trace.traceId}:${input.operationKey}`,
        operationKey: input.operationKey,
        traceId: trace.traceId,
        domain: trace.domain,
        support: 'SUPPORT',
        epistemicClass: trace.epistemicClass,
        evidenceRefs: unique(trace.evidenceRefs),
        sourceRecordId,
      });
    }

    for (const rawOccurrence of Array.isArray(snapshot.occurrences) ? snapshot.occurrences : []) {
      const occurrence = normalizeOccurrence(rawOccurrence, sourceRecordId);
      if (occurrence?.operationKey === input.operationKey) occurrenceCandidates.push(occurrence);
    }

    for (const rawProbe of Array.isArray(snapshot.counterfactualProbes) ? snapshot.counterfactualProbes : []) {
      const probe = normalizeProbe(rawProbe, sourceRecordId);
      if (probe) probeCandidates.push(probe);
    }
  }

  occurrenceCandidates.push({
    occurrenceId: `target:${input.target.traceId}:${input.operationKey}`,
    operationKey: input.operationKey,
    traceId: input.target.traceId,
    domain: input.target.domain,
    support: 'SUPPORT',
    epistemicClass: input.target.epistemicClass,
    evidenceRefs: unique(input.target.evidenceRefs),
    sourceRecordId: `blind-target:${input.blindRunId}`,
  });

  const grounding = await loadGrounding([
    ...occurrenceCandidates.map((item) => item.evidenceRefs),
    ...probeCandidates.map((item) => item.evidenceRefs),
  ]);
  const occurrenceGroundings = new Map<CandidateOccurrence, Grounding>(
    occurrenceCandidates.map((candidate) => [candidate, grounding.groundingFor(candidate.evidenceRefs)]),
  );
  const probeGroundings = new Map<CandidateProbe, Grounding>(
    probeCandidates.map((candidate) => [candidate, grounding.groundingFor(candidate.evidenceRefs)]),
  );

  const deduped = deduplicateOccurrences(occurrenceCandidates, occurrenceGroundings);
  const probes = deduplicateProbes(probeCandidates, probeGroundings);
  const empiricalBoundaryProbes = probes.filter((probe) => validationClass(probe.epistemicClass));
  const diagnosticCounterfactuals = probes.filter((probe) => !validationClass(probe.epistemicClass));
  const supports = deduped.occurrences.filter((item) => item.support === 'SUPPORT');
  const counterexamples = deduped.occurrences.filter((item) => item.support === 'COUNTEREXAMPLE');
  const qualifying = deduped.occurrences.filter((item) => validationClass(item.epistemicClass));
  const qualifyingSupports = qualifying.filter((item) => item.support === 'SUPPORT');
  const qualifyingCounterexamples = qualifying.filter((item) => item.support === 'COUNTEREXAMPLE');
  const contrasts = deduped.occurrences.filter((item) => item.epistemicClass === 'VERIFIED_CONTRAST');
  const qualifyingBoundaryProbeCount = empiricalBoundaryProbes.filter(
    (probe) => probe.expectedDispositionAfterPerturbation !== probe.baselineDisposition,
  ).length;
  const blockReasons: string[] = [];
  if (qualifyingSupports.length < 1) blockReasons.push('QUALIFYING_OPERATION_SUPPORT_MISSING');
  if (qualifyingBoundaryProbeCount < 1) blockReasons.push('EMPIRICAL_BOUNDARY_PROBE_MISSING');

  const evidenceIds = grounding.evidenceIds;
  const eventIds = grounding.eventIds;
  const epistemicClasses = unique([
    ...deduped.occurrences.map((item) => item.epistemicClass),
    ...probes.map((item) => item.epistemicClass),
  ]) as EvidenceClass[];
  const evidencePool = {
    blindRunId: input.blindRunId,
    targetTraceId: input.target.traceId,
    operationKey: input.operationKey,
    occurrences: deduped.occurrences,
    empiricalBoundaryProbes,
    diagnosticCounterfactuals,
    evidenceIds,
    eventIds,
  };
  const evidencePoolHash = sha256(canonicalJson(evidencePool));
  const boundaryValidationStatus: ReceiptValidationStatus = qualifyingBoundaryProbeCount > 0 ? 'QUALIFIED' : 'BLOCKED';
  const validationStatus: ReceiptValidationStatus = blockReasons.length === 0 ? 'QUALIFIED' : 'BLOCKED';
  const materializedAt = new Date().toISOString();
  const receiptBase = {
    protocol: 'SFI-DT-EVIDENCE-MATERIALIZATION-1.0' as const,
    experimentId,
    blindRunId: input.blindRunId,
    targetTraceId: input.target.traceId,
    operationKey: input.operationKey,
    contextReceiptHash,
    targetTimingProofHash: input.targetTimingProofHash,
    modelContractHash,
    materializedAt,

    recordsSeen: historyRows.length + grounding.evidenceRows.length + grounding.eventRows.length + 1,
    uniqueEvidenceObjects: evidenceIds.length,
    uniqueEvents: eventIds.length,
    independentObservationGroups: deduped.independentObservationGroups,

    occurrences: deduped.occurrences,
    supports,
    counterexamples,
    contrasts,
    empiricalBoundaryProbes,
    diagnosticCounterfactuals,

    evidenceIds,
    eventIds,
    sourceStores: ['sfi_cognitive_twin_runs', 'root_evidence_entries', 'epistemic_events'],
    epistemicClasses,

    qualifyingOccurrenceCount: qualifying.length,
    qualifyingDomainCount: unique(qualifyingSupports.map((item) => item.domain)).length,
    qualifyingCounterexampleCount: qualifyingCounterexamples.length,
    qualifyingContrastCount: contrasts.length,
    qualifyingBoundaryProbeCount,

    boundaryValidationStatus,
    validationStatus,
    blockReasons,

    evidencePoolHash,
  };
  const receipt: DecisionTransferEvaluationEvidenceReceipt = {
    ...receiptBase,
    receiptHash: sha256(canonicalJson(receiptBase)),
  };

  const taskId = `DT-EVIDENCE-${randomUUID()}`;
  const insert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: receipt.protocol,
    provider: String(blindRead.data.provider ?? 'unknown'),
    model: String(blindRead.data.model ?? 'unknown'),
    role: 'DECISION_TRANSFER_EVIDENCE_MATERIALIZER',
    status: 'CLOSED',
    objective: `Freeze canonical evaluation evidence for ${input.target.traceId} / ${input.operationKey} before scoring.`,
    input_snapshot: {
      blindRunId: input.blindRunId,
      experimentId,
      targetTraceId: input.target.traceId,
      operationKey: input.operationKey,
      contextReceiptHash,
      targetTimingProofHash: input.targetTimingProofHash,
      modelContractHash,
      evidencePoolHash,
      evaluationOrder: 'MATERIALIZE_FREEZE_VERIFY_SCORE',
    },
    output_envelope: { receipt },
    evidence_refs: unique([
      ...deduped.occurrences.flatMap((item) => item.evidenceRefs),
      ...empiricalBoundaryProbes.flatMap((item) => item.evidenceRefs),
      ...diagnosticCounterfactuals.flatMap((item) => item.evidenceRefs),
    ]),
    limitations: [
      'OBSERVED and VERIFIED_CONTRAST records validate only when grounded by at least one canonical root evidence object resolving to an observed epistemic event.',
      'Repeated records, repeated DecisionTrace projections and shared observed events are collapsed before validating recurrence.',
      'SIMULATED, DERIVED and INFERRED material remains diagnostic and cannot increase validating counters.',
      'A simulated counterfactual is never counted as an empirical boundary probe.',
      'Confirmatory materialization requires a valid SFI-DT-1.0 model contract bound to the blind run before reveal.',
    ],
    started_at: materializedAt,
    finished_at: materializedAt,
  }).select('id').single();
  if (insert.error || !insert.data?.id) throw new Error(`DT_EVIDENCE_RECEIPT_PERSIST_FAILED:${insert.error?.message ?? 'unknown'}`);

  return {
    materializationRunId: String(insert.data.id),
    receipt,
    reused: false as const,
  };
}

export async function verifyFrozenDecisionTransferEvaluationEvidence(input: {
  materializationRunId: string;
  expectedReceiptHash: string;
}) {
  const db = createServiceSupabaseClient();
  const read = await db.from('sfi_cognitive_twin_runs')
    .select('id,contract_version,role,status,output_envelope')
    .eq('id', input.materializationRunId)
    .maybeSingle();
  if (read.error || !read.data) throw new Error(`DT_EVIDENCE_FROZEN_RUN_NOT_FOUND:${read.error?.message ?? input.materializationRunId}`);
  if (read.data.role !== 'DECISION_TRANSFER_EVIDENCE_MATERIALIZER' || read.data.status !== 'CLOSED') {
    throw new Error(`DT_EVIDENCE_FROZEN_RUN_STATE_INVALID:${read.data.role}:${read.data.status}`);
  }
  if (read.data.contract_version !== 'SFI-DT-EVIDENCE-MATERIALIZATION-1.0') {
    throw new Error(`DT_EVIDENCE_FROZEN_CONTRACT_MISMATCH:${read.data.contract_version}`);
  }
  const receipt = existingReceiptFromRow(read.data as Row);
  if (!receipt) throw new Error('DT_EVIDENCE_FROZEN_RECEIPT_INTEGRITY_MISMATCH');
  if (receipt.receiptHash !== input.expectedReceiptHash) throw new Error('DT_EVIDENCE_FROZEN_RECEIPT_HASH_MISMATCH');
  return { receipt, materializationRunId: input.materializationRunId };
}

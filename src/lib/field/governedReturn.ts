import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  createFieldCycle,
  submitFieldReturn,
  type CreateFieldCycleInput,
  type ReturnFieldCycleInput,
} from './operationalCycle';
import { materializeFieldBlindedCognitiveSpineT0 } from './fieldCognitiveSpineBoundary';
import { FIELD_INTERVENTION_EXECUTION_CONTRACT } from './interventionExecution';
import { finalizeReturnContrast, canMarkLongitudinalCaseComplete } from './returnContrastContract';
import { verifyStudioFieldHandoff, type StudioFieldHandoff } from '@/lib/studio/fieldHandoff';
import { recordCognitiveTwinExperience } from '@/core/cognitive-twin/experience';

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []; }

export type GovernedFieldCreateInput = CreateFieldCycleInput & {
  rivalHypothesis?: string;
  stoppingCondition?: string;
  studioHandoff?: StudioFieldHandoff | null;
};

export async function createGovernedFieldCycle(ownerId: string, input: GovernedFieldCreateInput) {
  if (input.studioHandoff && !verifyStudioFieldHandoff(input.studioHandoff)) {
    throw new Error('FIELD_STUDIO_HANDOFF_INVALID');
  }

  // Baseline capture, MOPH, hypothesis and provisional intervention are created
  // before Cognitive Spine T0 is observed. This preserves a genuinely blinded
  // initial Field observation rather than conditioning it on prior CT state.
  const result = await createFieldCycle(ownerId, input);
  const db = createServiceSupabaseClient();
  const fieldCase = record(result.case);
  const caseId = text(fieldCase.id);
  if (!caseId) throw new Error('FIELD_GOVERNED_CASE_ID_MISSING');

  const baselineCutoff = text(fieldCase.created_at) || new Date().toISOString();
  let cognitiveSpineT0: Awaited<ReturnType<typeof materializeFieldBlindedCognitiveSpineT0>> | null = null;
  let cognitiveSpineT0Warning: string | null = null;
  try {
    cognitiveSpineT0 = await materializeFieldBlindedCognitiveSpineT0({
      executionId: `field:${caseId}:t0`,
      sourceCutoff: baselineCutoff,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    cognitiveSpineT0Warning = `FIELD_COGNITIVE_SPINE_T0_UNAVAILABLE:${error instanceof Error ? error.message : String(error)}`;
  }

  const frozenRivalHypothesis = input.rivalHypothesis?.trim()
    || 'Null-compatible rival: any observed change may be explained by baseline drift, external field/context, measurement error, or intervention fidelity rather than the intervention itself.';
  const frozenStoppingCondition = input.stoppingCondition?.trim()
    || `Stop interpretation after one declared ${input.verificationWindow} return window and one observed return. Any extension or second intervention requires a new sealed cycle.`;

  const originalMetadata = record(fieldCase.metadata);
  const frozenAt = new Date().toISOString();
  const governedMetadata = {
    ...originalMetadata,
    frozenRivalHypothesis,
    frozenStoppingCondition,
    contrastContract: 'SFI-RETURN-CONTRAST-1.0',
    contrastFrozenAt: frozenAt,
    interventionExecutionContract: FIELD_INTERVENTION_EXECUTION_CONTRACT,
    interventionExecutionAcknowledgement: null,
    cognitiveSpineT0: cognitiveSpineT0 ?? {
      contractVersion: 'SFI-FIELD-COGNITIVE-SPINE-T0-1.0',
      profile: 'FIELD_BLINDED_OBSERVATION_V1',
      operationalSfiCtAvailable: false,
      operationalSfiCtConsumed: false,
      sourceCutoff: baselineCutoff,
      warning: cognitiveSpineT0Warning,
      rule: 'Field baseline remains valid even when operational Cognitive Spine availability cannot be reconstructed, because T0 does not consume CT context.',
    },
    longitudinalComplete: false,
    studioFieldHandoff: input.studioHandoff ?? null,
    studioHandoffId: input.studioHandoff?.handoffId ?? null,
    studioHandoffHash: input.studioHandoff?.immutableHash ?? null,
  };
  const update = await db.from('field_cases').update({ metadata: governedMetadata }).eq('id', caseId).eq('owner_id', ownerId).select('*').single();
  if (update.error || !update.data) throw new Error(`FIELD_GOVERNED_CASE_FREEZE_FAILED:${update.error?.message ?? 'unknown'}`);

  return {
    ...result,
    case: update.data,
    warnings: [
      ...(Array.isArray(result.warnings) ? result.warnings : []),
      ...(cognitiveSpineT0Warning ? [cognitiveSpineT0Warning] : []),
    ],
    frozenRivalHypothesis,
    frozenStoppingCondition,
    contrastFrozenAt: frozenAt,
    interventionExecutionContract: FIELD_INTERVENTION_EXECUTION_CONTRACT,
    cognitiveSpineT0,
    cognitiveSpineT0Warning,
    studioHandoff: input.studioHandoff ?? null,
  };
}

async function requireExecutionAcknowledgement(db: ReturnType<typeof createServiceSupabaseClient>, ownerId: string, caseId: string, metadata: Row) {
  if (text(metadata.interventionExecutionContract) !== FIELD_INTERVENTION_EXECUTION_CONTRACT) {
    return {
      legacy: true as const,
      acknowledgement: null,
      warnings: ['legacy_field_cycle_without_execution_ack_contract'],
    };
  }

  const acknowledgement = record(metadata.interventionExecutionAcknowledgement);
  const interventionId = text(acknowledgement.interventionId);
  const evidenceId = text(acknowledgement.evidenceId);
  const acknowledgementHash = text(acknowledgement.acknowledgementHash);
  if (!interventionId || !evidenceId || !acknowledgementHash) {
    throw new Error('FIELD_INTERVENTION_EXECUTION_ACK_REQUIRED');
  }

  const intervention = await db.from('field_interventions')
    .select('id,status,completed_at,evidence_ids')
    .eq('id', interventionId)
    .eq('case_id', caseId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (intervention.error || !intervention.data) throw new Error('FIELD_INTERVENTION_EXECUTION_ACK_TARGET_MISSING');
  if (text(intervention.data.status) !== 'EXECUTION_RECORDED') throw new Error('FIELD_INTERVENTION_EXECUTION_ACK_NOT_FINALIZED');
  if (!strings(intervention.data.evidence_ids).includes(evidenceId)) throw new Error('FIELD_INTERVENTION_EXECUTION_ACK_EVIDENCE_NOT_LINKED');

  const evidence = await db.from('field_case_evidence')
    .select('id,evidence_type,payload,observed_at')
    .eq('id', evidenceId)
    .eq('case_id', caseId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (evidence.error || !evidence.data) throw new Error('FIELD_INTERVENTION_EXECUTION_ACK_EVIDENCE_MISSING');
  if (text(evidence.data.evidence_type) !== 'intervention_execution_acknowledgement') {
    throw new Error('FIELD_INTERVENTION_EXECUTION_ACK_EVIDENCE_INVALID');
  }
  const payload = record(evidence.data.payload);
  if (text(payload.acknowledgementHash) !== acknowledgementHash) {
    throw new Error('FIELD_INTERVENTION_EXECUTION_ACK_HASH_MISMATCH');
  }

  return {
    legacy: false as const,
    acknowledgement,
    warnings: [] as string[],
  };
}

export async function submitGovernedFieldReturn(ownerId: string, caseId: string, input: ReturnFieldCycleInput) {
  const db = createServiceSupabaseClient();
  const before = await db.from('field_cases').select('id,metadata,status').eq('id', caseId).eq('owner_id', ownerId).maybeSingle();
  if (before.error || !before.data) throw new Error('FIELD_CASE_NOT_FOUND');
  const metadata = record(before.data.metadata);
  const predictionSeal = text(metadata.returnHash);
  const rivalInterpretation = text(metadata.frozenRivalHypothesis);
  const stoppingCondition = text(metadata.frozenStoppingCondition);
  if (!predictionSeal) throw new Error('FIELD_RETURN_PREDICTION_SEAL_REQUIRED');
  if (!rivalInterpretation) throw new Error('FIELD_RETURN_RIVAL_NOT_FROZEN_AT_T0');
  if (!stoppingCondition) throw new Error('FIELD_RETURN_STOPPING_CONDITION_NOT_FROZEN_AT_T0');

  const execution = await requireExecutionAcknowledgement(db, ownerId, caseId, metadata);

  const handoffValue = metadata.studioFieldHandoff;
  if (handoffValue && !verifyStudioFieldHandoff(handoffValue as StudioFieldHandoff)) {
    throw new Error('FIELD_STUDIO_HANDOFF_INTEGRITY_FAILED_AT_RETURN');
  }

  const result = await submitFieldReturn(ownerId, caseId, input);
  const evidence = record(result.evidence);
  const evidenceId = text(evidence.id);
  const contrast = finalizeReturnContrast({
    predictionSeal,
    expected: result.expectedValue,
    observed: result.actualValue,
    rivalInterpretation,
    stoppingCondition,
    evidenceRefs: evidenceId ? [`field_case_evidence:${evidenceId}`] : [],
  });
  if (!canMarkLongitudinalCaseComplete(contrast)) throw new Error('FIELD_RETURN_CONTRAST_INCOMPLETE');

  const returnRow = await db.from('field_returns').select('id,payload').eq('case_id', caseId).eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (returnRow.error || !returnRow.data?.id) {
    await db.from('field_cases').update({ status: 'CLOSED_RETURN_CONTRAST_INCOMPLETE', updated_at: new Date().toISOString() }).eq('id', caseId).eq('owner_id', ownerId);
    throw new Error('FIELD_RETURN_CONTRAST_PERSISTENCE_TARGET_MISSING');
  }

  const persisted = await db.from('field_returns').update({
    payload: {
      ...record(returnRow.data.payload),
      returnContrast: contrast,
      longitudinalComplete: true,
      interventionExecutionAcknowledgement: execution.acknowledgement,
      legacyExecutionProvenanceGap: execution.legacy,
      cognitiveSpineT0: metadata.cognitiveSpineT0 ?? null,
      studioHandoffId: text(metadata.studioHandoffId) || null,
      studioHandoffHash: text(metadata.studioHandoffHash) || null,
    },
  }).eq('id', returnRow.data.id).eq('owner_id', ownerId);
  if (persisted.error) {
    await db.from('field_cases').update({ status: 'CLOSED_RETURN_CONTRAST_INCOMPLETE', updated_at: new Date().toISOString() }).eq('id', caseId).eq('owner_id', ownerId);
    throw new Error(`FIELD_RETURN_CONTRAST_PERSIST_FAILED:${persisted.error.message}`);
  }

  const casePersist = await db.from('field_cases').update({
    metadata: {
      ...metadata,
      returnContrast: contrast,
      longitudinalComplete: true,
      legacyExecutionProvenanceGap: execution.legacy,
    },
  }).eq('id', caseId).eq('owner_id', ownerId);
  if (casePersist.error) {
    await db.from('field_cases').update({ status: 'CLOSED_RETURN_CONTRAST_INCOMPLETE', updated_at: new Date().toISOString() }).eq('id', caseId).eq('owner_id', ownerId);
    throw new Error(`FIELD_CASE_CONTRAST_PERSIST_FAILED:${casePersist.error.message}`);
  }

  const outcome = record(result.outcome);
  const outcomeId = text(outcome.id) || `${caseId}:${text(returnRow.data.id)}`;
  const twinExperience = await recordCognitiveTwinExperience({
    memoryKey:`SFI:FIELD:RETURN:${outcomeId}`,
    memoryType:'STATE',
    sourceKind:'field_outcomes',
    sourceRef:outcomeId,
    createdBy:ownerId,
    evidenceRefs:[
      ...strings(outcome.evidence_ids),
      ...(evidenceId ? [`field_case_evidence:${evidenceId}`] : []),
      ...(!execution.legacy && text(execution.acknowledgement?.evidenceId)
        ? [`field_case_evidence:${text(execution.acknowledgement?.evidenceId)}`]
        : []),
    ],
    content:{
      epistemicClass:'OBSERVED_RETURN',
      caseId,
      fieldOutcomeId:text(outcome.id) || null,
      expected:result.expectedValue,
      observed:result.actualValue,
      delta:result.delta,
      accepted:result.accepted,
      verified:result.verified,
      explanation:result.explanation,
      interventionExecutionAcknowledgement: execution.acknowledgement,
      legacyExecutionProvenanceGap: execution.legacy,
      cognitiveSpineT0: metadata.cognitiveSpineT0 ?? null,
      returnContrast:contrast,
      studioHandoffId:text(metadata.studioHandoffId) || null,
      studioHandoffHash:text(metadata.studioHandoffHash) || null,
      rule:'This is a completed Field return available to the Cognitive Twin as candidate institutional experience. The execution acknowledgement remains DECLARED unless separately observed; one return does not establish general causality or mutate canon.',
    },
  });

  return {
    ...result,
    returnContrast: contrast,
    longitudinalComplete: true as const,
    interventionExecutionAcknowledgement: execution.acknowledgement,
    legacyExecutionProvenanceGap: execution.legacy,
    executionWarnings: execution.warnings,
    cognitiveSpineT0: metadata.cognitiveSpineT0 ?? null,
    studioHandoffId: text(metadata.studioHandoffId) || null,
    studioHandoffHash: text(metadata.studioHandoffHash) || null,
    cognitiveTwinExperience:twinExperience,
  };
}

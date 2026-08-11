import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  createFieldCycle,
  submitFieldReturn,
  type CreateFieldCycleInput,
  type ReturnFieldCycleInput,
} from './operationalCycle';
import { finalizeReturnContrast, canMarkLongitudinalCaseComplete } from './returnContrastContract';

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export type GovernedFieldCreateInput = CreateFieldCycleInput & {
  rivalHypothesis?: string;
  stoppingCondition?: string;
};

export async function createGovernedFieldCycle(ownerId: string, input: GovernedFieldCreateInput) {
  const result = await createFieldCycle(ownerId, input);
  const db = createServiceSupabaseClient();
  const fieldCase = record(result.case);
  const caseId = text(fieldCase.id);
  if (!caseId) throw new Error('FIELD_GOVERNED_CASE_ID_MISSING');

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
    longitudinalComplete: false,
  };
  const update = await db.from('field_cases').update({ metadata: governedMetadata }).eq('id', caseId).eq('owner_id', ownerId).select('*').single();
  if (update.error || !update.data) throw new Error(`FIELD_GOVERNED_CASE_FREEZE_FAILED:${update.error?.message ?? 'unknown'}`);

  return {
    ...result,
    case: update.data,
    frozenRivalHypothesis,
    frozenStoppingCondition,
    contrastFrozenAt: frozenAt,
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
    payload: { ...record(returnRow.data.payload), returnContrast: contrast, longitudinalComplete: true },
  }).eq('id', returnRow.data.id).eq('owner_id', ownerId);
  if (persisted.error) {
    await db.from('field_cases').update({ status: 'CLOSED_RETURN_CONTRAST_INCOMPLETE', updated_at: new Date().toISOString() }).eq('id', caseId).eq('owner_id', ownerId);
    throw new Error(`FIELD_RETURN_CONTRAST_PERSIST_FAILED:${persisted.error.message}`);
  }

  const casePersist = await db.from('field_cases').update({
    metadata: { ...metadata, returnContrast: contrast, longitudinalComplete: true },
  }).eq('id', caseId).eq('owner_id', ownerId);
  if (casePersist.error) {
    await db.from('field_cases').update({ status: 'CLOSED_RETURN_CONTRAST_INCOMPLETE', updated_at: new Date().toISOString() }).eq('id', caseId).eq('owner_id', ownerId);
    throw new Error(`FIELD_CASE_CONTRAST_PERSIST_FAILED:${casePersist.error.message}`);
  }

  return { ...result, returnContrast: contrast, longitudinalComplete: true as const };
}

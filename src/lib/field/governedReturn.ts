import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { submitFieldReturn, type ReturnFieldCycleInput } from './operationalCycle';
import { finalizeReturnContrast, canMarkLongitudinalCaseComplete } from './returnContrastContract';

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export type GovernedFieldReturnInput = ReturnFieldCycleInput & {
  rivalInterpretation: string;
  stoppingCondition: string;
};

export async function submitGovernedFieldReturn(ownerId: string, caseId: string, input: GovernedFieldReturnInput) {
  if (!input.rivalInterpretation.trim()) throw new Error('FIELD_RETURN_RIVAL_INTERPRETATION_REQUIRED');
  if (!input.stoppingCondition.trim()) throw new Error('FIELD_RETURN_STOPPING_CONDITION_REQUIRED');

  const db = createServiceSupabaseClient();
  const before = await db.from('field_cases').select('id,metadata,status').eq('id', caseId).eq('owner_id', ownerId).maybeSingle();
  if (before.error || !before.data) throw new Error('FIELD_CASE_NOT_FOUND');
  const metadata = record(before.data.metadata);
  const predictionSeal = text(metadata.returnHash);
  if (!predictionSeal) throw new Error('FIELD_RETURN_PREDICTION_SEAL_REQUIRED');

  const result = await submitFieldReturn(ownerId, caseId, input);
  const evidence = record(result.evidence);
  const evidenceId = text(evidence.id);
  const contrast = finalizeReturnContrast({
    predictionSeal,
    expected: result.expectedValue,
    observed: result.actualValue,
    rivalInterpretation: input.rivalInterpretation,
    stoppingCondition: input.stoppingCondition,
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
    metadata: { ...metadata, returnedAt: record(result.outcome).recorded_at ?? null, returnContrast: contrast, longitudinalComplete: true },
  }).eq('id', caseId).eq('owner_id', ownerId);
  if (casePersist.error) {
    await db.from('field_cases').update({ status: 'CLOSED_RETURN_CONTRAST_INCOMPLETE', updated_at: new Date().toISOString() }).eq('id', caseId).eq('owner_id', ownerId);
    throw new Error(`FIELD_CASE_CONTRAST_PERSIST_FAILED:${casePersist.error.message}`);
  }

  return { ...result, returnContrast: contrast, longitudinalComplete: true as const };
}

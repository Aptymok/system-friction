import 'server-only';

import { canonicalSha256, normalizeTimestamp, sortedUnique } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const FIELD_INTERVENTION_EXECUTION_CONTRACT = 'SFI-FIELD-EXECUTION-ACK-1.0' as const;

type Row = Record<string, unknown>;

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
function reliability(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new Error('FIELD_INTERVENTION_EXECUTION_RELIABILITY_INVALID');
  return parsed;
}

async function writeFieldAudit(input: {
  ownerId: string;
  caseId: string;
  interventionId: string;
  evidenceId: string;
  executedAt: string;
  acknowledgementHash: string;
}) {
  const db = createServiceSupabaseClient();
  const audit = await db.from('sfi_audit_events').insert({
    actor_id: input.ownerId,
    action: 'field.intervention.execution_recorded',
    target_type: 'field_intervention',
    target_id: input.interventionId,
    after_state: {
      caseId: input.caseId,
      interventionId: input.interventionId,
      evidenceId: input.evidenceId,
      executedAt: input.executedAt,
      acknowledgementHash: input.acknowledgementHash,
      epistemicClass: 'DECLARED',
    },
    context: {
      surface: 'field',
      contract: FIELD_INTERVENTION_EXECUTION_CONTRACT,
      executionPerformedBySystem: false,
    },
  });
  if (audit.error) throw new Error(`FIELD_INTERVENTION_EXECUTION_AUDIT_FAILED:${audit.error.message}`);
}

/**
 * Records that the participant/operator declares the sealed intervention was
 * executed. This function NEVER executes the intervention itself.
 *
 * The acknowledgement is a canonical Field record with epistemic class
 * DECLARED unless a separate observation/evidence process later establishes a
 * stronger relation. Governance cannot upgrade it by decree.
 */
export async function acknowledgeFieldInterventionExecution(input: {
  ownerId: string;
  caseId: string;
  executionNote: string;
  executionSource: string;
  reliability: number;
  executedAt?: string | null;
}) {
  if (input.executionNote.trim().length < 12) throw new Error('FIELD_INTERVENTION_EXECUTION_NOTE_REQUIRED');
  if (!input.executionSource.trim()) throw new Error('FIELD_INTERVENTION_EXECUTION_SOURCE_REQUIRED');

  const db = createServiceSupabaseClient();
  const executedAt = normalizeTimestamp(input.executedAt?.trim() || new Date().toISOString());
  if (new Date(executedAt).getTime() > Date.now() + 5 * 60 * 1000) {
    throw new Error('FIELD_INTERVENTION_EXECUTION_IN_FUTURE');
  }
  const declaredReliability = reliability(input.reliability);

  const [caseResult, interventionResult] = await Promise.all([
    db.from('field_cases')
      .select('id,status,metadata')
      .eq('id', input.caseId)
      .eq('owner_id', input.ownerId)
      .maybeSingle(),
    db.from('field_interventions')
      .select('id,status,evidence_ids,minimum_change,started_at,created_at')
      .eq('case_id', input.caseId)
      .eq('owner_id', input.ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (caseResult.error || !caseResult.data) throw new Error('FIELD_CASE_NOT_FOUND');
  if (interventionResult.error || !interventionResult.data) throw new Error('FIELD_INTERVENTION_NOT_FOUND');
  const fieldCase = record(caseResult.data);
  const intervention = record(interventionResult.data);
  const metadata = record(fieldCase.metadata);
  if (text(metadata.interventionExecutionContract) !== FIELD_INTERVENTION_EXECUTION_CONTRACT) {
    throw new Error('FIELD_INTERVENTION_EXECUTION_CONTRACT_NOT_ENABLED');
  }
  if (text(fieldCase.status) !== 'WAITING_RETURN') throw new Error('FIELD_INTERVENTION_EXECUTION_CASE_NOT_READY');
  if (text(intervention.status) === 'EXECUTION_RECORDED') {
    const existingAck = record(metadata.interventionExecutionAcknowledgement);
    return {
      ok: true as const,
      created: false as const,
      caseId: input.caseId,
      interventionId: String(intervention.id),
      acknowledgement: existingAck,
    };
  }
  if (text(intervention.status) !== 'READY_FOR_EXECUTION') throw new Error('FIELD_INTERVENTION_EXECUTION_NOT_READY');

  const interventionId = String(intervention.id);
  const claim = await db.from('field_interventions')
    .update({ status: 'EXECUTION_RECORDING' })
    .eq('id', interventionId)
    .eq('owner_id', input.ownerId)
    .eq('case_id', input.caseId)
    .eq('status', 'READY_FOR_EXECUTION')
    .select('id')
    .maybeSingle();
  if (claim.error || !claim.data) throw new Error('FIELD_INTERVENTION_EXECUTION_ALREADY_CLAIMED');

  try {
    const acknowledgementSemantic = {
      contract: FIELD_INTERVENTION_EXECUTION_CONTRACT,
      caseId: input.caseId,
      interventionId,
      minimumChange: text(intervention.minimum_change),
      executedAt,
      executionSource: input.executionSource.trim(),
      executionNote: input.executionNote.trim(),
      reliability: declaredReliability,
      epistemicClass: 'DECLARED',
      executionPerformedBySystem: false,
    };
    const acknowledgementHash = canonicalSha256(acknowledgementSemantic);

    const evidence = await db.from('field_case_evidence').insert({
      case_id: input.caseId,
      owner_id: input.ownerId,
      evidence_type: 'intervention_execution_acknowledgement',
      label: 'Intervention execution acknowledgement',
      source: input.executionSource.trim(),
      reliability: declaredReliability,
      visibility: 'private',
      payload: {
        ...acknowledgementSemantic,
        acknowledgementHash,
        rule: 'This record states that execution was declared by the operator/participant. It does not independently verify that the world changed or that the intervention caused a later return.',
      },
      observed_at: executedAt,
    }).select('*').single();
    if (evidence.error || !evidence.data) throw new Error(`FIELD_INTERVENTION_EXECUTION_EVIDENCE_FAILED:${evidence.error?.message ?? 'unknown'}`);
    const evidenceId = String(evidence.data.id);
    const evidenceIds = sortedUnique([...strings(intervention.evidence_ids), evidenceId]);

    const interventionUpdate = await db.from('field_interventions')
      .update({
        status: 'EXECUTION_RECORDED',
        completed_at: executedAt,
        evidence_ids: evidenceIds,
      })
      .eq('id', interventionId)
      .eq('owner_id', input.ownerId)
      .eq('case_id', input.caseId)
      .eq('status', 'EXECUTION_RECORDING')
      .select('*')
      .single();
    if (interventionUpdate.error || !interventionUpdate.data) {
      throw new Error(`FIELD_INTERVENTION_EXECUTION_PERSIST_FAILED:${interventionUpdate.error?.message ?? 'unknown'}`);
    }

    const acknowledgement = {
      contract: FIELD_INTERVENTION_EXECUTION_CONTRACT,
      interventionId,
      evidenceId,
      executedAt,
      source: input.executionSource.trim(),
      reliability: declaredReliability,
      epistemicClass: 'DECLARED',
      acknowledgementHash,
    };
    const caseUpdate = await db.from('field_cases')
      .update({
        metadata: {
          ...metadata,
          interventionExecutionAcknowledgement: acknowledgement,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.caseId)
      .eq('owner_id', input.ownerId);
    if (caseUpdate.error) throw new Error(`FIELD_INTERVENTION_EXECUTION_CASE_LINK_FAILED:${caseUpdate.error.message}`);

    await writeFieldAudit({
      ownerId: input.ownerId,
      caseId: input.caseId,
      interventionId,
      evidenceId,
      executedAt,
      acknowledgementHash,
    });

    return {
      ok: true as const,
      created: true as const,
      caseId: input.caseId,
      interventionId,
      evidence: evidence.data,
      intervention: interventionUpdate.data,
      acknowledgement,
    };
  } catch (error) {
    await db.from('field_interventions')
      .update({ status: 'READY_FOR_EXECUTION' })
      .eq('id', interventionId)
      .eq('owner_id', input.ownerId)
      .eq('case_id', input.caseId)
      .eq('status', 'EXECUTION_RECORDING');
    throw error;
  }
}

import 'server-only';

import { appendOperationalEvent } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readCognitiveTwinConnectionStatus } from './connectionStatus';

const PROPOSAL_TYPE = 'ct_reentry_governed_activation';

export async function ensureCognitiveTwinReentryGovernanceRequest() {
  const connection = await readCognitiveTwinConnectionStatus();
  if (connection.validationState === 'OBSERVED') {
    return { ok: true as const, proposed: false, reason: 'ct_reentry_validation_already_observed', connection };
  }

  const db = createServiceSupabaseClient();
  const existing = await db.from('action_proposals')
    .select('*')
    .eq('proposal_type', PROPOSAL_TYPE)
    .in('status', ['proposed', 'waiting_evidence', 'design_approved', 'queued'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(`CT_REENTRY_GOVERNANCE_PROPOSAL_READ_FAILED:${existing.error.message}`);
  if (existing.data) return { ok: true as const, proposed: false, reason: 'open_request_already_exists', proposal: existing.data, connection };

  const disconnected = connection.connectionState !== 'CONNECTED' || connection.functionState !== 'FUNCTIONAL';
  const title = disconnected
    ? 'Restaurar conexión funcional de Cognitive Twin Reentry'
    : 'Iniciar validación gobernada de Cognitive Twin Reentry';
  const observedProblem = disconnected
    ? `CT-A01 reporta ${connection.connectionState}/${connection.functionState}; la capacidad no puede avanzar a evaluación.`
    : `CT-A01 está CONNECTED + FUNCTIONAL, pero permanece ${connection.observationState} con validación ${connection.validationState}; no existe todavía una evaluación Decision Transfer observada.`;
  const requestedAction = disconnected
    ? 'repair_ct_reentry_connection'
    : 'start_ct_reentry_validation_cycle';
  const riskLevel = disconnected ? 'medium' : 'low';

  const expectedFieldDelta = {
    proposalType: PROPOSAL_TYPE,
    payload: {
      source: 'cognitive_twin_reentry_diagnostic',
      observedProblem,
      observedState: {
        connectionState: connection.connectionState,
        functionState: connection.functionState,
        observationState: connection.observationState,
        validationState: connection.validationState,
        nextRequired: connection.nextRequired,
        lineage: connection.lineage,
        methodLab: connection.methodLab,
      },
      requestedAction: {
        type: requestedAction,
        adapter: 'ct_reentry_decision_transfer',
        routes: connection.routes,
        executionRule: disconnected
          ? 'repair only the missing dependency/binding; bounded test before resuming'
          : 'materialize a valid Decision Transfer input from OBSERVED/VERIFIED_CONTRAST evidence; do not fabricate a target or evidence',
      },
      successCriteria: disconnected
        ? ['connectionState=CONNECTED', 'functionState=FUNCTIONAL', 'bounded probe succeeds', 'no authority expansion']
        : ['persisted Decision Transfer run', 'persisted evaluation', 'sfi_lab_analyses(mode=ct_reentry)', 'proposal-scoped RETURN/evidence', 'validation state remains distinct from canon'],
      rollback: disconnected
        ? 'Disable the repaired binding and restore prior configuration while preserving evidence/lineage.'
        : 'Close/cancel the validation cycle; preserve all produced experimental records and do not promote learning/canon.',
      decision_authority: 'root_only',
      canonicalPromotionAllowed: false,
    },
  };

  const insert = await db.from('action_proposals').insert({
    proposal_type: PROPOSAL_TYPE,
    title,
    description: `Se observa: ${observedProblem} Se solicita: ${disconnected ? 'autorizar remediación mínima' : 'autorizar el ciclo de evaluación CT Reentry'}.`,
    objective: disconnected
      ? 'Restablecer la capacidad CT Reentry sin ampliar autoridad.'
      : 'Obtener la primera ejecución/evaluación persistida de CT Reentry con evidencia calificable y RETURN observable.',
    status: 'proposed',
    risk_level: riskLevel,
    expected_field_delta: expectedFieldDelta,
    proportionality_check: { proposalType: PROPOSAL_TYPE, approvalRequired: true, decisionAuthority: 'root_only', riskAssessmentState: riskLevel.toUpperCase() },
    approval_required: true,
  }).select('*').single();
  if (insert.error || !insert.data) throw new Error(`CT_REENTRY_GOVERNANCE_PROPOSAL_WRITE_FAILED:${insert.error?.message ?? 'unknown'}`);

  const event = await appendOperationalEvent({
    eventName: 'cognitive_twin.reentry.governance_request_created',
    actorId: 'sfi:cognitive_twin_reentry_diagnostic',
    confidence: 1,
    payload: {
      proposal_id: insert.data.id,
      subject_id: connection.subjectId,
      connection_state: connection.connectionState,
      function_state: connection.functionState,
      observation_state: connection.observationState,
      validation_state: connection.validationState,
      requested_action: requestedAction,
    },
    lineage: [String(insert.data.id), connection.subjectId, connection.lineageId],
  });

  return { ok: true as const, proposed: true, proposal: insert.data, event: event.ok ? event.data : event, connection };
}

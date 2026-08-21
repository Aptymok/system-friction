import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  asRecord,
  errorMessage,
  readLatestProposalAlignment,
  readListFromView,
  textValue,
  type SfiRecord,
} from '@/lib/sfi/operationalConsole';
import { generateSfiOperationalResponse } from '@/lib/sfi/responseEngine';

export const PREPARE_EXECUTION_CONFIRMATION = 'PREPARE_INTERNAL_EXECUTION_LEDGER';

type PrepareExecutionBody = {
  apply?: boolean;
  confirmation?: string;
  case_id?: string;
  notes?: string;
};

type DegradedSource = { source: string; error: string };

function textBlob(...values: unknown[]) {
  return values.map((value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return JSON.stringify(value);
    return '';
  }).join(' ').toLowerCase();
}

function evidenceTiedToProposal(proposalId: string, evidenceMap: SfiRecord[]) {
  const id = proposalId.toLowerCase();
  return evidenceMap.some((item) => textBlob(
    item.id,
    item.proposal_id,
    item.proposalId,
    item.evidence_ref,
    item.source_table,
    item.source_label,
    item.summary,
    item.payload,
    item.source_payload,
  ).includes(id));
}

async function readProposal(proposalId: string, degradedSources: DegradedSource[]) {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('action_proposals').select('*').eq('id', proposalId).maybeSingle();
    if (error) throw error;
    return data ? asRecord(data) : null;
  } catch (error) {
    degradedSources.push({ source: 'action_proposals', error: errorMessage(error, 'action_proposals_read_failed') });
    return null;
  }
}

async function readExistingLedger(proposalId: string, caseId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('sfi_execution_ledger')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).find((row) => textValue(asRecord(row.source_payload).proposal_id) === proposalId) ?? null;
}

function buildPreparedPayload(input: {
  proposalId: string;
  proposal: SfiRecord;
  latestAlignment: SfiRecord;
  currentResponse: SfiRecord;
  evidenceMap: SfiRecord[];
  caseId: string;
  notes: string | null;
}) {
  const title = textValue(input.proposal.title);
  const objective = textValue(input.proposal.objective, textValue(input.proposal.description));
  const expected = asRecord(input.proposal.expected_field_delta);
  if (!title || !objective || Object.keys(expected).length === 0) throw new Error('PROPOSAL_EXECUTION_TRACE_INCOMPLETE');

  return {
    proposal_id: input.proposalId,
    case_id: input.caseId,
    title,
    objective,
    expected_field_delta: expected,
    latest_alignment: {
      id: textValue(input.latestAlignment.id),
      recommended_status: textValue(input.latestAlignment.recommended_status),
      rationale: textValue(input.latestAlignment.rationale),
      evidence_score: input.latestAlignment.evidence_score ?? null,
      alignment_score: input.latestAlignment.alignment_score ?? null,
    },
    current_response: {
      decision: textValue(input.currentResponse.decision),
      blocking_condition: input.currentResponse.blocking_condition ?? null,
      target_id: textValue(input.currentResponse.target_id),
      external_execution_allowed: false,
    },
    evidence_trace: {
      direct_evidence_present: evidenceTiedToProposal(input.proposalId, input.evidenceMap),
      matched_source_labels: input.evidenceMap
        .filter((item) => textBlob(item.source_label, item.payload, item.source_payload).includes(input.proposalId.toLowerCase()))
        .map((item) => textValue(item.source_label, textValue(item.source_table)))
        .filter(Boolean),
    },
    execution_controls: {
      external_execution_allowed: false,
      executed_at: null,
      manual_review_required: true,
      notes: input.notes,
    },
  };
}

export async function buildPrepareExecutionDiagnostic(input: { proposalId: string; body?: PrepareExecutionBody }) {
  const degradedSources: DegradedSource[] = [];
  const caseId = textValue(input.body?.case_id);
  if (!caseId) throw new Error('CASE_ID_REQUIRED');

  const [proposal, latestAlignmentResult, evidenceMapResult, currentResponse] = await Promise.all([
    readProposal(input.proposalId, degradedSources),
    readLatestProposalAlignment(input.proposalId),
    readListFromView('vw_sfi_evidence_map', 100),
    generateSfiOperationalResponse().catch((error) => {
      degradedSources.push({ source: 'sfi_response_engine', error: errorMessage(error, 'sfi_response_failed') });
      return null;
    }),
  ]);

  if (!latestAlignmentResult.ok) degradedSources.push({ source: latestAlignmentResult.source, error: textValue(latestAlignmentResult.error, 'sfi_proposal_alignment_read_failed') });
  if (!evidenceMapResult.ok) degradedSources.push({ source: evidenceMapResult.source, error: textValue(evidenceMapResult.error, 'vw_sfi_evidence_map_read_failed') });

  const latestAlignment = latestAlignmentResult.data ? asRecord(latestAlignmentResult.data) : null;
  const evidenceMap = Array.isArray(evidenceMapResult.data) ? evidenceMapResult.data.map(asRecord) : [];
  const response = currentResponse ? asRecord(currentResponse) : null;
  const latestStatus = textValue(latestAlignment?.recommended_status);
  const directEvidencePresent = evidenceTiedToProposal(input.proposalId, evidenceMap);
  const responseAllowsPreparation = textValue(response?.decision) === 'prepare_execution' && response?.blocking_condition === null && textValue(response?.target_id) === input.proposalId;
  const proposalTraceComplete = Boolean(
    proposal &&
    textValue(proposal.title) &&
    textValue(proposal.objective, textValue(proposal.description)) &&
    Object.keys(asRecord(proposal.expected_field_delta)).length,
  );

  const gates = {
    case_id_present: true,
    proposal_exists: Boolean(proposal),
    proposal_trace_complete: proposalTraceComplete,
    latest_alignment_status: latestStatus || null,
    alignment_allows_preparation: ['execute_now', 'prepare_execution', 'execute_only_if_aligned'].includes(latestStatus),
    direct_evidence_present: directEvidencePresent,
    response_allows_preparation: responseAllowsPreparation,
    external_execution_allowed: false,
  };

  const canPrepareInternalLedger = Object.values({
    proposal_exists: gates.proposal_exists,
    proposal_trace_complete: gates.proposal_trace_complete,
    alignment_allows_preparation: gates.alignment_allows_preparation,
    direct_evidence_present: gates.direct_evidence_present,
    response_allows_preparation: gates.response_allows_preparation,
  }).every(Boolean) && degradedSources.length === 0;

  const preparedPayload = canPrepareInternalLedger && proposal && latestAlignment && response
    ? buildPreparedPayload({
        proposalId: input.proposalId,
        proposal,
        latestAlignment,
        currentResponse: response,
        evidenceMap,
        caseId,
        notes: textValue(input.body?.notes) || null,
      })
    : null;

  return {
    ok: canPrepareInternalLedger,
    generated_at: new Date().toISOString(),
    source: 'sfi_prepare_execution_diagnostic' as const,
    degraded: degradedSources.length > 0,
    degraded_sources: degradedSources,
    proposal_id: input.proposalId,
    case_id: caseId,
    gates,
    prepared_payload: preparedPayload,
    dry_run: true,
    can_prepare_internal_ledger: canPrepareInternalLedger,
    external_execution_allowed: false as const,
    next_safe_action: canPrepareInternalLedger ? 'apply_prepare_execution_with_confirmation' : 'resolve_failed_gates',
  };
}

export async function prepareInternalExecutionLedger(input: { proposalId: string; body?: PrepareExecutionBody }) {
  const body = input.body ?? {};
  const diagnostic = await buildPrepareExecutionDiagnostic({ proposalId: input.proposalId, body });
  const shouldApply = body.apply === true && body.confirmation === PREPARE_EXECUTION_CONFIRMATION;

  if (!shouldApply) {
    return {
      ...diagnostic,
      source: 'sfi_prepare_execution_apply' as const,
      dry_run: true,
      applied: false,
      execution_id: null,
      perturbation_id: null,
      warnings: ['dry_run_only', `POST writes require apply=true and confirmation="${PREPARE_EXECUTION_CONFIRMATION}".`],
    };
  }

  if (!diagnostic.can_prepare_internal_ledger || !diagnostic.prepared_payload) {
    return {
      ...diagnostic,
      source: 'sfi_prepare_execution_apply' as const,
      dry_run: false,
      applied: false,
      execution_id: null,
      perturbation_id: null,
      warnings: ['prepare_execution_gates_failed'],
    };
  }

  const existingLedger = await readExistingLedger(input.proposalId, diagnostic.case_id);
  if (existingLedger) {
    return {
      ...diagnostic,
      source: 'sfi_prepare_execution_apply' as const,
      dry_run: false,
      applied: false,
      idempotent: true,
      execution_id: textValue(existingLedger.id) || null,
      perturbation_id: existingLedger.perturbation_id ?? null,
      external_execution_allowed: false as const,
      warnings: ['existing_execution_ledger_found_for_proposal'],
      next_safe_action: 'manual_review_existing_ledger' as const,
    };
  }

  const supabase = createServiceSupabaseClient();
  const preparedPayload = asRecord(diagnostic.prepared_payload);
  const expected = asRecord(preparedPayload.expected_field_delta);

  const perturbation = await supabase
    .from('sfi_field_perturbations')
    .insert({
      case_id: diagnostic.case_id,
      proposal_id: input.proposalId,
      perturbation_type: 'governed_execution_preparation',
      target_domain: textValue(expected.target_domain, textValue(expected.domain, 'sfi_internal')),
      target_audience: textValue(expected.target_audience) || null,
      minimal_action: textValue(preparedPayload.title),
      expected_effect: JSON.stringify(expected),
      risk_level: textValue(expected.risk_level) || 'unassessed',
      status: 'pending_manual_review',
      source_pipeline: {
        proposal_id: input.proposalId,
        external_execution_allowed: false,
        prepared_payload: preparedPayload,
      },
    })
    .select('id')
    .single();
  if (perturbation.error) throw perturbation.error;

  const execution = await supabase
    .from('sfi_execution_ledger')
    .insert({
      perturbation_id: perturbation.data.id,
      case_id: diagnostic.case_id,
      actor: 'sfi_governed_prepare_execution',
      artifact_type: 'internal_execution_plan',
      artifact_url: null,
      artifact_hash: null,
      execution_status: 'pending_manual_review',
      verification_status: 'pending_review',
      executed_at: null,
      source_payload: {
        ...preparedPayload,
        proposal_id: input.proposalId,
        external_execution_allowed: false,
        manual_review_required: true,
      },
    })
    .select('id')
    .single();
  if (execution.error) throw execution.error;

  return {
    ...diagnostic,
    source: 'sfi_prepare_execution_apply' as const,
    dry_run: false,
    applied: true,
    execution_id: textValue(execution.data.id) || null,
    perturbation_id: textValue(perturbation.data.id) || null,
    external_execution_allowed: false as const,
    warnings: ['ledger_created_pending_manual_review', 'external_execution_not_allowed', 'executed_at_left_null'],
    next_safe_action: 'manual_review_execution_ledger' as const,
  };
}

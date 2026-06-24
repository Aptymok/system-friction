import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  asRecord,
  errorMessage,
  numericValue,
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

const DEFAULT_CASE_ID = 'SFI-OPS-001';

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
    item.domain,
    item.evidence_side,
    item.source_table,
    item.source_label,
    item.summary,
    item.payload,
    item.source_payload,
    item,
  ).includes(id));
}

async function readProposal(proposalId: string, degradedSources: DegradedSource[]) {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('action_proposals')
      .select('*')
      .eq('id', proposalId)
      .maybeSingle();

    if (error) throw error;
    return data ? asRecord(data) : null;
  } catch (error) {
    degradedSources.push({
      source: 'action_proposals',
      error: errorMessage(error, 'action_proposals_read_failed'),
    });
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

  return (data ?? []).find((row) => {
    const payload = asRecord(row.source_payload);
    return textValue(payload.proposal_id) === proposalId;
  }) ?? null;
}

function buildPreparedPayload(input: {
  proposalId: string;
  proposal: SfiRecord;
  latestAlignment: SfiRecord | null;
  currentResponse: SfiRecord | null;
  evidenceMap: SfiRecord[];
  caseId: string;
  notes: string;
}) {
  const title = textValue(input.proposal.title, textValue(input.proposal.objective, 'repaired proposal trace'));
  const objective = textValue(input.proposal.objective, textValue(input.proposal.description, 'Prepare internal execution ledger for manual review.'));
  const expected = asRecord(input.proposal.expected_field_delta);

  return {
    proposal_id: input.proposalId,
    case_id: input.caseId,
    title,
    objective,
    expected_field_delta: expected,
    latest_alignment: {
      id: textValue(input.latestAlignment?.id) || null,
      recommended_status: textValue(input.latestAlignment?.recommended_status) || null,
      alignment_score: numericValue(input.latestAlignment?.alignment_score, null),
      evidence_score: numericValue(input.latestAlignment?.evidence_score, null),
      rationale: textValue(input.latestAlignment?.rationale) || null,
    },
    current_response: {
      decision: textValue(input.currentResponse?.decision) || null,
      blocking_condition: input.currentResponse?.blocking_condition ?? null,
      target_id: textValue(input.currentResponse?.target_id) || null,
      external_execution_allowed: false,
    },
    evidence_trace: {
      direct_evidence_present: evidenceTiedToProposal(input.proposalId, input.evidenceMap),
      evidence_map_count: input.evidenceMap.length,
      matched_source_labels: input.evidenceMap
        .filter((item) => textBlob(item.source_label, item, item.payload, item.source_payload).includes(input.proposalId.toLowerCase()))
        .map((item) => textValue(item.source_label, textValue(item.source_table, 'evidence_trace')))
        .filter(Boolean),
    },
    execution_controls: {
      external_execution_allowed: false,
      executed_at: null,
      manual_review_required: true,
      generated_by: 'sfi_phase_6_prepare_execution',
      notes: input.notes,
    },
  };
}

export async function buildPrepareExecutionDiagnostic(input: {
  proposalId: string;
  body?: PrepareExecutionBody;
}) {
  const degradedSources: DegradedSource[] = [];
  const caseId = textValue(input.body?.case_id, DEFAULT_CASE_ID);

  const [proposal, latestAlignmentResult, evidenceMapResult, currentResponse] = await Promise.all([
    readProposal(input.proposalId, degradedSources),
    readLatestProposalAlignment(input.proposalId),
    readListFromView('vw_sfi_evidence_map', 100),
    generateSfiOperationalResponse().catch((error) => {
      degradedSources.push({
        source: 'sfi_response_engine',
        error: errorMessage(error, 'sfi_response_failed'),
      });
      return null;
    }),
  ]);

  if (!latestAlignmentResult.ok) {
    degradedSources.push({
      source: latestAlignmentResult.source,
      error: textValue(latestAlignmentResult.error, 'sfi_proposal_alignment_read_failed'),
    });
  }

  if (!evidenceMapResult.ok) {
    degradedSources.push({
      source: evidenceMapResult.source,
      error: textValue(evidenceMapResult.error, 'vw_sfi_evidence_map_read_failed'),
    });
  }

  const latestAlignment = latestAlignmentResult.data ? asRecord(latestAlignmentResult.data) : null;
  const evidenceMap = Array.isArray(evidenceMapResult.data) ? evidenceMapResult.data.map(asRecord) : [];
  const response = currentResponse ? asRecord(currentResponse) : null;

  const alignmentScore = numericValue(latestAlignment?.alignment_score, null);
  const latestStatus = textValue(latestAlignment?.recommended_status);
  const directEvidencePresent = evidenceTiedToProposal(input.proposalId, evidenceMap);
  const responseAllowsPreparation =
    textValue(response?.decision) === 'prepare_execution' &&
    response?.blocking_condition === null &&
    textValue(response?.target_id) === input.proposalId;

  const gates = {
    proposal_exists: Boolean(proposal),
    latest_alignment_status: latestStatus || null,
    alignment_score: alignmentScore,
    alignment_allows_preparation: latestStatus === 'execute_now' && alignmentScore !== null && alignmentScore >= 0.45,
    direct_evidence_present: directEvidencePresent,
    response_allows_preparation: responseAllowsPreparation,
    external_execution_allowed: false,
  };

  const canPrepareInternalLedger =
    gates.proposal_exists &&
    gates.alignment_allows_preparation &&
    gates.direct_evidence_present &&
    gates.response_allows_preparation &&
    degradedSources.length === 0;

  const preparedPayload = buildPreparedPayload({
    proposalId: input.proposalId,
    proposal: proposal ?? { id: input.proposalId },
    latestAlignment,
    currentResponse: response,
    evidenceMap,
    caseId,
    notes: textValue(input.body?.notes, 'Phase 6 internal pending execution ledger for manual review.'),
  });

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
    next_safe_action: canPrepareInternalLedger
      ? 'apply_prepare_execution_with_confirmation'
      : 'resolve_failed_gates',
  };
}

export async function prepareInternalExecutionLedger(input: {
  proposalId: string;
  body?: PrepareExecutionBody;
}) {
  const body = input.body ?? {};
  const diagnostic = await buildPrepareExecutionDiagnostic({ proposalId: input.proposalId, body });

  const shouldApply =
    body.apply === true &&
    body.confirmation === PREPARE_EXECUTION_CONFIRMATION;

  if (!shouldApply) {
    return {
      ...diagnostic,
      source: 'sfi_prepare_execution_apply' as const,
      dry_run: true,
      applied: false,
      execution_id: null,
      perturbation_id: null,
      warnings: [
        'dry_run_only',
        `POST writes require apply=true and confirmation="${PREPARE_EXECUTION_CONFIRMATION}".`,
      ],
    };
  }

  if (!diagnostic.can_prepare_internal_ledger) {
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

  const perturbation = await supabase
    .from('sfi_field_perturbations')
    .insert({
      case_id: diagnostic.case_id,
      proposal_id: input.proposalId,
      perturbation_type: 'internal_execution_preparation',
      target_domain: 'sfi_internal_ledger',
      target_audience: 'manual_reviewer',
      minimal_action: 'Prepare pending internal execution ledger for manual review only.',
      expected_effect: 'Create a non-executed ledger record that can be reviewed before any external action is considered.',
      risk_level: 'medium',
      status: 'pending_manual_review',
      source_pipeline: {
        phase: '6',
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
      actor: 'sfi_phase_6_prepare_execution',
      artifact_type: 'internal_execution_plan',
      artifact_url: null,
      artifact_hash: null,
      execution_status: 'pending_manual_review',
      verification_status: 'pending_review',
      executed_at: null,
      source_payload: {
        ...preparedPayload,
        phase: '6',
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
    warnings: [
      'ledger_created_pending_manual_review',
      'external_execution_not_allowed',
      'executed_at_left_null',
    ],
    next_safe_action: 'manual_review_execution_ledger' as const,
  };
}

import { generateSfiOperationalResponse } from '@/lib/sfi/responseEngine';
import { asRecord, errorMessage, readLatestProposalAlignments, readListFromView, readSingleFromView, textValue, type SfiRecord } from '@/lib/sfi/operationalConsole';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type MissingEvidenceCode =
  | 'missing_candidate_alignment'
  | 'alignment_not_execution_eligible'
  | 'missing_proposal_objective'
  | 'missing_expected_field_delta'
  | 'missing_target_domain'
  | 'missing_verification_window'
  | 'missing_success_marker_mapping'
  | 'missing_active_attractor'
  | 'missing_outcome_measure'
  | 'missing_evidence_attachment'
  | 'blocked_by_current_response';

type MissingEvidenceRequirement = {
  code: MissingEvidenceCode;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggested_fix: string;
};

type EvidenceRequirementItem = {
  proposal_id: string;
  title: string;
  status: string | null;
  latest_alignment_status: string | null;
  can_prepare_execution: false;
  missing_evidence: MissingEvidenceRequirement[];
  required_next_action:
    | 'attach_evidence'
    | 'reformulate_proposal'
    | 'align_proposal'
    | 'define_verification_window'
    | 'map_to_attractor_success_markers'
    | 'observe';
  rationale: string;
};

type DegradedSource = { source: string; error: string };

const EXECUTION_ALIGNMENT_STATUSES = new Set(['execute_now', 'prepare_execution', 'execute_only_if_aligned']);

function rows(input: unknown): SfiRecord[] {
  return Array.isArray(input) ? input.filter((item): item is SfiRecord => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function textBlob(...values: unknown[]) {
  return values.map((value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return JSON.stringify(value);
    return '';
  }).join(' ').toLowerCase();
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function requirement(code: MissingEvidenceCode, severity: MissingEvidenceRequirement['severity'], message: string, suggestedFix: string): MissingEvidenceRequirement {
  return { code, severity, message, suggested_fix: suggestedFix };
}

function requiredNextAction(missing: MissingEvidenceRequirement[]): EvidenceRequirementItem['required_next_action'] {
  const codes = new Set(missing.map((item) => item.code));
  if (codes.has('missing_candidate_alignment') || codes.has('alignment_not_execution_eligible')) return 'align_proposal';
  if (codes.has('missing_proposal_objective') || codes.has('missing_expected_field_delta') || codes.has('missing_target_domain')) return 'reformulate_proposal';
  if (codes.has('missing_verification_window') || codes.has('missing_outcome_measure')) return 'define_verification_window';
  if (codes.has('missing_success_marker_mapping') || codes.has('missing_active_attractor')) return 'map_to_attractor_success_markers';
  if (codes.has('missing_evidence_attachment')) return 'attach_evidence';
  return 'observe';
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

async function readProposal(proposalId: string, degraded: DegradedSource[]) {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('action_proposals').select('*').eq('id', proposalId).maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch (error) {
    degraded.push({ source: 'action_proposals', error: errorMessage(error, 'action_proposals_read_failed') });
    return null;
  }
}

async function readProposals(proposalIds: string[], degraded: DegradedSource[]) {
  const ids = [...new Set(proposalIds.filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('action_proposals').select('*').in('id', ids);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    degraded.push({ source: 'action_proposals', error: errorMessage(error, 'action_proposals_read_failed') });
    return [];
  }
}

function buildItem(input: {
  proposal: SfiRecord;
  alignment: SfiRecord | null;
  attractor: SfiRecord | null;
  evidenceMap: SfiRecord[];
  responseTargetId: string | null;
  responseBlockingCondition: string | null;
}): EvidenceRequirementItem {
  const proposalId = textValue(input.proposal.id);
  const expected = asRecord(input.proposal.expected_field_delta);
  const latestStatus = input.alignment ? textValue(input.alignment.recommended_status) || null : null;
  const missing: MissingEvidenceRequirement[] = [];

  if (!input.attractor) {
    missing.push(requirement('missing_active_attractor', 'critical', 'No active declared attractor is available.', 'Declare an active attractor before evaluating proposal alignment.'));
  }
  if (!input.alignment) {
    missing.push(requirement('missing_candidate_alignment', 'critical', 'No explicit alignment assessment exists for this proposal.', 'Record an evidence-backed alignment assessment.'));
  } else if (!EXECUTION_ALIGNMENT_STATUSES.has(latestStatus ?? '')) {
    missing.push(requirement('alignment_not_execution_eligible', 'critical', `Latest explicit alignment status is ${latestStatus ?? 'missing'}.`, 'Resolve the alignment assessment before execution preparation.'));
  }
  if (!textValue(input.proposal.objective, textValue(input.proposal.description))) {
    missing.push(requirement('missing_proposal_objective', 'high', 'Proposal objective is absent.', 'Record the concrete objective before execution preparation.'));
  }
  if (Object.keys(expected).length === 0) {
    missing.push(requirement('missing_expected_field_delta', 'high', 'Expected field delta is absent.', 'Record expected_field_delta before execution preparation.'));
  }
  if (!textValue(expected.target_domain, textValue(expected.domain))) {
    missing.push(requirement('missing_target_domain', 'high', 'Expected field delta has no explicit target domain.', 'Add target_domain or domain to expected_field_delta.'));
  }
  if (!textValue(expected.verification_window, textValue(expected.verificationWindow, textValue(expected.window)))) {
    missing.push(requirement('missing_verification_window', 'high', 'Expected field delta has no explicit verification window.', 'Add an explicit verification_window to expected_field_delta.'));
  }
  if (!textValue(expected.outcome_measure, textValue(expected.metric, textValue(expected.success_condition)))) {
    missing.push(requirement('missing_outcome_measure', 'high', 'Expected field delta has no explicit outcome measure.', 'Add outcome_measure, metric, or success_condition to expected_field_delta.'));
  }

  const markerRefs = [
    ...stringList(expected.success_marker_refs),
    ...stringList(expected.successMarkerRefs),
    ...stringList(expected.attractor_marker_refs),
  ];
  if (input.attractor && markerRefs.length === 0) {
    missing.push(requirement('missing_success_marker_mapping', 'medium', 'Expected field delta has no explicit attractor success-marker references.', 'Add success_marker_refs to expected_field_delta; SFI does not infer marker mapping from word overlap.'));
  }
  if (!evidenceTiedToProposal(proposalId, input.evidenceMap)) {
    missing.push(requirement('missing_evidence_attachment', 'high', 'No persisted evidence record is directly tied to this proposal id.', 'Attach or reference evidence using this proposal id.'));
  }
  if (input.responseTargetId === proposalId && input.responseBlockingCondition) {
    missing.push(requirement('blocked_by_current_response', 'critical', `Current SFI response blocks this proposal with ${input.responseBlockingCondition}.`, 'Resolve the current response blocking condition before preparation.'));
  }

  return {
    proposal_id: proposalId,
    title: textValue(input.proposal.title, textValue(input.proposal.objective, proposalId)),
    status: textValue(input.proposal.status) || null,
    latest_alignment_status: latestStatus,
    can_prepare_execution: false,
    missing_evidence: missing,
    required_next_action: requiredNextAction(missing),
    rationale: missing.length
      ? `Proposal is blocked by ${missing.map((item) => item.code).join(', ')}.`
      : 'No evidence requirement is missing. This diagnostic still does not authorize execution.',
  };
}

export async function buildSfiEvidenceRequirements(input: { proposalId?: string | null; caseId?: string | null } = {}) {
  const caseId = textValue(input.caseId);
  if (!caseId) throw new Error('CASE_ID_REQUIRED');
  const degradedSources: DegradedSource[] = [];

  const [response, evidenceMapResult, recoveryQueueResult, activeAttractorResult] = await Promise.all([
    generateSfiOperationalResponse().catch((error) => {
      degradedSources.push({ source: 'sfi_response_engine', error: errorMessage(error, 'sfi_response_failed') });
      return null;
    }),
    readListFromView('vw_sfi_evidence_map', 50),
    readListFromView('vw_sfi_execution_recovery_queue', 25),
    readSingleFromView('sfi_declared_attractors'),
  ]);

  for (const result of [evidenceMapResult, recoveryQueueResult, activeAttractorResult]) {
    if (!result.ok) degradedSources.push({ source: result.source, error: textValue(result.error, `${result.source}_read_failed`) });
  }

  const explicitProposalId = textValue(input.proposalId);
  const responseTargetId = textValue(response?.target_id) || null;
  const responseBlocks = response?.decision === 'request_evidence' ? response.blocking_condition : null;
  const recoveryQueue = rows(recoveryQueueResult.data);
  const targetIds = explicitProposalId
    ? [explicitProposalId]
    : [...new Set([responseTargetId, ...recoveryQueue.slice(0, 8).map((item) => textValue(item.proposal_id, textValue(item.id)))].filter(Boolean) as string[])];

  const [proposals, alignmentsResult] = await Promise.all([
    readProposals(targetIds, degradedSources),
    readLatestProposalAlignments(targetIds),
  ]);

  if (!alignmentsResult.ok) degradedSources.push({ source: alignmentsResult.source, error: textValue(alignmentsResult.error, `${alignmentsResult.source}_read_failed`) });

  if (explicitProposalId && proposals.length === 0) {
    const proposal = await readProposal(explicitProposalId, degradedSources);
    if (proposal) proposals.push(proposal);
  }

  const alignmentByProposal = new Map(alignmentsResult.data.map((alignment) => [textValue(alignment.proposal_id), alignment]));
  const evidenceMap = rows(evidenceMapResult.data);
  const activeAttractor = asRecord(activeAttractorResult.data);
  const orderByProposalId = new Map(targetIds.map((id, index) => [id, index]));
  const items = proposals.map((proposal) => buildItem({
    proposal,
    alignment: alignmentByProposal.get(textValue(proposal.id)) ?? null,
    attractor: Object.keys(activeAttractor).length ? activeAttractor : null,
    evidenceMap,
    responseTargetId,
    responseBlockingCondition: responseBlocks,
  })).sort((a, b) => (orderByProposalId.get(a.proposal_id) ?? 999) - (orderByProposalId.get(b.proposal_id) ?? 999));

  return {
    ok: degradedSources.length === 0,
    generated_at: new Date().toISOString(),
    source: 'sfi_evidence_requirements' as const,
    case_id: caseId,
    degraded: degradedSources.length > 0,
    degraded_sources: degradedSources,
    current_response: {
      decision: textValue(response?.decision, 'unavailable'),
      blocking_condition: response?.blocking_condition ?? null,
      target_id: responseTargetId,
      external_execution_allowed: false as const,
    },
    items,
  };
}

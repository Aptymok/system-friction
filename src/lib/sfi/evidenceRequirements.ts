import { generateSfiOperationalResponse } from '@/lib/sfi/responseEngine';
import { asRecord, errorMessage, numericValue, readLatestProposalAlignments, readListFromView, readSingleFromView, textValue, type SfiRecord } from '@/lib/sfi/operationalConsole';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type MissingEvidenceCode =
  | 'missing_candidate_alignment'
  | 'alignment_score_below_threshold'
  | 'proposal_objective_too_generic'
  | 'missing_expected_field_delta'
  | 'missing_verification_window'
  | 'missing_success_marker_mapping'
  | 'missing_attractor_trace'
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
  alignment_score: number | null;
  evidence_score: number | null;
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

const DEFAULT_CASE_ID = 'SFI-OPS-001';
const GENERIC_TEXT = new Set(['cognitive_twin.proposal.created', 'mutation.proposed', 'not enough trace', 'missing evidence', 'missing execution plan']);

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

function isEmptyRecord(value: unknown) {
  const record = asRecord(value);
  return Object.keys(record).length === 0;
}

function isGenericProposal(proposal: SfiRecord) {
  const values = [
    textValue(proposal.title).toLowerCase(),
    textValue(proposal.objective).toLowerCase(),
    textValue(proposal.description).toLowerCase(),
  ].filter(Boolean);
  if (values.length === 0) return true;
  return values.some((value) => GENERIC_TEXT.has(value) || value.length < 12);
}

function hasVerificationWindow(proposal: SfiRecord, attractor: SfiRecord | null) {
  const expected = asRecord(proposal.expected_field_delta);
  return Boolean(
    textValue(expected.verification_window) ||
    textValue(expected.verificationWindow) ||
    textValue(expected.window) ||
    textValue(proposal.verification_window) ||
    textValue(proposal.horizon) ||
    textValue(attractor?.horizon),
  );
}

function markerList(attractor: SfiRecord | null) {
  const markers = attractor?.success_markers;
  if (Array.isArray(markers)) return markers.map((item) => String(item)).filter(Boolean);
  if (typeof markers === 'string') return markers.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function hasAttractorTrace(proposal: SfiRecord, attractor: SfiRecord | null) {
  if (!attractor) return false;
  const proposalText = textBlob(proposal.title, proposal.objective, proposal.description, proposal.expected_field_delta);
  return [attractor.title, attractor.desired_future_state, ...markerList(attractor)]
    .map((value) => textValue(value).toLowerCase())
    .filter((value) => value.length >= 5)
    .some((value) => proposalText.includes(value));
}

function hasSuccessMarkerMapping(proposal: SfiRecord, attractor: SfiRecord | null) {
  const proposalText = textBlob(proposal.title, proposal.objective, proposal.description, proposal.expected_field_delta);
  return markerList(attractor)
    .map((value) => value.toLowerCase())
    .filter((value) => value.length >= 5)
    .some((value) => proposalText.includes(value));
}

function hasOutcomeMeasure(proposal: SfiRecord) {
  const expected = asRecord(proposal.expected_field_delta);
  return Boolean(
    textValue(expected.outcome_measure) ||
    textValue(expected.observed_effect) ||
    textValue(expected.success_condition) ||
    textValue(expected.metric) ||
    textBlob(proposal.objective, proposal.description, proposal.expected_field_delta).match(/measure|metric|outcome|effect|verify|verificar|medir|evidencia/),
  );
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

function requirement(code: MissingEvidenceCode, severity: MissingEvidenceRequirement['severity'], message: string, suggested_fix: string): MissingEvidenceRequirement {
  return { code, severity, message, suggested_fix };
}

function requiredNextAction(missing: MissingEvidenceRequirement[]): EvidenceRequirementItem['required_next_action'] {
  const codes = new Set(missing.map((item) => item.code));
  if (codes.has('missing_candidate_alignment')) return 'align_proposal';
  if (codes.has('proposal_objective_too_generic') || codes.has('missing_expected_field_delta')) return 'reformulate_proposal';
  if (codes.has('missing_verification_window') || codes.has('missing_outcome_measure')) return 'define_verification_window';
  if (codes.has('missing_success_marker_mapping') || codes.has('missing_attractor_trace')) return 'map_to_attractor_success_markers';
  if (codes.has('alignment_score_below_threshold') || codes.has('missing_evidence_attachment')) return 'attach_evidence';
  return 'observe';
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
  const alignmentScore = numericValue(input.alignment?.alignment_score, null);
  const evidenceScore = numericValue(input.alignment?.evidence_score, null);
  const latestStatus = input.alignment ? textValue(input.alignment.recommended_status) || null : null;
  const missing: MissingEvidenceRequirement[] = [];

  if (!input.alignment) {
    missing.push(requirement('missing_candidate_alignment', 'critical', 'No latest alignment row exists for this proposal.', 'Run proposal alignment after attaching the missing evidence or reformulating the proposal.'));
  }
  if (alignmentScore === null || alignmentScore < 0.45) {
    missing.push(requirement('alignment_score_below_threshold', 'critical', `Alignment score ${alignmentScore ?? 'missing'} is below the 0.45 preparation threshold.`, 'Attach evidence that explicitly links the proposal to the active attractor and rerun alignment.'));
  }
  if (isGenericProposal(input.proposal)) {
    missing.push(requirement('proposal_objective_too_generic', 'high', 'The proposal title, objective, or description is too generic to verify operational movement.', 'Reformulate the proposal with a concrete objective, affected vector, and expected operational change.'));
  }
  if (isEmptyRecord(input.proposal.expected_field_delta)) {
    missing.push(requirement('missing_expected_field_delta', 'high', 'The proposal does not define an expected field delta.', 'Add expected_field_delta with objective, affected field, expected effect, verification window, and success measure.'));
  }
  if (!hasVerificationWindow(input.proposal, input.attractor)) {
    missing.push(requirement('missing_verification_window', 'high', 'No verification window, horizon, or measurable check is available.', 'Define a concrete verification window before execution preparation can be considered.'));
  }
  if (!hasAttractorTrace(input.proposal, input.attractor)) {
    missing.push(requirement('missing_attractor_trace', 'high', 'The proposal does not reference the active attractor title, desired future state, or success markers.', 'Tie the proposal text and expected delta to the active attractor.'));
  }
  if (!hasSuccessMarkerMapping(input.proposal, input.attractor)) {
    missing.push(requirement('missing_success_marker_mapping', 'medium', 'No active attractor success marker maps to the proposal.', 'Map at least one attractor success marker to the expected field delta or verification criteria.'));
  }
  if (!hasOutcomeMeasure(input.proposal)) {
    missing.push(requirement('missing_outcome_measure', 'medium', 'No measurable outcome or effect check exists for the proposal.', 'Define the observable outcome, metric, or effect that would prove movement.'));
  }
  if (input.evidenceMap.length > 0 && !evidenceTiedToProposal(proposalId, input.evidenceMap)) {
    missing.push(requirement('missing_evidence_attachment', 'high', 'Evidence exists in the map, but none is directly tied to this proposal id.', 'Attach or reference evidence using this proposal id before requesting execution preparation.'));
  }
  if (input.responseTargetId === proposalId && input.responseBlockingCondition) {
    missing.push(requirement('blocked_by_current_response', 'critical', `Current SFI response blocks this proposal with ${input.responseBlockingCondition}.`, 'Resolve the current response blocking condition before any execution preparation.'));
  }

  return {
    proposal_id: proposalId,
    title: textValue(input.proposal.title, textValue(input.proposal.objective, 'not enough trace')),
    status: textValue(input.proposal.status) || null,
    latest_alignment_status: latestStatus,
    alignment_score: alignmentScore,
    evidence_score: evidenceScore,
    can_prepare_execution: false,
    missing_evidence: missing,
    required_next_action: requiredNextAction(missing),
    rationale: missing.length
      ? `Proposal is blocked by ${missing.map((item) => item.code).join(', ')}. Execution preparation remains disabled.`
      : 'No blocking evidence requirement was detected, but this diagnostic endpoint never approves execution preparation.',
  };
}

export async function buildSfiEvidenceRequirements(input: { proposalId?: string | null; caseId?: string | null } = {}) {
  const caseId = textValue(input.caseId, DEFAULT_CASE_ID);
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


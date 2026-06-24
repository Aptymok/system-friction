import { buildSfiEvidenceRequirements } from '@/lib/sfi/evidenceRequirements';
import {
  asRecord,
  errorMessage,
  numericValue,
  readLatestProposalAlignment,
  textValue,
  type SfiRecord,
} from '@/lib/sfi/operationalConsole';
import { generateSfiOperationalResponse } from '@/lib/sfi/responseEngine';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type SfiProposalRepairBody = {
  apply?: boolean;
  confirmation?: string;
  notes?: string;
};

type DegradedSource = { source: string; error: string };

const APPLY_CONFIRMATION = 'APPLY_PROPOSAL_TRACE_REPAIR';
const ALIGNMENT_THRESHOLD = 0.45;
const GENERIC_TITLES = new Set([
  'cognitive_twin.proposal.created',
  'mutation.proposed',
  'not enough trace',
  'missing evidence',
  'missing execution plan',
]);

function jsonRecord(value: unknown): SfiRecord {
  return asRecord(value);
}

function markerList(attractor: SfiRecord | null): string[] {
  const markers = attractor?.success_markers;
  if (Array.isArray(markers)) return markers.map((item) => String(item).trim()).filter(Boolean);
  if (typeof markers === 'string') return markers.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function isGenericTitle(value: unknown) {
  const title = textValue(value).toLowerCase();
  return !title || GENERIC_TITLES.has(title) || title.includes('cognitive_twin') || title.length < 12;
}

function safeTitleFragment(value: unknown) {
  const title = textValue(value);
  if (!title || isGenericTitle(title)) return '';
  return title.replace(/\s+/g, ' ').trim();
}

function buildConcreteTitle(proposal: SfiRecord, attractor: SfiRecord | null) {
  const explicitTitle = safeTitleFragment(proposal.title);
  if (explicitTitle) return `Repair proposal trace: ${explicitTitle}`;

  const attractorTitle = textValue(attractor?.title, 'SFI responsive operating system');
  return `Repair proposal trace for ${attractorTitle}`;
}

function missingCodesFromRequirements(requirements: SfiRecord, proposalId: string) {
  const items = Array.isArray(requirements.items) ? requirements.items : [];
  const item = items.find((entry) => textValue(asRecord(entry).proposal_id) === proposalId) ?? items[0];
  const itemRecord = asRecord(item);
  const missingEvidence = Array.isArray(itemRecord.missing_evidence) ? itemRecord.missing_evidence : [];

  return {
    item: itemRecord,
    missing_codes: missingEvidence.map((entry) => textValue(asRecord(entry).code)).filter(Boolean),
    required_next_action: textValue(itemRecord.required_next_action, 'review_repair_draft'),
  };
}

function buildDescription(input: {
  proposal: SfiRecord;
  attractor: SfiRecord | null;
  missingCodes: string[];
}) {
  const attractorTitle = textValue(input.attractor?.title, 'active SFI attractor');
  const desiredState = textValue(input.attractor?.desired_future_state, 'the declared desired future state');
  const missing = input.missingCodes.length ? input.missingCodes.join(', ') : 'no explicit missing evidence codes';

  return [
    `Repair proposal trace for alignment review against ${attractorTitle}.`,
    `The repaired proposal must support: ${desiredState}.`,
    `Current blockers to resolve: ${missing}.`,
    'This repair does not authorize execution, does not prepare a ledger, and keeps external execution disabled.',
  ].join(' ');
}

function buildSuccessMarkerMapping(attractor: SfiRecord | null) {
  const markers = markerList(attractor);
  const usableMarkers = markers.length ? markers : ['decisions governed by evidence'];

  return usableMarkers.slice(0, 5).map((marker) => ({
    attractor_marker: marker,
    proposal_trace: `Repair proposal language and expected_field_delta so this marker is explicitly referenced before alignment review.`,
    verification_hint: `Rerun alignment and require alignment_score >= ${ALIGNMENT_THRESHOLD}.`,
  }));
}

function buildEvidenceAttachmentPlan(proposalId: string, missingCodes: string[]) {
  const needs = new Set<string>([
    'direct_proposal_evidence_reference',
    'active_attractor_trace',
    'success_marker_mapping',
  ]);

  if (missingCodes.includes('missing_evidence_attachment')) needs.add('evidence_map_attachment');
  if (missingCodes.includes('alignment_score_below_threshold')) needs.add('alignment_score_recheck');
  if (missingCodes.includes('missing_outcome_measure')) needs.add('observable_outcome_measure');

  return [...needs].map((need) => ({
    evidence_need: need,
    suggested_source: need === 'evidence_map_attachment' ? 'vw_sfi_evidence_map' : 'action_proposals.expected_field_delta',
    attachment_rule: `Must explicitly reference proposal_id=${proposalId} before execution preparation can be reconsidered.`,
  }));
}

export function generateProposalTraceRepairDraft(input: {
  proposal: SfiRecord;
  attractor: SfiRecord | null;
  evidenceRequirementItem: SfiRecord;
  missingCodes: string[];
  requiredNextAction: string;
}) {
  const proposalId = textValue(input.proposal.id);
  const attractorTitle = textValue(input.attractor?.title, 'SFI responsive operating system');
  const desiredState = textValue(
    input.attractor?.desired_future_state,
    'SFI observes, aligns, verifies and responds through governed evidence.',
  );

  return {
    repaired_title: buildConcreteTitle(input.proposal, input.attractor),
    repaired_objective: `Repair proposal trace and prepare it for alignment review against ${attractorTitle}.`,
    repaired_description: buildDescription({
      proposal: input.proposal,
      attractor: input.attractor,
      missingCodes: input.missingCodes,
    }),
    expected_field_delta: {
      affected_field: 'sfi_proposal_trace',
      expected_change: `Generic proposal becomes a concrete, evidence-traceable alignment candidate for ${attractorTitle}.`,
      verification_window: textValue(input.attractor?.horizon, 'next operational review cycle'),
      success_measure: `alignment_score >= ${ALIGNMENT_THRESHOLD} after manual repair and rerun alignment`,
      evidence_requirement: input.requiredNextAction,
      attractor_trace: desiredState,
      proposal_id: proposalId,
      external_execution_allowed: false,
      can_prepare_execution: false,
    },
    success_marker_mapping: buildSuccessMarkerMapping(input.attractor),
    evidence_attachment_plan: buildEvidenceAttachmentPlan(proposalId, input.missingCodes),
    alignment_recheck_plan: {
      endpoint: `/api/sfi/proposals/${proposalId}/align`,
      threshold: ALIGNMENT_THRESHOLD,
      expected_minimum_alignment_score: ALIGNMENT_THRESHOLD,
      external_execution_allowed: false,
    },
  };
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

async function readActiveAttractor(degradedSources: DegradedSource[]) {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('sfi_declared_attractors')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? asRecord(data) : null;
  } catch (error) {
    degradedSources.push({ source: 'sfi_declared_attractors', error: errorMessage(error, 'sfi_declared_attractors_read_failed') });
    return null;
  }
}

export async function buildProposalTraceRepair(proposalId: string) {
  const degradedSources: DegradedSource[] = [];

  const [proposal, activeAttractor, evidenceRequirements, latestAlignment, currentResponse] = await Promise.all([
    readProposal(proposalId, degradedSources),
    readActiveAttractor(degradedSources),
    buildSfiEvidenceRequirements({ proposalId }).catch((error) => {
      degradedSources.push({ source: 'sfi_evidence_requirements', error: errorMessage(error, 'sfi_evidence_requirements_failed') });
      return null;
    }),
    readLatestProposalAlignment(proposalId).catch((error) => {
      degradedSources.push({ source: 'sfi_proposal_alignment', error: errorMessage(error, 'sfi_proposal_alignment_failed') });
      return { ok: false, data: null, source: 'sfi_proposal_alignment', error: errorMessage(error, 'sfi_proposal_alignment_failed') };
    }),
    generateSfiOperationalResponse().catch((error) => {
      degradedSources.push({ source: 'sfi_response_engine', error: errorMessage(error, 'sfi_response_failed') });
      return null;
    }),
  ]);

  if (!latestAlignment.ok) {
    degradedSources.push({
      source: latestAlignment.source,
      error: textValue(latestAlignment.error, 'sfi_proposal_alignment_read_failed'),
    });
  }

  const requirementsRecord = asRecord(evidenceRequirements);
  const { item, missing_codes, required_next_action } = missingCodesFromRequirements(requirementsRecord, proposalId);
  const alignmentRecord = latestAlignment.data ? asRecord(latestAlignment.data) : null;

  const safeProposal = proposal ?? { id: proposalId };
  const repairDraft = generateProposalTraceRepairDraft({
    proposal: safeProposal,
    attractor: activeAttractor,
    evidenceRequirementItem: item,
    missingCodes: missing_codes,
    requiredNextAction: required_next_action,
  });

  return {
    ok: Boolean(proposal) && degradedSources.length === 0,
    generated_at: new Date().toISOString(),
    source: 'sfi_proposal_trace_repair' as const,
    degraded: degradedSources.length > 0 || !proposal,
    degraded_sources: [
      ...degradedSources,
      ...(!proposal ? [{ source: 'action_proposals', error: 'proposal_not_found' }] : []),
    ],
    proposal_id: proposalId,
    current_response: {
      decision: textValue(currentResponse?.decision, 'unavailable'),
      blocking_condition: currentResponse?.blocking_condition ?? null,
      external_execution_allowed: false as const,
    },
    original: {
      title: proposal ? textValue(proposal.title) || null : null,
      objective: proposal ? textValue(proposal.objective) || null : null,
      description: proposal ? textValue(proposal.description) || null : null,
      status: proposal ? textValue(proposal.status) || null : null,
      expected_field_delta: proposal?.expected_field_delta ?? null,
    },
    evidence_requirements: {
      required_next_action,
      missing_codes,
    },
    latest_alignment: {
      recommended_status: alignmentRecord ? textValue(alignmentRecord.recommended_status) || null : null,
      alignment_score: numericValue(alignmentRecord?.alignment_score, null),
      evidence_score: numericValue(alignmentRecord?.evidence_score, null),
    },
    active_attractor: {
      id: activeAttractor ? textValue(activeAttractor.id) || null : null,
      title: activeAttractor ? textValue(activeAttractor.title) || null : null,
      desired_future_state: activeAttractor ? textValue(activeAttractor.desired_future_state) || null : null,
      success_markers: activeAttractor?.success_markers ?? null,
    },
    repair_draft: repairDraft,
    can_write: true,
    can_prepare_execution: false as const,
    next_safe_action: 'apply_repair_with_confirmation' as const,
    internal: {
      proposal: safeProposal,
      activeAttractor,
      evidenceRequirementItem: item,
      evidenceRequirements: requirementsRecord,
    },
  };
}

function allowedProposalUpdatePayload(original: SfiRecord, repairDraft: SfiRecord) {
  const updatePayload: SfiRecord = {};
  const draft = asRecord(repairDraft);

  if ('title' in original) updatePayload.title = textValue(draft.repaired_title);
  if ('objective' in original) updatePayload.objective = textValue(draft.repaired_objective);
  if ('description' in original) updatePayload.description = textValue(draft.repaired_description);
  if ('expected_field_delta' in original) updatePayload.expected_field_delta = draft.expected_field_delta;

  return updatePayload;
}

export async function applyProposalTraceRepair(input: {
  proposalId: string;
  body: SfiProposalRepairBody;
}) {
  const body = asRecord(input.body);
  const repair = await buildProposalTraceRepair(input.proposalId);
  const repairDraft = asRecord(repair.repair_draft);
  const proposal = asRecord(repair.internal.proposal);
  const shouldApply = body.apply === true && body.confirmation === APPLY_CONFIRMATION;

  if (!shouldApply) {
    const warnings = [
      'dry_run_only',
      `POST writes require apply=true and confirmation="${APPLY_CONFIRMATION}".`,
    ];

    return {
      ok: true,
      generated_at: new Date().toISOString(),
      source: 'sfi_proposal_trace_repair_apply' as const,
      proposal_id: input.proposalId,
      dry_run: true,
      applied: false,
      audit_id: null,
      updated_fields: [] as string[],
      repair_draft: repairDraft,
      external_execution_allowed: false as const,
      can_prepare_execution: false as const,
      next_safe_action: 'review_repair_draft' as const,
      warnings,
    };
  }

  const supabase = createServiceSupabaseClient();
  const originalSnapshot = {
    title: repair.original.title,
    objective: repair.original.objective,
    description: repair.original.description,
    status: repair.original.status,
    expected_field_delta: repair.original.expected_field_delta,
  };
  const updatePayload = allowedProposalUpdatePayload(proposal, repairDraft);
  const updatedFields = Object.keys(updatePayload);
  const warnings: string[] = [];

  const { data: audit, error: auditError } = await supabase
    .from('sfi_proposal_repair_audit')
    .insert({
      proposal_id: input.proposalId,
      repair_draft: repairDraft,
      original_snapshot: originalSnapshot,
      evidence_requirements: repair.evidence_requirements,
      applied: true,
      applied_at: new Date().toISOString(),
      created_by: 'sfi_phase_5de',
      notes: textValue(body.notes, 'controlled proposal trace repair apply'),
    })
    .select('id')
    .single();

  if (auditError) throw auditError;

  if (updatedFields.length === 0) {
    warnings.push('no_allowed_action_proposals_fields_detected');
  } else {
    const { error: updateError } = await supabase
      .from('action_proposals')
      .update(updatePayload)
      .eq('id', input.proposalId);

    if (updateError) throw updateError;
  }

  warnings.push('alignment_not_rerun_automatically');
  warnings.push('execution_preparation_not_called');

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    source: 'sfi_proposal_trace_repair_apply' as const,
    proposal_id: input.proposalId,
    dry_run: false,
    applied: true,
    audit_id: textValue(audit?.id) || null,
    updated_fields: updatedFields,
    repair_draft: repairDraft,
    external_execution_allowed: false as const,
    can_prepare_execution: false as const,
    next_safe_action: 'rerun_alignment' as const,
    warnings,
  };
}

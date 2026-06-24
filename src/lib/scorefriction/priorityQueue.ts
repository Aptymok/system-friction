import { buildScoreFrictionRiskGraph, clamp01, type ScoreFrictionRiskNode } from '@/lib/scorefriction/riskGraph';
import { numericValue, readLatestProposalAlignments, textValue } from '@/lib/sfi/operationalConsole';

export type ScoreFrictionPriorityItem = {
  id: string;
  label: string;
  kind: string;
  priority_score: number;
  impact_score: number;
  friction_score: number;
  propagation_velocity: number;
  coupling_score: number;
  evidence_gap: number;
  degradation_score: number;
  confidence: number;
  recommended_status:
    | 'observe'
    | 'request_evidence'
    | 'reformulate'
    | 'prepare_execution'
    | 'execute_only_if_aligned'
    | 'close_obsolete';
  rationale: string;
  blocking_condition: string | null;
  source_node_id: string;
};

const DEFAULT_CASE_ID = 'SFI-OPS-001';

function impactScore(node: ScoreFrictionRiskNode) {
  if (node.kind === 'sfi_response') return 0.9;
  if (node.kind === 'proposal' || node.kind === 'execution') return 0.78;
  if (node.kind === 'operational_regime') return 0.7;
  if (node.kind === 'world_vector') return 0.58;
  if (node.kind === 'degraded_source') return 0.48;
  return 0.35;
}

function priorityScore(node: ScoreFrictionRiskNode, impact_score: number) {
  return Number((
    clamp01(impact_score) *
    clamp01(node.friction_score) *
    clamp01(node.propagation_velocity) *
    clamp01(node.coupling_score) *
    clamp01(node.evidence_gap) *
    clamp01(node.confidence)
  ).toFixed(4));
}

function proposalIdFromNode(node: ScoreFrictionRiskNode) {
  if (node.kind !== 'proposal' || !node.id.startsWith('proposal-')) return null;
  if (node.source !== 'vw_sfi_execution_recovery_queue' && node.source !== 'vw_sfi_attractor_alignment_queue') return null;
  return node.id.slice('proposal-'.length).replace(/-alignment$/, '');
}

function alignmentBlocksExecution(alignment: Record<string, unknown> | null | undefined) {
  if (!alignment) return true;
  const status = textValue(alignment.recommended_status);
  const score = numericValue(alignment.alignment_score, null);
  return status === 'request_evidence' || score === null || score < 0.45;
}

function statusFor(node: ScoreFrictionRiskNode, noActiveAttractor: boolean): ScoreFrictionPriorityItem['recommended_status'] {
  if (node.evidence_count <= 0) return 'request_evidence';
  if (noActiveAttractor) return node.kind === 'proposal' ? 'request_evidence' : 'observe';
  if (node.recommended_action === 'prepare_execution' && node.risk_status !== 'actionable_candidate') return 'request_evidence';
  return node.recommended_action;
}

function rationaleFor(node: ScoreFrictionRiskNode, status: ScoreFrictionPriorityItem['recommended_status'], noActiveAttractor: boolean) {
  if (noActiveAttractor && (status === 'observe' || status === 'request_evidence')) {
    return 'Execution is blocked because no active declared attractor is present.';
  }
  if (node.evidence_count <= 0) return 'Evidence is absent, so the item remains a watch-only evidence request.';
  if (node.kind === 'degraded_source') return 'A source is degraded; priority reflects observation repair, not operational execution.';
  if (status === 'execute_only_if_aligned') return 'SFI response requires alignment; this may only proceed if alignment is completed and verified.';
  if (status === 'prepare_execution') return 'Response engine allows preparation and required governance conditions are present; this still does not execute externally.';
  return `Derived from ${node.source} with emergence risk ${node.emergence_risk.toFixed(4)}.`;
}

function alignmentRationale(alignment: Record<string, unknown> | null | undefined) {
  if (!alignment) return 'Latest alignment is unavailable, so the proposal remains blocked pending alignment evidence.';
  return `Latest alignment status is ${textValue(alignment.recommended_status, 'unknown')} with alignment_score ${String(numericValue(alignment.alignment_score, null) ?? 'missing')}; evidence is required before execution-like handling.`;
}

export async function buildScoreFrictionPriorityQueue(input: {
  caseId?: string;
} = {}): Promise<{
  ok: boolean;
  generated_at: string;
  source: 'scorefriction_priority_queue';
  case_id: string;
  degraded: boolean;
  items: ScoreFrictionPriorityItem[];
}> {
  const caseId = input.caseId?.trim() || DEFAULT_CASE_ID;
  const graph = await buildScoreFrictionRiskGraph({ caseId });
  const responseNode = graph.nodes.find((node) => node.kind === 'sfi_response');
  const noActiveAttractor = responseNode?.label === 'request_attractor' || responseNode?.recommended_action === 'observe' && responseNode.evidence_count <= 0;
  const proposalIds = graph.nodes.map(proposalIdFromNode).filter((id): id is string => Boolean(id));
  const latestAlignmentsResult = await readLatestProposalAlignments(proposalIds);
  const latestAlignmentByProposal = new Map(
    latestAlignmentsResult.data.map((alignment) => [textValue(alignment.proposal_id), alignment] as const).filter(([id]) => Boolean(id)),
  );

  const items = graph.nodes
    .filter((node) => node.kind !== 'evidence' && node.kind !== 'lesson')
    .map((node) => {
      const impact_score = impactScore(node);
      const proposalId = proposalIdFromNode(node);
      const latestAlignment = proposalId ? latestAlignmentByProposal.get(proposalId) ?? null : null;
      const blockedByAlignment = Boolean(proposalId) && alignmentBlocksExecution(latestAlignment);
      const recommended_status = blockedByAlignment ? 'request_evidence' : statusFor(node, Boolean(noActiveAttractor));
      return {
        id: `priority-${node.id}`,
        label: node.label,
        kind: node.kind,
        priority_score: priorityScore(node, impact_score),
        impact_score,
        friction_score: node.friction_score,
        propagation_velocity: node.propagation_velocity,
        coupling_score: node.coupling_score,
        evidence_gap: node.evidence_gap,
        degradation_score: node.degradation_score,
        confidence: node.confidence,
        recommended_status,
        rationale: blockedByAlignment ? alignmentRationale(latestAlignment) : rationaleFor(node, recommended_status, Boolean(noActiveAttractor)),
        blocking_condition: blockedByAlignment ? 'alignment_requires_evidence' : node.evidence_count <= 0 ? 'missing_evidence' : node.risk_status === 'watch_only' ? 'watch_only' : null,
        source_node_id: node.id,
      } satisfies ScoreFrictionPriorityItem;
    })
    .sort((a, b) => b.priority_score - a.priority_score);

  return {
    ok: graph.ok,
    generated_at: new Date().toISOString(),
    source: 'scorefriction_priority_queue',
    case_id: caseId,
    degraded: graph.degraded || !latestAlignmentsResult.ok,
    items,
  };
}

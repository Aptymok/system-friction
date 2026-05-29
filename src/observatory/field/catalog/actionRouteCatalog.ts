import { asRecord, stringValue, type ExecutionCatalogItem } from './fieldMatrixBuilder';

export function buildActionRouteCatalog(input: { actionProposals?: unknown[]; deltaDecisions?: unknown[]; policyDecisions?: unknown[] }): ExecutionCatalogItem[] {
  const items: ExecutionCatalogItem[] = [];
  for (const [index, row] of (input.actionProposals || []).entries()) {
    const record = asRecord(row);
    items.push({
      executionId: stringValue(record.id, `proposal-${index}`) ?? `proposal-${index}`,
      title: stringValue(record.title, `Proposal ${index + 1}`) ?? `Proposal ${index + 1}`,
      applicablePatterns: [],
      requiredApproval: record.approval_required !== false,
      expectedFieldDelta: asRecord(record.expected_field_delta),
      riskLevel: stringValue(record.risk_level, 'unknown') ?? 'unknown',
      verificationCriterion: stringValue(record.description, 'approval_required') ?? 'approval_required',
      source: 'action_proposals',
    });
  }
  for (const [index, row] of (input.deltaDecisions || []).entries()) {
    const record = asRecord(row);
    items.push({
      executionId: stringValue(record.id, `delta-${index}`) ?? `delta-${index}`,
      title: stringValue(record.recommended_mode, `Delta ${index + 1}`) ?? `Delta ${index + 1}`,
      applicablePatterns: [],
      requiredApproval: true,
      expectedFieldDelta: asRecord(record.delta_vector),
      riskLevel: Number(record.intensity || 0) > 0.66 ? 'high' : 'medium',
      verificationCriterion: stringValue(record.explanation, 'delta_review') ?? 'delta_review',
      source: 'delta_decisions',
    });
  }
  for (const [index, row] of (input.policyDecisions || []).entries()) {
    const record = asRecord(row);
    items.push({
      executionId: stringValue(record.id, `policy-${index}`) ?? `policy-${index}`,
      title: stringValue(record.reason, `Policy ${index + 1}`) ?? `Policy ${index + 1}`,
      applicablePatterns: [],
      requiredApproval: record.requires_approval !== false,
      expectedFieldDelta: asRecord(record.payload),
      riskLevel: record.allow_execution === true ? 'medium' : 'low',
      verificationCriterion: record.allow_execution === true ? 'policy_allows' : 'proposal_only',
      source: 'policy_decisions',
    });
  }
  return items;
}

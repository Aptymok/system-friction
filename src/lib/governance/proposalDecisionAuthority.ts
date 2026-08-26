import { recordValue, stringValue } from '@/lib/operational/common';

export type ProposalDecisionAuthority = 'root' | 'controller';
export type ProposalDecisionClass = 'delegable' | 'root_only';

const ROOT_ONLY_TERMS = [
  'canon',
  'canonical',
  'root',
  'founder',
  'sovereign',
  'governance policy',
  'permission',
  'permissions',
  'access control',
  'credential',
  'credentials',
  'oauth',
  'authentication',
  'authorization',
  'security',
  'billing',
  'subscription',
  'ownership',
  'owner transfer',
  'role change',
];

function normalizedText(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function proposalText(row: Record<string, unknown>) {
  const expected = recordValue(row.expected_field_delta);
  const proportionality = recordValue(row.proportionality_check);
  const payload = recordValue(expected.payload);
  return [
    row.title,
    row.description,
    row.proposal_type,
    expected.proposalType,
    expected.proposal_type,
    expected.objective,
    payload.proposalType,
    payload.proposal_type,
    proportionality.proposalType,
    proportionality.proposal_type,
  ].map(normalizedText).filter(Boolean).join(' | ');
}

export function classifyProposalDecision(row: Record<string, unknown>): ProposalDecisionClass {
  const expected = recordValue(row.expected_field_delta);
  const payload = recordValue(expected.payload);
  const explicit = normalizedText(payload.decision_authority ?? expected.decision_authority);
  if (explicit === 'root_only' || explicit === 'root') return 'root_only';
  if (explicit === 'delegable' || explicit === 'controller') return 'delegable';

  const risk = normalizedText(row.risk_level);
  if (risk === 'critical' || risk === 'high' || risk === 'unassessable' || risk === 'missing_input_for_risk') return 'root_only';

  const text = proposalText(row);
  if (ROOT_ONLY_TERMS.some((term) => text.includes(term))) return 'root_only';

  return 'delegable';
}

export function controllerCanDecideProposal(row: Record<string, unknown>) {
  return classifyProposalDecision(row) === 'delegable';
}

export function proposalDecisionActor(row: Record<string, unknown>) {
  const outcome = recordValue(row.outcome);
  return stringValue(outcome.actorId) ?? null;
}

import { createActionProposal, latestActionProposals, recordValue, sha256, stringValue } from '@/lib/operational/common';
import type { KernelContext } from './kernelContext';
import { materialEvidenceView } from './materialEvidence';

type Row = Record<string, unknown>;

const ELIGIBLE_AGENTS = new Set([
  'friction_field_simulator',
  'temporal_resolver',
  'opportunity_agent',
  'cross_impact',
  'risk_agent',
  'project_execution_manager',
]);

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function strings(value: unknown, max = 20) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, max)
    : [];
}

function interventionRows(value: unknown) {
  return Array.isArray(value) ? value.map(row).filter((item) => Object.keys(item).length > 0).slice(0, 3) : [];
}

function existingProposalKeys(rows: unknown[]) {
  const keys = new Set<string>();
  for (const value of rows) {
    const proposal = row(value);
    const expected = row(proposal.expected_field_delta);
    const payload = row(expected.payload);
    const key = stringValue(payload.proposalKey);
    if (key) keys.add(key);
  }
  return keys;
}

export async function emitGovernedProposalsFromAgentInsight(agentId: string, context: KernelContext): Promise<KernelContext> {
  if (!ELIGIBLE_AGENTS.has(agentId)) return context;

  const insights = row(context.metadata?.agentInsights);
  const insight = row(insights[agentId]);
  const interventions = interventionRows(insight.interventions);
  const systemicMechanism = stringValue(insight.systemicMechanism);
  const rivalCauses = strings(insight.rivalCauses, 10);
  const actorId = stringValue(context.metadata?.actorId);
  const material = materialEvidenceView(context);
  const materialIds = new Set(material.map((item) => item.id));
  const contradictionRequiresRivals = context.contradictions.length > 0;

  const baseStatus = {
    agentId,
    candidatesReceived: interventions.length,
    systemicMechanismPresent: Boolean(systemicMechanism),
    rivalCauses: rivalCauses.length,
    materialEvidenceResolved: material.length,
    authorityBoundary: 'PROPOSAL_ONLY_NO_EXECUTION_NO_CANONICAL_PROMOTION',
  };

  if (!interventions.length || !systemicMechanism || !actorId || material.length === 0 || (contradictionRequiresRivals && rivalCauses.length < 2)) {
    context.metadata = {
      ...context.metadata,
      governedProposalEmitter: {
        ...baseStatus,
        persisted: [],
        skipped: true,
        reason: !interventions.length
          ? 'NO_STRUCTURED_INTERVENTION'
          : !systemicMechanism
            ? 'SYSTEMIC_MECHANISM_REQUIRED'
            : !actorId
              ? 'GOVERNED_ACTOR_REQUIRED'
              : material.length === 0
                ? 'MATERIAL_EVIDENCE_REQUIRED'
                : 'RIVAL_CAUSES_REQUIRED_FOR_CONTRADICTION',
      },
    };
    return context;
  }

  const existing = await latestActionProposals(['COGNITIVE_INTERVENTION_CANDIDATE'], 100);
  const knownKeys = existingProposalKeys(existing.data);
  const persisted: Array<{ proposalKey: string; proposalId: string | null; title: string }> = [];
  const rejected: Array<{ title: string | null; reason: string }> = [];

  for (const candidate of interventions) {
    const title = stringValue(candidate.title);
    const rationale = stringValue(candidate.rationale);
    const hardRules = strings(candidate.hardRules, 10);
    const exceptions = strings(candidate.exceptions, 10);
    const returnContract = strings(candidate.returnContract, 12);
    const falsificationConditions = strings(candidate.falsificationConditions, 10);
    const suppliedEvidenceRefs = strings(candidate.evidenceRefs, 20).filter((ref) => materialIds.has(ref));
    const evidenceRefs = suppliedEvidenceRefs.length ? suppliedEvidenceRefs : material.map((item) => item.id).slice(0, 20);

    if (!title || !rationale || hardRules.length === 0 || returnContract.length === 0 || falsificationConditions.length === 0) {
      rejected.push({
        title,
        reason: 'COGNITIVE_INTERVENTION_INCOMPLETE: title+rationale+hardRules+returnContract+falsificationConditions required',
      });
      continue;
    }

    const proposalKey = sha256({
      proposalType: 'COGNITIVE_INTERVENTION_CANDIDATE',
      cycleId: context.cycleId,
      agentId,
      systemicMechanism,
      title,
      hardRules,
      exceptions,
      returnContract,
      falsificationConditions,
      evidenceRefs,
    });
    if (knownKeys.has(proposalKey)) {
      rejected.push({ title, reason: 'DUPLICATE_GOVERNED_PROPOSAL_REUSED' });
      continue;
    }

    const created = await createActionProposal({
      proposalType: 'COGNITIVE_INTERVENTION_CANDIDATE',
      actorId,
      title,
      objective: rationale,
      status: 'proposed',
      payload: {
        contract: 'SFI-COGNITIVE-INTERVENTION-CANDIDATE-1.0',
        proposalKey,
        epistemicClass: 'INFERENCE',
        cycleId: context.cycleId,
        logbookId: context.logbookId,
        executionId: context.metadata?.executionId ?? null,
        originatingAgent: agentId,
        systemicMechanism,
        rivalCauses,
        intervention: {
          title,
          rationale,
          hardRules,
          exceptions,
          returnContract,
          falsificationConditions,
        },
        evidenceRefs,
        authorityBoundary: 'PROPOSAL_REQUIRES_ROOT_GOVERNANCE; THIS_EMITTER_DOES_NOT_EXECUTE_INTERVENTION_OR_RECORD_RETURN',
      },
    });

    if (!created.ok) {
      rejected.push({ title, reason: `${created.error}:${'details' in created ? created.details ?? '' : ''}` });
      continue;
    }
    const createdRow = recordValue(created.data);
    const proposalId = stringValue(createdRow.id);
    persisted.push({ proposalKey, proposalId, title });
    knownKeys.add(proposalKey);
  }

  context.metadata = {
    ...context.metadata,
    governedProposalEmitter: {
      ...baseStatus,
      persisted,
      rejected,
      skipped: false,
      proposalType: 'COGNITIVE_INTERVENTION_CANDIDATE',
      persistedCount: persisted.length,
      rule: 'Only structurally complete, evidence-linked and falsifiable interventions become governed proposals. Proposal persistence never grants execution authority.',
    },
  };
  return context;
}

import 'server-only';
import { SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT, SFI_SYSTEM_AI_ENTITY_TYPES } from '@/core/case-platform';
import { readOperationalCase } from './repository';
import { listCaseActionProposals } from './actionRepository';
import { listOperationalSystemAiRelations } from './systemAiRepository';

function payloadEntityType(payload: Record<string, unknown>) {
  return typeof payload.entityType === 'string' ? payload.entityType : '';
}
function belongsToSystemAiDomain(payload: Record<string, unknown>) {
  return payload.contract === SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT || Boolean(payloadEntityType(payload));
}
function isSystemAiAssessment(payload: Record<string, unknown>) {
  if (payload.contract !== SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT) return false;
  return typeof payload.assessmentType === 'string' && [
    'SYSTEM_FRICTION',
    'AI_IMPLEMENTATION_FAILURE',
    'AI_ADOPTION_OPPORTUNITY',
    'AI_GOVERNANCE_TRACE',
  ].includes(payload.assessmentType);
}

export async function buildSystemAiObservatoryReadModel(caseId: string, userId: string) {
  const envelope = await readOperationalCase(caseId, userId);
  const relations = await listOperationalSystemAiRelations(caseId, userId);
  const actions = await listCaseActionProposals(caseId, userId);
  const allowed = new Set<string>(SFI_SYSTEM_AI_ENTITY_TYPES);
  const domainObjects = envelope.objects.filter((object) => belongsToSystemAiDomain(object.payload));
  const nodes = domainObjects
    .filter((object) => allowed.has(payloadEntityType(object.payload)))
    .map((object) => ({
      ref: object.canonicalRef,
      entityType: payloadEntityType(object.payload),
      label: typeof object.payload.label === 'string' ? object.payload.label : null,
      observedAt: object.observedAt,
    }));
  const frictions = domainObjects.filter((object) => object.kind === 'FRICTION' && isSystemAiAssessment(object.payload));
  const assessments = domainObjects.filter((object) => (object.kind === 'EPISTEMIC_ASSESSMENT' || object.kind === 'ANALYSIS') && isSystemAiAssessment(object.payload));
  const failures = domainObjects.filter((object) => payloadEntityType(object.payload) === 'FAILURE_EVENT');
  const executions = domainObjects.filter((object) => payloadEntityType(object.payload) === 'AI_EXECUTION');
  const entityCounts = Object.fromEntries(SFI_SYSTEM_AI_ENTITY_TYPES.map((type) => [type, nodes.filter((node) => node.entityType === type).length]));
  const relationCounts = Object.fromEntries(Array.from(new Set(relations.map((relation) => relation.relationType))).sort().map((type) => [type, relations.filter((relation) => relation.relationType === type).length]));
  return {
    contract: 'SFI-SYSTEM-AI-OBSERVATORY-READ-MODEL-1.0',
    caseRecord: envelope.caseRecord,
    readiness: envelope.readiness,
    nodes,
    relations,
    frictions,
    assessments,
    failures,
    executions,
    actions,
    counts: {
      entities: nodes.length,
      relations: relations.length,
      frictions: frictions.length,
      assessments: assessments.length,
      failures: failures.length,
      executions: executions.length,
      openActions: actions.filter((action) => !['REJECTED', 'CANCELLED', 'RETURN_RECORDED'].includes(action.status)).length,
      entityCounts,
      relationCounts,
    },
    visualLayout: null,
    ranking: null,
    truthAuthority: false,
  };
}

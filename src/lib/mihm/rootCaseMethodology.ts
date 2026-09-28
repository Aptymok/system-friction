import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';
import type { MihmEvidenceModality, MihmMethodSelectionInput, MihmMethodSelectionResult, MihmObservationSubject, MihmTemporalScope } from './methodSelectionContract';
import { resolveMihmMethod } from './methodSelectionResolver';

function text(row: RootRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function numberValue(row: RootRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || value === '') continue;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function explicitEvidenceCount(row: RootRow) {
  const declared = numberValue(row, ['evidence_count', 'evidenceCount']);
  if (declared !== null) return Math.max(0, declared);
  const refs = [row.evidence_refs, row.evidence_ids, row.source_evidence_ids, row.lineage];
  return Math.max(0, ...refs.map((value) => Array.isArray(value) ? value.filter(Boolean).length : 0));
}

function evidenceModalities(row: RootRow, evidenceCount: number): MihmEvidenceModality[] {
  if (evidenceCount <= 0) return [];
  const joined = [
    text(row, ['evidence_source', 'evidence_type', 'modality', 'channel', 'source']),
    text(row, ['evidence_summary', 'evidence_description']),
  ].filter(Boolean).join(' ').toLowerCase();
  const result = new Set<MihmEvidenceModality>();
  if (/audio|wav|mp3|sound/.test(joined)) result.add('AUDIO');
  if (/video|mp4|clip/.test(joined)) result.add('VIDEO');
  if (/image|imagen|png|jpg|visual/.test(joined)) result.add('IMAGE');
  if (/software|app|repository|repo|code|código/.test(joined)) result.add('SOFTWARE');
  if (/dataset|datos|database|csv|xlsx/.test(joined)) result.add('DATASET');
  if (/interview|entrevista/.test(joined)) result.add('INTERVIEW');
  if (/field|campo/.test(joined)) result.add('FIELD');
  if (/paper|artículo|article/.test(joined)) result.add('PAPER');
  if (/conversation|conversación|mensaje|email|correo/.test(joined)) result.add('CONVERSATION');
  if (/telemetry|telemetría/.test(joined)) result.add('TELEMETRY');
  if (/record|registro|contract|contrato|document|documento/.test(joined)) result.add('INSTITUTIONAL_RECORD');
  if (result.size === 0) result.add('UNKNOWN');
  return [...result];
}

function observedQuestionSignals(row: RootRow) {
  const joined = [
    text(row, ['question', 'research_question', 'observation_question', 'objective']),
    text(row, ['evidence_summary', 'evidence_description']),
    text(row, ['title', 'name', 'label']),
  ].filter(Boolean).join(' ').toLowerCase();

  return {
    trajectory: /trajectory|trayectoria|transition|transición|change|cambio|evolution|evolución|recurrence|recurrencia|cycle|ciclo|rhythm|ritmo|phase|fase/.test(joined),
    rival: /rival|alternative hypothesis|hipótesis alternativa|counterhypothesis|contrahipótesis|discriminate|distinguir/.test(joined),
    intervention: /intervention|intervención|perturbation|perturbación|action|acción|experiment|experimento/.test(joined),
    worldContext: /world context|contexto mundial|external context|contexto externo|worldspect|world vector/.test(joined),
  };
}

function observedFieldSignals(row: RootRow) {
  const relationState = text(row, ['relation_state', 'relationState', 'edge_state', 'edgeState'])?.toUpperCase() ?? '';
  const previousRelationState = text(row, ['previous_relation_state', 'previousRelationState', 'prior_relation_state', 'priorRelationState'])?.toUpperCase() ?? '';
  const epistemicState = text(row, ['epistemic_state', 'epistemicState', 'epistemic_class', 'epistemicClass', 'state'])?.toUpperCase() ?? '';
  const previousEpistemicState = text(row, ['previous_epistemic_state', 'previousEpistemicState', 'prior_epistemic_state', 'priorEpistemicState'])?.toUpperCase() ?? '';
  const observedReturn = row.observed_return ?? row.observedReturn;
  const expectedReturn = row.expected_return ?? row.expectedReturn;
  const counterevidence = row.counterevidence ?? row.counter_evidence ?? row.counterEvidence;
  const cycle = numberValue(row, ['cycle', 'cycle_index', 'cycleIndex', 'cycle_number', 'cycleNumber', 'recurrence', 'recurrence_index', 'recurrenceIndex']);
  const sequence = numberValue(row, ['sequence', 'sequence_index', 'sequenceIndex', 'transition_index', 'transitionIndex', 'event_index', 'eventIndex', 'order']);
  const phase = text(row, ['phase', 'temporal_phase', 'temporalPhase', 'cycle_phase', 'cyclePhase', 'state_phase', 'statePhase']);

  return {
    temporalStructure: cycle !== null || sequence !== null || Boolean(phase),
    relationTransition: Boolean(relationState && previousRelationState && relationState !== previousRelationState),
    epistemicTransition: Boolean(epistemicState && previousEpistemicState && epistemicState !== previousEpistemicState),
    returnContrast: observedReturn !== undefined && observedReturn !== null && expectedReturn !== undefined && expectedReturn !== null,
    counterevidence: Array.isArray(counterevidence) ? counterevidence.length > 0 : Boolean(counterevidence),
  };
}

function subjectFor(row: RootRow): MihmObservationSubject {
  const explicit = [
    text(row, ['type', 'entity_type', 'subject_type', 'kind']),
    text(row, ['title', 'name', 'company', 'entity_name']),
    text(row, ['proposal_type', 'event_name', 'action', 'source']),
  ].filter(Boolean).join(' ').toLowerCase();

  const institutionalSignal = /(cognitive[_ .-]?twin|mutation[._ -]?proposed|sfi[_ .-]?live[_ .-]?proof|system friction institute|institutional|governance|root[._ -]|runtime|agentic|agent[._ -])/i.test(explicit);
  const externalOrganizationSignal = /(organization|organización|company|empresa|client|cliente)/i.test(explicit);
  if (institutionalSignal && !externalOrganizationSignal) return 'SFI_SYSTEM';
  if (/sfi|system friction institute/.test(explicit) && /internal|institutional|operational|runtime/.test(explicit)) return 'SFI_SYSTEM';
  if (/person|persona|session|sesión|patient|paciente/.test(explicit)) return 'PERSON';
  if (/world|mundo|global|geopolit/.test(explicit)) return 'WORLD_CONTEXT';
  if (/artifact|artefacto|object|objeto|signal|señal|audio|image|software/.test(explicit)) return 'ARTIFACT';
  if (externalOrganizationSignal) return 'ORGANIZATION';
  if (/phenomenon|fenómeno/.test(explicit)) return 'PHENOMENON';
  return 'CASE';
}

function temporalScopeFor(row: RootRow, subject: MihmObservationSubject): MihmTemporalScope {
  if (subject === 'WORLD_CONTEXT') return 'CURRENT_WORLD_STATE';
  if (subject === 'PERSON') return text(row, ['session_id', 'sessionId']) ? 'SESSION' : 'POINT_IN_TIME';

  const span = numberValue(row, ['observation_span_days', 'span_days', 'age_days']);
  const status = text(row, ['status', 'stage', 'state'])?.toLowerCase() ?? '';
  const cycle = numberValue(row, ['cycle', 'cycle_index', 'cycleIndex', 'cycle_number', 'cycleNumber', 'recurrence', 'recurrence_index', 'recurrenceIndex']);
  const sequence = numberValue(row, ['sequence', 'sequence_index', 'sequenceIndex', 'transition_index', 'transitionIndex', 'event_index', 'eventIndex', 'order']);
  const phase = text(row, ['phase', 'temporal_phase', 'temporalPhase', 'cycle_phase', 'cyclePhase', 'state_phase', 'statePhase']);
  const temporalEvidence = cycle !== null || sequence !== null || Boolean(phase);

  if (temporalEvidence || (span ?? 0) > 1 || /open|active|follow|monitor|pending|abierto|seguimiento/.test(status)) return 'LONGITUDINAL';
  return 'BOUNDED_WINDOW';
}

export type CanonicalFieldMethodSignal = {
  nodeId: string;
  relationCount: number;
  evidenceBoundRelationCount: number;
  relationTransition: boolean;
  weightChangeObserved: boolean;
  counterevidenceObserved: boolean;
  temporalStructureObserved: boolean;
  requiresTrajectory: boolean;
  requiresRivalHypothesis: boolean;
  expectationObserved: boolean;
  returnObserved: boolean;
  discriminatingObservationObserved: boolean;
  stoppingConditionObserved: boolean;
  contrastReady: boolean;
  contrastRecorded: boolean;
  learningCandidateObserved: boolean;
  learningPromoted: boolean;
  fieldReorganizationState: 'UNCHANGED' | 'CONTRAST_RECORDED' | 'LEARNING_QUARANTINED' | 'LEARNING_PROMOTED';
};

function graphText(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function graphNumber(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined || value === '') continue;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Reads only properties already present in the canonical field.
 * It does not infer causality, invent prior states, or promote repeated edges to attractors/regimes.
 */
export function deriveCanonicalFieldMethodSignal(
  node: CanonicalGraphNode,
  edges: CanonicalGraphEdge[],
): CanonicalFieldMethodSignal {
  const adjacent = edges.filter((edge) => edge.sourceNodeId === node.nodeId || edge.targetNodeId === node.nodeId);
  let relationTransition = false;
  let weightChangeObserved = false;
  let counterevidenceObserved = false;
  let temporalStructureObserved = false;
  let expectationObserved = false;
  let returnObserved = false;
  let discriminatingObservationObserved = false;
  let stoppingConditionObserved = false;
  let contrastRecorded = false;
  let learningCandidateObserved = false;
  let learningPromoted = false;
  let evidenceBoundRelationCount = 0;

  for (const edge of adjacent) {
    const attributes = edge.attributes ?? {};
    const state = graphText(attributes, ['relationState','relation_state','edgeState','edge_state'])?.toUpperCase() ?? '';
    const previousState = graphText(attributes, ['previousRelationState','previous_relation_state','priorRelationState','prior_relation_state'])?.toUpperCase() ?? '';
    const previousWeight = graphNumber(attributes, ['previousWeight','previous_weight','priorWeight','prior_weight']);
    const sequence = graphNumber(attributes, ['sequence','sequenceIndex','sequence_index','transitionIndex','transition_index','eventIndex','event_index','order']);
    const cycle = graphNumber(attributes, ['cycle','cycleIndex','cycle_index','cycleNumber','cycle_number','recurrence','recurrenceIndex','recurrence_index']);
    const phase = graphText(attributes, ['phase','temporalPhase','temporal_phase','cyclePhase','cycle_phase','statePhase','state_phase']);
    const counterevidence = attributes.counterevidence ?? attributes.counterEvidence ?? attributes.counter_evidence;
    const expected = attributes.expectedReturn ?? attributes.expected_return ?? attributes.expectedCondition ?? attributes.expected_condition ?? attributes.prediction;
    const observed = attributes.observedReturn ?? attributes.observed_return ?? attributes.actualOutcome ?? attributes.actual_outcome;
    const discriminator = attributes.discriminatingObservation ?? attributes.discriminating_observation ?? attributes.discriminatingObservations ?? attributes.discriminating_observations;
    const stopping = attributes.stoppingCondition ?? attributes.stopping_condition;
    const eventName = graphText(attributes, ['eventName','event_name','eventType','event_type'])?.toUpperCase() ?? '';
    const calibrationStatus = graphText(attributes, ['calibrationStatus','calibration_status'])?.toUpperCase() ?? '';
    const assessmentClass = graphText(attributes, ['assessmentClass','assessment_class','epistemicAssessment','epistemic_assessment'])?.toUpperCase() ?? '';

    if (edge.lineage.length > 0 || edge.provenance) evidenceBoundRelationCount += 1;
    if (eventName === 'SFI_UNIVERSAL_RETURN_CONTRASTED' && calibrationStatus === 'CONTRAST_RECORDED') contrastRecorded = true;
    if (eventName === 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED') learningCandidateObserved = true;
    if (eventName === 'SFI_UNIVERSAL_LEARNING_PROMOTED' && assessmentClass === 'VERIFIED_CONTRAST') learningPromoted = true;
    if (expected !== undefined && expected !== null && expected !== '') expectationObserved = true;
    if (observed !== undefined && observed !== null && observed !== '') returnObserved = true;
    if (Array.isArray(discriminator) ? discriminator.length > 0 : Boolean(discriminator)) discriminatingObservationObserved = true;
    if (Boolean(stopping)) stoppingConditionObserved = true;
    if (state && previousState && state !== previousState) relationTransition = true;
    if (previousWeight !== null && Number.isFinite(edge.weight) && previousWeight !== edge.weight) weightChangeObserved = true;
    if (Array.isArray(counterevidence) ? counterevidence.length > 0 : Boolean(counterevidence)) counterevidenceObserved = true;
    if (sequence !== null || cycle !== null || Boolean(phase)) temporalStructureObserved = true;
  }

  const nodeAttributes = node.attributes ?? {};
  const nodeSequence = graphNumber(nodeAttributes, ['sequence','sequenceIndex','sequence_index','transitionIndex','transition_index','eventIndex','event_index','order']);
  const nodeCycle = graphNumber(nodeAttributes, ['cycle','cycleIndex','cycle_index','cycleNumber','cycle_number','recurrence','recurrenceIndex','recurrence_index']);
  const nodePhase = graphText(nodeAttributes, ['phase','temporalPhase','temporal_phase','cyclePhase','cycle_phase','statePhase','state_phase']);
  const nodeExpected = nodeAttributes.expectedReturn ?? nodeAttributes.expected_return ?? nodeAttributes.expectedCondition ?? nodeAttributes.expected_condition ?? nodeAttributes.prediction;
  const nodeObserved = nodeAttributes.observedReturn ?? nodeAttributes.observed_return ?? nodeAttributes.actualOutcome ?? nodeAttributes.actual_outcome;
  const nodeDiscriminator = nodeAttributes.discriminatingObservation ?? nodeAttributes.discriminating_observation ?? nodeAttributes.discriminatingObservations ?? nodeAttributes.discriminating_observations;
  const nodeStopping = nodeAttributes.stoppingCondition ?? nodeAttributes.stopping_condition;
  const nodeEventName = graphText(nodeAttributes, ['eventName','event_name','eventType','event_type'])?.toUpperCase() ?? '';
  const nodeCalibrationStatus = graphText(nodeAttributes, ['calibrationStatus','calibration_status'])?.toUpperCase() ?? '';
  const nodeAssessmentClass = graphText(nodeAttributes, ['assessmentClass','assessment_class','epistemicAssessment','epistemic_assessment'])?.toUpperCase() ?? '';
  if (nodeEventName === 'SFI_UNIVERSAL_RETURN_CONTRASTED' && nodeCalibrationStatus === 'CONTRAST_RECORDED') contrastRecorded = true;
  if (nodeEventName === 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED') learningCandidateObserved = true;
  if (nodeEventName === 'SFI_UNIVERSAL_LEARNING_PROMOTED' && nodeAssessmentClass === 'VERIFIED_CONTRAST') learningPromoted = true;
  temporalStructureObserved ||= nodeSequence !== null || nodeCycle !== null || Boolean(nodePhase);
  expectationObserved ||= nodeExpected !== undefined && nodeExpected !== null && nodeExpected !== '';
  returnObserved ||= nodeObserved !== undefined && nodeObserved !== null && nodeObserved !== '';
  discriminatingObservationObserved ||= Array.isArray(nodeDiscriminator) ? nodeDiscriminator.length > 0 : Boolean(nodeDiscriminator);
  stoppingConditionObserved ||= Boolean(nodeStopping);

  return {
    nodeId: node.nodeId,
    relationCount: adjacent.length,
    evidenceBoundRelationCount,
    relationTransition,
    weightChangeObserved,
    counterevidenceObserved,
    temporalStructureObserved,
    requiresTrajectory: temporalStructureObserved || relationTransition || weightChangeObserved,
    requiresRivalHypothesis: counterevidenceObserved,
    expectationObserved,
    returnObserved,
    discriminatingObservationObserved,
    stoppingConditionObserved,
    contrastReady: expectationObserved && returnObserved && discriminatingObservationObserved,
    contrastRecorded,
    learningCandidateObserved,
    learningPromoted,
    fieldReorganizationState: learningPromoted
      ? 'LEARNING_PROMOTED'
      : learningCandidateObserved
        ? 'LEARNING_QUARANTINED'
        : contrastRecorded
          ? 'CONTRAST_RECORDED'
          : 'UNCHANGED',
  };
}

export type RootCaseMethodology = {
  caseId: string;
  title: string;
  input: MihmMethodSelectionInput;
  resolution: MihmMethodSelectionResult;
  nextAction: 'LINK_EXISTING_PPOI' | 'CREATE_PPOI' | 'RUN_PRIMARY_METHOD' | 'RESOLVE_BLOCKERS';
};

export function resolveRootCaseMethodology(row: RootRow, index = 0): RootCaseMethodology {
  const caseId = text(row, ['id', 'case_id', 'opportunity_id', 'proposal_id']) ?? `root-case-${index + 1}`;
  const title = text(row, ['title', 'name', 'company', 'entity_name', 'label']) ?? `Caso ${index + 1}`;
  const subject = subjectFor(row);
  const temporalScope = temporalScopeFor(row, subject);
  const phenomenonId = text(row, ['phenomenon_id', 'ppoi_phenomenon_id']);
  const evidenceCount = explicitEvidenceCount(row);
  const questionSignals = observedQuestionSignals(row);
  const fieldSignals = observedFieldSignals(row);
  const input: MihmMethodSelectionInput = {
    subject,
    temporalScope,
    evidenceModalities: evidenceModalities(row, evidenceCount),
    subjectId: text(row, ['subject_id', 'object_id', 'entity_id', 'client_id']) ?? caseId,
    ownerId: text(row, ['owner_id', 'created_by']),
    caseId,
    phenomenonId,
    sessionId: text(row, ['session_id', 'moph_session_id']),
    worldContextRequested: subject === 'ORGANIZATION' || subject === 'CASE' || Boolean(row.world_context_requested) || questionSignals.worldContext,
    requiresTrajectory: temporalScope === 'LONGITUDINAL' || questionSignals.trajectory || fieldSignals.temporalStructure || fieldSignals.relationTransition || fieldSignals.epistemicTransition,
    requiresRivalHypothesis: Boolean(row.requires_rival_hypothesis) || questionSignals.rival || fieldSignals.returnContrast || fieldSignals.counterevidence,
    requiresInterventionTracking: Boolean(row.requires_intervention_tracking) || questionSignals.intervention || /proposal|intervention|seguimiento/i.test(String(row.stage ?? row.status ?? '')),
    evidenceCount,
    observationSpanDays: numberValue(row, ['observation_span_days', 'span_days']) ?? 0,
    isSfiInternal: subject === 'SFI_SYSTEM',
  };
  const resolution = resolveMihmMethod(input);
  const nextAction = resolution.blockers.length
    ? 'RESOLVE_BLOCKERS'
    : resolution.primary?.methodId === 'PPOI'
      ? phenomenonId ? 'LINK_EXISTING_PPOI' : 'CREATE_PPOI'
      : 'RUN_PRIMARY_METHOD';
  return { caseId, title, input, resolution, nextAction };
}

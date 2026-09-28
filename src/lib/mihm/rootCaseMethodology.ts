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
  observedWeightDelta: number | null;
  relationSupportRatio: number | null;
  provenanceCoverage: number | null;
  reorganizationMagnitude: number;
  projectionAuthority: 'NONE' | 'VISUAL_HEURISTIC_ONLY' | 'METHOD_LAB_REQUIRED';
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
  let observedWeightDeltaTotal = 0;
  let observedWeightDeltaCount = 0;
  let supportedRelationCount = 0;
  let challengedRelationCount = 0;

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
    if (/SUPPORTED|VERIFIED|CORROBORATED/.test(state)) supportedRelationCount += 1;
    if (/CHALLENGED|CONTRADICTED|REJECTED|UNRESOLVED/.test(state)) challengedRelationCount += 1;
    if (previousWeight !== null && Number.isFinite(edge.weight) && previousWeight !== edge.weight) {
      weightChangeObserved = true;
      observedWeightDeltaTotal += Math.abs(edge.weight - previousWeight);
      observedWeightDeltaCount += 1;
    }
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

  const observedWeightDelta = observedWeightDeltaCount > 0
    ? observedWeightDeltaTotal / observedWeightDeltaCount
    : null;
  const classifiedRelations = supportedRelationCount + challengedRelationCount;
  const relationSupportRatio = classifiedRelations > 0 ? supportedRelationCount / classifiedRelations : null;
  const provenanceCoverage = adjacent.length > 0 ? evidenceBoundRelationCount / adjacent.length : null;
  const governanceBase = learningPromoted ? 1 : learningCandidateObserved ? 0.55 : contrastRecorded ? 0.35 : 0;
  const relationalEvidence = observedWeightDelta ?? 0;
  const provenanceFactor = provenanceCoverage ?? 0;
  // Bounded visualization magnitude: evidence can modulate a governed state, never create one.
  const reorganizationMagnitude = governanceBase === 0
    ? 0
    : Math.min(1, governanceBase * (0.7 + 0.2 * relationalEvidence + 0.1 * provenanceFactor));

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
    observedWeightDelta,
    relationSupportRatio,
    provenanceCoverage,
    reorganizationMagnitude,
    projectionAuthority: governanceBase === 0
      ? 'NONE'
      : observedWeightDelta !== null || relationSupportRatio !== null || provenanceCoverage !== null
        ? 'METHOD_LAB_REQUIRED'
        : 'VISUAL_HEURISTIC_ONLY',
  };
}

export type CanonicalUnknownResolutionPlan = {
  status: 'NOT_REQUIRED' | 'ACTIVE' | 'CENSORED';
  target: 'SUBJECT_IDENTITY';
  temporalBasis: Array<'SEQUENCE' | 'CYCLE' | 'RECURRENCE' | 'PHASE' | 'STATE_OCCUPANCY' | 'CHRONOLOGY' | 'UNKNOWN'>;
  knownWithoutIdentity: string[];
  missing: string[];
  discriminatingObservations: string[];
  sourceStrategy: string[];
  stoppingCondition: string;
  noCalendarTimeoutInvented: true;
  evidenceDisposition: 'NOT_EVALUATED' | 'NO_DISCRIMINATING_EVIDENCE' | 'CANDIDATE_SUPPORTED' | 'RIVAL_REQUIRED' | 'RESOLVED';
  supportedIdentity: MihmObservationSubject | null;
  supportReasons: string[];
  nextObservation: {
    objective: 'IDENTITY_DISCRIMINATION';
    temporalBasis: CanonicalUnknownResolutionPlan['temporalBasis'];
    opportunity: string;
    completionCondition: string;
    calendarWaitRequired: false;
  } | null;
};

export function planCanonicalUnknownResolution(
  node: CanonicalGraphNode,
  edges: CanonicalGraphEdge[],
  methodology: CanonicalFieldMethodResolution,
  signal = deriveCanonicalFieldMethodSignal(node, edges),
): CanonicalUnknownResolutionPlan {
  if (methodology.input.subject !== 'UNKNOWN') {
    return { status: 'NOT_REQUIRED', target: 'SUBJECT_IDENTITY', temporalBasis: [], knownWithoutIdentity: [], missing: [], discriminatingObservations: [], sourceStrategy: [], stoppingCondition: 'Subject identity is already declared.', noCalendarTimeoutInvented: true, evidenceDisposition: 'RESOLVED', supportedIdentity: methodology.input.subject, supportReasons: ['SUBJECT_IDENTITY_DECLARED'], nextObservation: null };
  }
  const attrs = node.attributes ?? {};
  const bases = new Set<CanonicalUnknownResolutionPlan['temporalBasis'][number]>();
  if (graphNumber(attrs, ['sequence','sequenceIndex','sequence_index','transitionIndex','transition_index','eventIndex','event_index','order']) !== null) bases.add('SEQUENCE');
  if (graphNumber(attrs, ['cycle','cycleIndex','cycle_index','cycleNumber','cycle_number']) !== null) bases.add('CYCLE');
  if (graphNumber(attrs, ['recurrence','recurrenceIndex','recurrence_index','recurrenceCount','recurrence_count']) !== null
    || graphText(attrs, ['recurrencePattern','recurrence_pattern','recurrenceInterval','recurrence_interval'])) bases.add('RECURRENCE');
  if (graphText(attrs, ['phase','temporalPhase','temporal_phase','cyclePhase','cycle_phase','statePhase','state_phase'])) bases.add('PHASE');
  if (graphNumber(attrs, ['timeInState','time_in_state','sojourn','sojournDuration','sojourn_duration','stateDuration','state_duration']) !== null) bases.add('STATE_OCCUPANCY');
  // Record creation/update time is provenance about the graph record, not automatically
  // chronology of the observed world. Only explicit observed-world temporal coordinates qualify.
  if (graphText(attrs, ['observedAt','observed_at','occurredAt','occurred_at','effectiveAt','effective_at','releasedAt','released_at','validFrom','valid_from','validTo','valid_to'])) bases.add('CHRONOLOGY');
  if (!bases.size) bases.add('UNKNOWN');

  const knownWithoutIdentity = [
    signal.temporalStructureObserved ? 'TEMPORAL_STRUCTURE_OBSERVED' : null,
    signal.relationTransition ? 'RELATION_TRANSITION_OBSERVED' : null,
    signal.weightChangeObserved ? 'RELATION_WEIGHT_CHANGE_OBSERVED' : null,
    signal.counterevidenceObserved ? 'COUNTEREVIDENCE_OBSERVED' : null,
    signal.evidenceBoundRelationCount > 0 ? 'PROVENANCE_BOUND_RELATIONS_PRESENT' : null,
  ].filter((value): value is string => Boolean(value));

  const censored = signal.evidenceBoundRelationCount === 0 && signal.relationCount === 0 && !signal.temporalStructureObserved;
  return {
    status: censored ? 'CENSORED' : 'ACTIVE',
    target: 'SUBJECT_IDENTITY',
    temporalBasis: [...bases],
    knownWithoutIdentity,
    missing: ['CLAIM_SCOPED_PRIMARY_SOURCE_OR_DIRECT_OBSERVATION', 'IDENTITY_DISCRIMINATOR', 'RIVAL_IDENTITY_OR_EXCLUSION_CRITERIA'],
    discriminatingObservations: [
      methodology.subjectProposal ? `Seek an observation that distinguishes proposed ${methodology.subjectProposal} from at least one rival identity.` : 'Acquire an observation capable of supporting at least one bounded identity candidate.',
      'Preserve temporal basis and provenance while testing identity; do not convert recurrence into identity.',
      'If public information is relevant, retrieve claim-scoped primary authority before secondary/social corroboration.',
    ],
    sourceStrategy: ['PRIMARY_AUTHORITY_OR_DIRECT_SOURCE', 'PRIMARY_PARTY_FOR_SELF_REPORTED_CLAIMS', 'SECONDARY_FOR_CORROBORATION', 'SOCIAL_ONLY_AS_SIGNAL_UNLESS_THE_PUBLICATION_ITSELF_IS_THE_CLAIM'],
    stoppingCondition: censored
      ? 'Current instrumentation contains no discriminating observation opportunity; mark censored until a new source, relation, event, cycle, or measurement becomes observable.'
      : 'Stop the current pass when identity is discriminated by evidence or when all currently observable discriminators are exhausted; do not substitute elapsed calendar time for an observation opportunity.',
    noCalendarTimeoutInvented: true,
    evidenceDisposition: 'NOT_EVALUATED',
    supportedIdentity: null,
    supportReasons: [],
    nextObservation: {
      objective: 'IDENTITY_DISCRIMINATION',
      temporalBasis: [...bases],
      opportunity: bases.has('RECURRENCE')
        ? 'Observe the next comparable recurrence and capture the identity discriminator under the same declared observation conditions.'
        : bases.has('STATE_OCCUPANCY')
          ? 'Observe the next state transition or completed sojourn that can discriminate the candidate identity.'
          : bases.has('CYCLE')
            ? 'Observe the next comparable cycle boundary or transition; do not translate the cycle into calendar duration.'
            : bases.has('PHASE')
              ? 'Observe the next comparable phase transition with provenance preserved.'
              : bases.has('SEQUENCE')
                ? 'Observe the next discriminating event in sequence order.'
                : bases.has('CHRONOLOGY')
                  ? 'Observe the next claim-relevant world event within the declared validity/observation window.'
                  : 'Acquire a new source, relation, event, measurement, or direct observation that creates a discrimination opportunity.',
      completionCondition: 'Complete when the observation supports one bounded identity candidate and discriminates at least one explicit rival, or when the declared opportunity becomes censored.',
      calendarWaitRequired: false,
    },
  };
}

export type UnknownIdentityEvidenceObservation = {
  sourceId: string;
  authorityFit: 'FIT' | 'NO_FIT' | 'REVIEW_REQUIRED' | 'UNKNOWN';
  admission: 'SOURCE_ONLY' | 'CANDIDATE_EVIDENCE' | 'CORROBORATION_REQUIRED' | 'UNKNOWN';
  supports: MihmObservationSubject[];
  challenges: MihmObservationSubject[];
  directObservation?: boolean;
  provenanceBound?: boolean;
};

export function contrastUnknownIdentityEvidence(
  plan: CanonicalUnknownResolutionPlan,
  observations: UnknownIdentityEvidenceObservation[],
): CanonicalUnknownResolutionPlan {
  if (plan.status === 'NOT_REQUIRED') return plan;
  const admissible = observations.filter((item) =>
    item.provenanceBound !== false
    && (item.directObservation === true || item.authorityFit === 'FIT')
    && item.admission !== 'SOURCE_ONLY'
  );
  if (!admissible.length) {
    return { ...plan, evidenceDisposition: 'NO_DISCRIMINATING_EVIDENCE', supportedIdentity: null, supportReasons: ['NO_CLAIM_SCOPED_OR_DIRECT_DISCRIMINATING_EVIDENCE'] };
  }
  const candidates = new Map<MihmObservationSubject, { support: number; challenge: number; sources: Set<string> }>();
  for (const item of admissible) {
    for (const identity of item.supports) {
      const state = candidates.get(identity) ?? { support: 0, challenge: 0, sources: new Set<string>() };
      state.support += 1; state.sources.add(item.sourceId); candidates.set(identity, state);
    }
    for (const identity of item.challenges) {
      const state = candidates.get(identity) ?? { support: 0, challenge: 0, sources: new Set<string>() };
      state.challenge += 1; state.sources.add(item.sourceId); candidates.set(identity, state);
    }
  }
  const viable = [...candidates.entries()].filter(([, value]) => value.support > 0 && value.challenge === 0);
  if (viable.length !== 1) {
    return { ...plan, evidenceDisposition: 'RIVAL_REQUIRED', supportedIdentity: null, supportReasons: viable.length > 1 ? ['MULTIPLE_SUPPORTED_IDENTITIES_REMAIN'] : ['SUPPORTED_IDENTITY_NOT_ESTABLISHED'] };
  }
  const [identity, state] = viable[0];
  const rivalAddressed = [...candidates.entries()].some(([candidate, value]) => candidate !== identity && value.challenge > 0);
  if (!rivalAddressed) {
    return { ...plan, evidenceDisposition: 'CANDIDATE_SUPPORTED', supportedIdentity: identity, supportReasons: [`IDENTITY_SUPPORTED_BY_${state.sources.size}_ADMISSIBLE_SOURCE(S)`, 'RIVAL_NOT_YET_DISCRIMINATED'] };
  }
  return {
    ...plan,
    status: 'NOT_REQUIRED',
    evidenceDisposition: 'RESOLVED',
    supportedIdentity: identity,
    supportReasons: [`IDENTITY_SUPPORTED_BY_${state.sources.size}_ADMISSIBLE_SOURCE(S)`, 'AT_LEAST_ONE_RIVAL_CHALLENGED_BY_ADMISSIBLE_EVIDENCE'],
    stoppingCondition: 'Identity resolution reached for the current evidence boundary. Reopen if counterevidence, a new rival, or incompatible RETURN appears.',
    nextObservation: null,
  };
}

export type CanonicalFieldMethodResolution = {
  input: MihmMethodSelectionInput;
  resolution: MihmMethodSelectionResult;
  subjectBasis: 'DECLARED' | 'PROPOSED' | 'UNKNOWN';
  subjectProposal: MihmObservationSubject | null;
  subjectProposalReasons: string[];
};

function canonicalFieldEvidenceModalities(node: CanonicalGraphNode, adjacent: CanonicalGraphEdge[]): MihmEvidenceModality[] {
  const joined = [node.provenance, ...node.lineage, ...adjacent.flatMap((edge) => [edge.provenance, ...edge.lineage])]
    .filter(Boolean).join(' ').toLowerCase();
  const result = new Set<MihmEvidenceModality>();
  if (/audio|wav|mp3|sound/.test(joined)) result.add('AUDIO');
  if (/video|mp4|clip/.test(joined)) result.add('VIDEO');
  if (/image|png|jpg|jpeg|visual/.test(joined)) result.add('IMAGE');
  if (/software|repository|repo|code/.test(joined)) result.add('SOFTWARE');
  if (/dataset|csv|xlsx|database|data:/.test(joined)) result.add('DATASET');
  if (/telemetry/.test(joined)) result.add('TELEMETRY');
  if (/record|contract|document|evidence:/.test(joined)) result.add('INSTITUTIONAL_RECORD');
  return [...result];
}

export function resolveCanonicalFieldMethodology(
  node: CanonicalGraphNode,
  edges: CanonicalGraphEdge[],
  signal = deriveCanonicalFieldMethodSignal(node, edges),
): CanonicalFieldMethodResolution {
  const adjacent = edges.filter((edge) => edge.sourceNodeId === node.nodeId || edge.targetNodeId === node.nodeId);
  const attrs = node.attributes ?? {};
  const explicitSubject = graphText(attrs, ['subject','subjectType','subject_type'])?.toUpperCase();
  const declaredSubject: MihmObservationSubject | null =
    explicitSubject === 'WORLD_CONTEXT' ? 'WORLD_CONTEXT'
      : explicitSubject === 'SFI_SYSTEM' ? 'SFI_SYSTEM'
        : explicitSubject === 'ORGANIZATION' ? 'ORGANIZATION'
          : explicitSubject === 'PERSON' || explicitSubject === 'SESSION' ? 'PERSON'
            : explicitSubject === 'OBJECT' || explicitSubject === 'SIGNAL' || explicitSubject === 'ARTIFACT' ? 'ARTIFACT'
              : explicitSubject === 'CASE' ? 'CASE'
                : explicitSubject === 'PHENOMENON' ? 'PHENOMENON'
                  : null;
  const subjectProposal: MihmObservationSubject | null = declaredSubject
    ? null
    : signal.requiresTrajectory || signal.requiresRivalHypothesis
      ? 'CASE'
      : adjacent.length > 0 || node.lineage.length > 0 || Boolean(node.provenance)
        ? 'ARTIFACT'
        : null;
  const subject: MihmObservationSubject = declaredSubject ?? 'UNKNOWN';
  const temporalScope: MihmTemporalScope = signal.temporalStructureObserved || signal.requiresTrajectory
    ? 'LONGITUDINAL'
    : subject === 'WORLD_CONTEXT'
      ? 'CURRENT_WORLD_STATE'
      : subject === 'UNKNOWN'
        ? 'UNKNOWN'
        : 'BOUNDED_WINDOW';
  const evidenceModalities = canonicalFieldEvidenceModalities(node, adjacent);
  const input: MihmMethodSelectionInput = {
    subject,
    temporalScope,
    evidenceModalities,
    subjectId: node.nodeId,
    caseId: subject === 'CASE' ? node.nodeId : null,
    worldContextRequested: subject === 'WORLD_CONTEXT' || Boolean(attrs.worldContextRequested ?? attrs.world_context_requested),
    requiresTrajectory: signal.requiresTrajectory,
    requiresRivalHypothesis: signal.requiresRivalHypothesis,
    requiresInterventionTracking: Boolean(attrs.requiresInterventionTracking ?? attrs.requires_intervention_tracking),
    evidenceCount: signal.evidenceBoundRelationCount + (node.lineage.length > 0 || node.provenance ? 1 : 0),
    observationSpanDays: 0,
    isSfiInternal: subject === 'SFI_SYSTEM',
  };
  return {
    input,
    resolution: resolveMihmMethod(input),
    subjectBasis: declaredSubject ? 'DECLARED' : subjectProposal ? 'PROPOSED' : 'UNKNOWN',
    subjectProposal,
    subjectProposalReasons: declaredSubject
      ? ['CANONICAL_SUBJECT_DECLARED']
      : subjectProposal === 'CASE'
        ? ['RELATIONAL_OR_RIVAL_STRUCTURE_SUGGESTS_CASE_CONTAINER']
        : subjectProposal === 'ARTIFACT'
          ? ['BOUNDED_EVIDENCE_OBJECT_SUGGESTS_ARTIFACT']
          : ['INSUFFICIENT_SUBJECT_IDENTITY'],
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

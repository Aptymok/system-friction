'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SfiRootWorkspace } from './SfiRootWorkspace';
import { RootCognitiveFieldPixi } from './RootCognitiveFieldPixi';
import { projectKnowledgeTimeContrast } from '@/lib/graph/knowledgeTimeContrast';
import './RootNeuralGraphView.css';

type GraphNode = {
  id: string;
  label: string;
  type: string;
  origin: string;
  provenance: string;
  lineage: string[];
  attributes: Record<string, unknown>;
  reality?: {
    stage: string; state: string; sourceVersion: string|null; captureTime: string|null; uncertainty: unknown|null;
    verificationState: string|null; authority: string|null; executionState: string|null;
    expectedReturn: unknown|null; observedReturn: unknown|null; applicableObligation: unknown|null;
    verificationCost: unknown|null; verificationBudget: unknown|null; nextBestObservation: string|null;
    privacyBoundary: unknown|null; trajectory: unknown|null;
  };
  realityPassport?: {
    contract: string;
    nodeId: string;
    stage: string;
    epistemicState: string;
    decision: 'CONTINUE'|'ABSTAIN'|'BLOCKED';
    reasons: string[];
    temporal: { sourceVersion:string|null; captureTime:string|null; nodeUpdatedAt:string|null };
    epistemic: { uncertainty:unknown|null };
    provenance: { declared:string; lineageCount:number; lineageRefs:string[]; supportingRelationCount:number; supportingRelationRefs:string[]; contradictionCount:number; contradictionRefs:string[] };
    verification: { state:string; cost:unknown|null; budget:unknown|null; nextBestObservation:string|null };
    authority: { state:string; executionState:string; authorityExpanded:boolean|null; mayMintReturn:boolean|null; mayPromoteCanon:boolean|null };
    persistence: { represented:boolean; refs:string[]; boundary:string };
    returnState: { expected:unknown|null; observed:unknown|null; status:'OBSERVED'|'PENDING'|'NOT_APPLICABLE'|'UNKNOWN' };
    constraints: { privacy:unknown|null; trajectory:unknown|null };
    boundary: string;
    methodBoundary: string;
  };
  methodSignal?: {
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
  methodResolution?: {
    input: {
      subject: string;
      temporalScope: string;
      evidenceModalities: string[];
      worldContextRequested?: boolean;
      requiresTrajectory?: boolean;
      requiresRivalHypothesis?: boolean;
      requiresInterventionTracking?: boolean;
    };
    resolution: {
      status: string;
      primary: { methodId: string } | null;
      confidence: number;
      requiresGovernanceReview: boolean;
    };
    subjectBasis: 'DECLARED' | 'PROPOSED' | 'UNKNOWN';
    subjectProposal: string | null;
    subjectProposalReasons: string[];
  };
  unknownResolutionPlan?: {
    status: 'NOT_REQUIRED' | 'ACTIVE' | 'CENSORED';
    target: 'SUBJECT_IDENTITY';
    temporalBasis: string[];
    knownWithoutIdentity: string[];
    missing: string[];
    discriminatingObservations: string[];
    sourceStrategy: string[];
    stoppingCondition: string;
    noCalendarTimeoutInvented: true;
  };
  fieldProtocolProposal?: {
    status: 'DECLARED' | 'PROPOSED' | 'ABSTAIN';
    protocolId: string | null;
    epistemicClass: 'DECLARED' | 'DERIVED';
    reasons: string[];
    assumptionsToCheck: string[];
  };
  scientificReading?: {
    contract: string;
    temporal: { coordinates: { basis: string; value: number|string; source: string }[]; availableResolutions: string[]; multipleClocks: boolean };
    relations: { edgeId:string; currentState:string|null; previousState:string|null; weightDelta:number|null; latency:number|null; uncertainty:number|null; onset:string|null; offset:string|null; recurrence:number|string|null; provenanceBound:boolean }[];
    emergence: { state:string; reason:string; observedAt:string|null; priorState:string|null };
    capacity: { interventionRef:string|null; perturbationMagnitude:number|null; response:string; recoveryTime:number|null; evidenceRefs:string[] } | null;
    distributedConfiguration: { state:string; memberNodeIds:string[]; relationIds:string[]; evidenceBoundRelationCount:number; reason:string };
    evidenceGeometry: { authority:string; meanObservedWeight:number|null; strongestRelationId:string|null; strongestWeight:number|null; rule:string };
    propertyDiscovery: { status:string; candidates:{property:string;sourceRef:string;value:string|number;epistemicClass:string}[]; boundary:string };
    attractor: { state:string; recurrenceObserved:boolean; recoveryObserved:boolean; stabilityEvidenceRefs:string[]; reason:string };
    methodCompetition: { state:string; candidates:{family:string;question:string;assumptionCheck:string;missing:string[];falsificationCondition:string}[]; nextObservation:string|null; boundary:string };
    nextAction: { decision:string; basis:string[]; candidateRefs:string[]; authorityRequired:boolean; reason:string };
    methodCandidates: { family:string; question:string; assumptions:string[]; failureModes:string[]; output:string; falsificationCondition:string; computationalCost:string }[];
    reversibility: { sourceObservationRefs:string[]; aggregationRefs:string[]; phenomenonRefs:string[]; reconstructable:boolean };
    boundaries:string[];
  };
  fieldHistory?: {
    epochCount: number;
    firstObservedAt: string | null;
    lastObservedAt: string | null;
    persistedHistory: boolean;
    recentEpochs: Array<{
      eventId: string;
      occurredAt: string;
      state: string | null;
      previousState: string | null;
      censoring: string;
      relationTransitions: Record<string, unknown>[];
    }>;
  } | null;
  learningState?: {
    candidateEventId: string;
    cycleId: string | null;
    classification: string | null;
    state: 'QUARANTINED' | 'ELIGIBLE_FOR_ROOT_PROMOTION' | 'PROMOTED' | 'REJECTED';
    assessmentClass: string | null;
    boundary: 'LEARNING_STATE_IS_GOVERNANCE_NOT_OBSERVATION';
  } | null;
  methodResult?: {
    methodId: string;
    methodVersion: string;
    runId: string;
    epistemicClass: 'SIMULATED' | 'DERIVED' | 'OBSERVED';
    resultHash: string;
    evidenceRefs: string[];
    expectedSignal: { description: string; measures: string[] };
    falsificationCondition: string;
    stoppingCondition: string;
    returnWindow: { opensAt: string; closesAt: string | null; required: boolean; basis?: 'CHRONOLOGY'|'PHENOMENON_CONDITION'; condition?: string | null };
    contrastStatus: 'PENDING_RETURN' | 'AVAILABLE' | 'NOT_APPLICABLE';
    nextState: 'WAIT_RETURN' | 'CONTRAST_AVAILABLE' | 'COMPLETE_WITHOUT_RETURN';
    canonicalMutation: false;
    boundary: 'METHOD_RESULT_IS_NOT_OBSERVATION_OR_CANON';
  } | null;
  fieldProjection?: {
    decision: 'ABSTAIN' | 'SIMULATED_PROJECTION';
    epistemicClass: 'SIMULATED';
    protocolId: string | null;
    assumptions: string[];
    limitations: string[];
    displacement: { x: number; y: number } | null;
    reason: string;
  };
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
  origin: string;
  provenance: string;
  lineage: string[];
  attributes: Record<string, unknown>;
  reality?: { material: boolean; provenance: string; relation: string; state: string };
};

type GraphPayload = {
  sourceState: 'observed' | 'degraded' | 'missing';
  degradedReason: string | null;
  readPlane: 'SUPABASE' | 'NEON' | 'PROJECTION' | 'UNAVAILABLE';
  primaryDiagnostic: string | null;
  loadedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  realityCoverage: { stage: string; observed: boolean }[];
  capacityEnvelope: { status:'OBSERVED_RANGE'|'INSUFFICIENT'; observationCount:number; minPerturbation:number|null; maxPerturbation:number|null; responses:Record<string,number>; evidenceRefs:string[]; boundary:string };
  admission: { contract: string; sourceNodes: number; sourceEdges: number; admittedNodes: number; admittedEdges: number; excludedNodes: number; excludedEdges: number; excludedNodeReasons: Record<string, number> };
};


type RootAgentRecord = {
  agentKey: string;
  name: string;
  entityKind: string;
  capability: string;
  permissions: string;
  status: string;
  lifecycleState: string;
  lastRunAt: string | null;
};

const FIELD_CATEGORIES = [
  'GOVERNANCE',
  'CASES & PROJECTS',
  'INSTITUTIONAL ATTRACTOR',
  'EXTERNAL REALITY',
  'AUTHORITY BOUNDARY',
  'PROJECTIONS',
] as const;

// Presentation-only grouping of admitted types, not a new canonical node ontology.
// Do not classify a node from aesthetic position, graph degree or unsupported inference.
function fieldCategory(node: GraphNode): string {
  const kind=node.type.toLowerCase();
  if (/authoriz|permission|scope|boundary|restriction|gate|block/.test(kind)) return 'AUTHORITY BOUNDARY';
  if (/hypothes|projection|predict|scenario|simulat|forecast/.test(kind)) return 'PROJECTIONS';
  if (/attractor|objective|capability|convergence|regime/.test(kind)) return 'INSTITUTIONAL ATTRACTOR';
  if (/case|project|investigation|intervention/.test(kind)) return 'CASES & PROJECTS';
  if (/govern|policy|mandate|decision|approval/.test(kind)) return 'GOVERNANCE';
  if (/world|external|source|actor|organization|institution|phenomen|event/.test(kind)) return 'EXTERNAL REALITY';
  return 'UNCLASSIFIED';
}

function representedText(value: unknown, fallback='NOT REPRESENTED'): string {
  if(typeof value==='string') return value.trim() || fallback;
  if(typeof value==='number'||typeof value==='boolean') return String(value);
  return fallback;
}

type Position = { x: number; y: number };

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function nodeTone(node: GraphNode) {
  const epistemic = String(node.reality?.state ?? node.attributes.epistemicClass ?? node.attributes.state ?? 'UNKNOWN').toUpperCase();
  const type = node.type.toLowerCase();
  if (/FAIL|BREACH|REJECT|CONTRADICT|DEGRADED|FALSIF/.test(epistemic)) return '#B85050';
  if (type.includes('return') || type.includes('outcome')) return '#D4AF37';
  if (type.includes('learning')) return '#E8DDC3';
  if (type.includes('hypothesis')) return '#4A7AAA';
  if (type.includes('evidence') || /OBSERVED/.test(epistemic)) return '#4A7AAA';
  if (type.includes('case')) return '#E8DDC3';
  if (type.includes('twin') || type.includes('method')) return '#E8DDC3';
  if (/DECLARED/.test(epistemic)) return '#C8A951';
  if (/HYPOTHESIZED|SIMULATED/.test(epistemic)) return '#4A7AAA';
  return '#E8DDC3';
}

function nodeShape(node: GraphNode): 'circle'|'rounded'|'diamond'|'hex'|'triangle'|'ring'|'pill' {
  const type=node.type.toLowerCase();
  if(type.includes('hypothesis')) return 'diamond';
  if(type.includes('evidence')) return 'circle';
  if(type.includes('return')||type.includes('outcome')) return 'ring';
  if(type.includes('learning')) return 'hex';
  if(type.includes('case_object')||type.includes('case-object')) return 'rounded';
  if(type==='case'||type.includes('case')) return 'pill';
  if(type.includes('twin')||type.includes('method')) return 'triangle';
  return 'rounded';
}

function qualifiedRelationCount(node: GraphNode, edges: GraphEdge[]) {
  return edges.filter((edge)=>{
    if(edge.source!==node.id&&edge.target!==node.id) return false;
    const provenance=String(edge.provenance||'').trim();
    const epistemic=String(edge.attributes?.epistemicClass??'').toUpperCase();
    const evidenceRefs=edge.attributes?.evidenceRefs;
    return Boolean(provenance) && (
      epistemic==='OBSERVED' ||
      epistemic==='DERIVED' ||
      (Array.isArray(evidenceRefs)&&evidenceRefs.length>0) ||
      edge.reality?.material===true
    );
  }).length;
}

type TemporalReading = {
  coordinate: number | null;
  basis: 'SEQUENCE' | 'CYCLE' | 'RECURRENCE' | 'PHASE' | 'STATE_OCCUPANCY' | 'CHRONOLOGY' | 'UNKNOWN';
  label: string;
};

function numericAttribute(node: GraphNode, keys: readonly string[]) {
  for (const key of keys) {
    const value = node.attributes[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function stringAttribute(node: GraphNode, keys: readonly string[]) {
  for (const key of keys) {
    const value = node.attributes[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function temporalReading(node: GraphNode): TemporalReading {
  const sequence = numericAttribute(node, ['sequence','sequenceIndex','transitionIndex','eventIndex','order']);
  if (sequence !== null) return { coordinate: sequence, basis: 'SEQUENCE', label: `SEQUENCE · ${sequence}` };

  const cycle = numericAttribute(node, ['cycle','cycleIndex','cycleNumber']);
  if (cycle !== null) return { coordinate: cycle, basis: 'CYCLE', label: `CYCLE · ${cycle}` };

  const recurrence = numericAttribute(node, ['recurrence','recurrenceIndex','recurrenceCount']);
  if (recurrence !== null) return { coordinate: recurrence, basis: 'RECURRENCE', label: `RECURRENCE · ${recurrence}` };

  const occupancy = numericAttribute(node, ['timeInState','sojourn','sojournDuration','stateDuration']);
  if (occupancy !== null) return { coordinate: occupancy, basis: 'STATE_OCCUPANCY', label: `STATE OCCUPANCY · ${occupancy}` };

  const phase = stringAttribute(node, ['phase','temporalPhase','cyclePhase','statePhase']);
  if (phase) return { coordinate: null, basis: 'PHASE', label: `PHASE · ${phase}` };

  const candidates = [node.reality?.captureTime, node.attributes.observedAt, node.attributes.observed_at, node.attributes.occurredAt, node.attributes.occurred_at, node.attributes.effectiveAt, node.attributes.effective_at, node.attributes.releasedAt, node.attributes.released_at, node.attributes.validFrom, node.attributes.valid_from, node.fieldHistory?.lastObservedAt];
  for (const value of candidates) {
    if (typeof value === 'string') {
      const ms = Date.parse(value);
      if (!Number.isNaN(ms)) return { coordinate: ms, basis: 'CHRONOLOGY', label: date(value) };
    }
  }
  return { coordinate: null, basis: 'UNKNOWN', label: 'UNKNOWN' };
}

function temporalValue(node: GraphNode) {
  return temporalReading(node).coordinate;
}

function regimeSignal(node: GraphNode) {
  const text = semanticText(node);
  if (/bifurcat|threshold|regime change|attractor|ejector/.test(text)) return 'REGIME CANDIDATE';
  if (/contradict|counterevidence|breach|degraded|fail/.test(text)) return 'FRICTION / DIVERGENCE';
  return 'PERSISTING / UNCLASSIFIED';
}

function short(value: string, max = 34) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function humanize(value:string){
  return value
    .replaceAll('_',' ')
    .replace(/\b\w/g,(char)=>char.toUpperCase());
}

function knowledgeDate(value: string | null) {
  if (!value) return 'NOT RECORDED';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return 'INVALID DATE';
  return parsed.toLocaleString('en-GB',{
    day:'2-digit',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC',
  }) + ' UTC';
}

function date(value: string | null) {
  if (!value) return 'MISSING';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleString('en-US', { timeZone: 'America/Mexico_City', hour12: false });
}

function semanticText(node: GraphNode) {
  return [node.type, node.label, node.origin, node.provenance, ...node.lineage, ...Object.entries(node.attributes).flatMap(([key, value]) => [key, typeof value === 'string' ? value : ''])]
    .join(' ')
    .toLowerCase();
}

const REALITY_PASSPORT_STAGES = ['world','capture','evidence','friction','transformation','hypothesis','inference','claim','verification','authority','action','return','contrast','learning','unclassified'] as const;
type RealityPassportStage = (typeof REALITY_PASSPORT_STAGES)[number];

function realityPassportStage(node: GraphNode): RealityPassportStage {
  const explicit = node.reality?.stage?.toLowerCase();
  if (explicit && REALITY_PASSPORT_STAGES.includes(explicit as RealityPassportStage)) return explicit as RealityPassportStage;
  const text = semanticText(node);
  return REALITY_PASSPORT_STAGES.slice(0, -1).find((stage) => text.includes(stage)) ?? 'unclassified';
}

function reorganizationOffset(node: GraphNode, reading: string): Position {
  if (reading !== 'CURRENT_STATE' && reading !== 'RETURN_CONTRAST') return { x: 0, y: 0 };
  const state = node.methodSignal?.fieldReorganizationState ?? 'UNCHANGED';
  if (state === 'UNCHANGED') return { x: 0, y: 0 };

  // This is a reversible reading transform only. Canonical node coordinates/history
  // are not persisted or overwritten by learning projection.
  const supportRatio = node.methodSignal?.relationSupportRatio;
  const direction = supportRatio === null || supportRatio === undefined || supportRatio === 0.5
    ? (hash(`reorganization:${node.id}:${state}`) % 2 === 0 ? 1 : -1)
    : supportRatio > 0.5 ? 1 : -1;
  const magnitude = node.methodSignal?.reorganizationMagnitude ?? 0;
  const projectionAuthority = node.methodSignal?.projectionAuthority ?? 'NONE';
  const labProjection = node.fieldProjection;
  if (projectionAuthority === 'METHOD_LAB_REQUIRED') {
    if (labProjection?.decision !== 'SIMULATED_PROJECTION' || !labProjection.displacement) return { x: 0, y: 0 };
    const stateScale = state === 'LEARNING_PROMOTED' ? 54 : state === 'LEARNING_QUARANTINED' ? 30 : 18;
    return { x: labProjection.displacement.x * stateScale, y: labProjection.displacement.y * stateScale * 0.45 };
  }
  if (magnitude <= 0) return { x: 0, y: 0 };
  const stateScale = state === 'LEARNING_PROMOTED' ? 54 : state === 'LEARNING_QUARANTINED' ? 30 : 18;
  const displacement = stateScale * magnitude;
  return { x: displacement * direction, y: state === 'LEARNING_PROMOTED' ? -24 * magnitude : 14 * magnitude };
}

function applyReorganizationReading(node: GraphNode, position: Position, reading: string, width: number, height: number): Position {
  const offset = reorganizationOffset(node, reading);
  return {
    x: Math.max(38, Math.min(width - 38, position.x + offset.x)),
    y: Math.max(38, Math.min(height - 38, position.y + offset.y)),
  };
}

function buildPositions(nodes: GraphNode[], reading: 'CURRENT_STATE'|'HIERARCHY'|'TRAJECTORY'|'RETROLONGITUDINAL'|'PROJECTION'|'FRICTION_REGIME'|'REALITY_CHAIN'|'RETURN_CONTRAST') {
  const width = 1180;
  const height = 700;
  const positions = new Map<string, Position>();
  const types = [...new Set(nodes.map((node) => node.type))].sort();

  if (reading === 'REALITY_CHAIN') {
    const stages = REALITY_PASSPORT_STAGES;
    const buckets = new Map(stages.map((stage) => [stage, [] as GraphNode[]]));
    for (const node of nodes) buckets.get(realityPassportStage(node))?.push(node);
    stages.forEach((stage, stageIndex) => {
      const bucket = buckets.get(stage) ?? [];
      const x = 70 + (stageIndex * (width - 140)) / Math.max(1, stages.length - 1);
      bucket.forEach((node, index) => {
        const spread = Math.max(1, bucket.length - 1);
        const y = bucket.length === 1 ? height / 2 : 90 + (index * (height - 180)) / spread;
        positions.set(node.id, { x, y });
      });
    });
    return { positions, types, width, height };
  }

  if (reading === 'RETURN_CONTRAST') {
    const anchors: Record<string, number> = { return: 180, contrast: 360, learning: 560, memory: 790, canon: 980 };
    nodes.forEach((node, index) => {
      const text = semanticText(node);
      const reorganization = node.methodSignal?.fieldReorganizationState ?? 'UNCHANGED';
      const governedAnchor = reorganization === 'LEARNING_PROMOTED'
        ? 'memory'
        : reorganization === 'LEARNING_QUARANTINED'
          ? 'learning'
          : reorganization === 'CONTRAST_RECORDED'
            ? 'contrast'
            : null;
      const key = governedAnchor ?? Object.keys(anchors).find((candidate) => text.includes(candidate));
      const x = key ? anchors[key] : 540;
      const seed = hash(node.id);
      const base = { x, y: 70 + ((seed + index * 31) % 560) };
      positions.set(node.id, applyReorganizationReading(node, base, reading, width, height));
    });
    return { positions, types, width, height };
  }

  if (reading === 'FRICTION_REGIME') {
    nodes.forEach((node, index) => {
      const text = semanticText(node);
      const friction = ['unknown','missing','fail','breach','contradict','counterevidence','degraded','blocked'].filter((term) => text.includes(term)).length;
      const seed = hash(node.id);
      positions.set(node.id, {
        x: 100 + Math.min(4, friction) * 240,
        y: 70 + ((seed + index * 17) % 560),
      });
    });
    return { positions, types, width, height };
  }

  if (reading === 'TRAJECTORY' || reading === 'RETROLONGITUDINAL' || reading === 'PROJECTION') {
    const timed = nodes.map((node) => ({ node, time: temporalValue(node) })).sort((a,b) => (a.time ?? 0) - (b.time ?? 0));
    const known = timed.filter((item) => item.time !== null);
    const min = known[0]?.time ?? 0;
    const max = known[known.length - 1]?.time ?? min + 1;
    timed.forEach(({node,time}, index) => {
      const ratio = time === null ? .5 : (time-min)/Math.max(1,max-min);
      const forward = reading === 'RETROLONGITUDINAL' ? 1-ratio : ratio;
      const projected = reading === 'PROJECTION' && /HYPOTHESIZED|SIMULATED|EXPECTED/.test(String(node.reality?.state ?? node.attributes.epistemicClass ?? '').toUpperCase());
      positions.set(node.id, { x: 90 + forward*(width-180), y: 90 + ((hash(node.id)+index*29)%500) + (projected ? 40 : 0) });
    });
    return { positions, types, width, height };
  }

  if (reading === 'HIERARCHY') {
    const typeIndex = new Map(types.map((type,index)=>[type,index]));
    nodes.forEach((node,index)=>{
      const level=typeIndex.get(node.type) ?? 0;
      positions.set(node.id,{x:100+(level%5)*245,y:80+(Math.floor(level/5)*170)+((hash(node.id)+index*19)%120)});
    });
    return { positions, types, width, height };
  }

  const typeIndex = new Map(types.map((type, index) => [type, index]));
  for (const node of nodes) {
    const group = typeIndex.get(node.type) ?? 0;
    const groupAngle = (Math.PI * 2 * group) / Math.max(1, types.length) - Math.PI / 2;
    const centerX = width / 2 + Math.cos(groupAngle) * 330;
    const centerY = height / 2 + Math.sin(groupAngle) * 210;
    const seed = hash(node.id);
    const localAngle = ((seed % 360) / 180) * Math.PI;
    const observedMeanWeight = node.scientificReading?.evidenceGeometry.authority === 'OBSERVED_RELATION_MEASURE'
      ? node.scientificReading.evidenceGeometry.meanObservedWeight
      : null;
    // Evidence-bound geometry: when canonical relation weights exist, stronger observed
    // coupling reduces local radius. Hash remains only a collision-spreading fallback
    // when no admissible relational measure exists; it carries no epistemic meaning.
    const localRadius = observedMeanWeight === null || observedMeanWeight === undefined
      ? 24 + ((seed >>> 8) % 112)
      : 24 + (1 - Math.max(0, Math.min(1, observedMeanWeight))) * 112;
    const base = {
      x: Math.max(38, Math.min(width - 38, centerX + Math.cos(localAngle) * localRadius)),
      y: Math.max(38, Math.min(height - 38, centerY + Math.sin(localAngle) * localRadius * 0.72)),
    };
    positions.set(node.id, applyReorganizationReading(node, base, reading, width, height));
  }
  return { positions, types, width, height };
}

export function RootNeuralGraphView({ graph, agents=[], agentRegistryState='UNAVAILABLE' }: { graph: GraphPayload; agents?: RootAgentRecord[]; agentRegistryState?: string }) {
  const searchParams=useSearchParams();
  const requestedReading=searchParams.get('reading');
  const allowedReadings=['CURRENT_STATE','HIERARCHY','TRAJECTORY','RETROLONGITUDINAL','PROJECTION','FRICTION_REGIME','REALITY_CHAIN','RETURN_CONTRAST'] as const;
  const initialReading=(allowedReadings as readonly string[]).includes(requestedReading||'') ? requestedReading as typeof allowedReadings[number] : 'CURRENT_STATE';
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('ALL');
  const [knowledgeCutoffSelection,setKnowledgeCutoffSelection]=useState<{nodeId:string;cutoff:string}|null>(null);
  const [activeCategory,setActiveCategory]=useState('ALL');
  const [authorityFilter,setAuthorityFilter]=useState('ALL');
  const [evidenceFilter,setEvidenceFilter]=useState('ALL');
  const [relationFilter,setRelationFilter]=useState('ALL');
  const [returnFilter,setReturnFilter]=useState('ALL');
  const [domainFilter,setDomainFilter]=useState('ALL');
  // A case deep link may select only a genuinely admitted canonical graph node.
  // Do not synthesize a graph object for an otherwise valid Case Platform record.
  const requestedNode=searchParams.get('node');
  const [selectedId, setSelectedId] = useState<string | null>(()=>{
    return requestedNode&&graph.nodes.some(node=>node.id===requestedNode)?requestedNode:null;
  });
  const [reading, setReading] = useState<'CURRENT_STATE'|'HIERARCHY'|'TRAJECTORY'|'RETROLONGITUDINAL'|'PROJECTION'|'FRICTION_REGIME'|'REALITY_CHAIN'|'RETURN_CONTRAST'>(initialReading);
  const [temporalResolution, setTemporalResolution] = useState('ALL');
  const [focusId,setFocusId]=useState<string|null>(null);

  const degree = useMemo(() => {
    const values = new Map<string, number>();
    for (const edge of graph.edges) {
      values.set(edge.source, (values.get(edge.source) ?? 0) + 1);
      values.set(edge.target, (values.get(edge.target) ?? 0) + 1);
    }
    return values;
  }, [graph.edges]);

  const allTypes = useMemo(
    () => [...new Set(graph.nodes.map((node) => node.type))].sort(),
    [graph.nodes],
  );

  const domains=useMemo(()=>[...new Set(graph.nodes.map(node=>node.origin).filter(Boolean))].sort(),[graph.nodes]);

  const focusIds=useMemo(()=>{
    if(!focusId) return null;
    const ids=new Set<string>([focusId]);
    let frontier=new Set<string>([focusId]);
    for(let depth=0;depth<2;depth+=1){
      const next=new Set<string>();
      for(const edge of graph.edges){
        if(frontier.has(edge.source)){ids.add(edge.target);next.add(edge.target);}
        if(frontier.has(edge.target)){ids.add(edge.source);next.add(edge.source);}
      }
      frontier=next;
    }
    return ids;
  },[focusId,graph.edges]);

  const visibleNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return graph.nodes.filter((node) => {
      if (focusIds && !focusIds.has(node.id)) return false;
      if (activeType !== 'ALL' && node.type !== activeType) return false;
      if (activeCategory !== 'ALL' && fieldCategory(node) !== activeCategory) return false;
      if (domainFilter !== 'ALL' && node.origin !== domainFilter) return false;
      if (authorityFilter !== 'ALL' && (node.realityPassport?.authority.state ?? 'UNKNOWN') !== authorityFilter) return false;
      if (evidenceFilter === 'WITH_REFERENCES' && !node.lineage.length && !node.realityPassport?.provenance.supportingRelationCount) return false;
      if (evidenceFilter === 'WITHOUT_REFERENCES' && (node.lineage.length > 0 || (node.realityPassport?.provenance.supportingRelationCount ?? 0) > 0)) return false;
      const connected=(degree.get(node.id) ?? 0)>0;
      if (relationFilter==='CONNECTED' && !connected) return false;
      if (relationFilter==='ISOLATED' && connected) return false;
      if (returnFilter!=='ALL' && (node.realityPassport?.returnState.status ?? 'UNKNOWN')!==returnFilter) return false;
      if (temporalResolution !== 'ALL' && !node.scientificReading?.temporal.availableResolutions.includes(temporalResolution)) return false;
      if (!needle) return true;
      return [node.label, node.type, node.origin, node.provenance, ...node.lineage]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [activeType, activeCategory, authorityFilter, evidenceFilter, relationFilter, returnFilter, domainFilter, degree, graph.nodes, query, temporalResolution,focusIds]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [graph.edges, visibleNodeIds],
  );

  const topology = useMemo(() => buildPositions(graph.nodes, reading), [graph.nodes, reading]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
  const knowledgeContrast=selected?projectKnowledgeTimeContrast({
    attributes:selected.attributes,
    epistemicState:selected.realityPassport?.epistemicState ?? selected.reality?.state ?? 'UNKNOWN',
    captureTime:selected.realityPassport?.temporal.captureTime ?? selected.reality?.captureTime ?? null,
    nodeUpdatedAt:selected.realityPassport?.temporal.nodeUpdatedAt ?? null,
    sourceVersion:selected.realityPassport?.temporal.sourceVersion ?? null,
    provenance:selected.provenance,
    lineage:selected.lineage,
    fieldHistory:selected.fieldHistory,
    selectedCutoff:knowledgeCutoffSelection?.nodeId===selected.id ? knowledgeCutoffSelection.cutoff : null,
  }):null;
  const selectedEdges = useMemo(
    () => selected
      ? graph.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id)
      : [],
    [graph.edges, selected],
  );

  const labelled = useMemo(() => {
    const candidates = [...visibleNodes]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 18)
      .map((node) => node.id);
    if (selectedId && !candidates.includes(selectedId)) candidates.push(selectedId);
    return new Set(candidates);
  }, [degree, selectedId, visibleNodes]);

  const continuity = graph.readPlane === 'NEON';
  const graphObserved = graph.sourceState === 'observed';
  const typeCount = allTypes.length;

  const fieldNodes=visibleNodes.map((node)=>{const p=topology.positions.get(node.id)??{x:topology.width/2,y:topology.height/2};const qualified=qualifiedRelationCount(node,graph.edges);const evidence=Number(node.methodSignal?.evidenceBoundRelationCount??0);return {id:node.id,label:node.label,type:node.type,tone:nodeTone(node),shape:nodeShape(node),x:p.x,y:p.y,radius:selectedId===node.id?10:5.2+Math.min(4.6,qualified*.32+evidence*.24),selected:selectedId===node.id};});
  const fieldEdges=visibleEdges.map((edge)=>({id:edge.id,source:edge.source,target:edge.target,weight:edge.weight,selected:selectedId===edge.source||selectedId===edge.target}));


  return (
    <main className="neuralGraphShell rootFieldMode rootReferenceCockpit" data-root-layout="ONE-FIELD-ONE-CONSOLE" data-neural-graph-contract="SFI-ROOT-NEURAL-GRAPH-1.1">
      <div className="rootHorizontalRail" aria-label="ROOT cognitive field and governance console">
        <aside className="rootReferenceSidebar" aria-label="Field explorer">
          <div className="rootReferenceSidebarTitle"><strong>ROOT</strong><span>FIELD EXPLORER</span></div>
          <div className="rootReferenceSource" data-state={graph.sourceState}>
            <i/><span>{graph.sourceState.toUpperCase()} · {graph.readPlane}<small>{visibleNodes.length} / {graph.nodes.length} objects · {visibleEdges.length} relations</small></span>
          </div>
          <label className="rootReferenceSearchLabel" htmlFor="root-reference-search">SEARCH THE FIELD</label>
          <input className="rootReferenceSearch" id="root-reference-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Objects, cases, actors, evidence, dates" />
          <div className="rootReferenceSidebarKicker">COGNITIVE GROUPS · DERIVED FROM TYPES</div>
          <nav className="rootReferenceFilters" aria-label="Cognitive groups">
            <button type="button" aria-pressed={activeCategory==='ALL'} onClick={()=>setActiveCategory('ALL')}><span>ALL COGNITIVE OBJECTS</span><b>{graph.nodes.length}</b></button>
            {FIELD_CATEGORIES.map(category=><button key={category} type="button" aria-pressed={activeCategory===category} onClick={()=>setActiveCategory(activeCategory===category?'ALL':category)}><span>{category}</span><b>{graph.nodes.filter(node=>fieldCategory(node)===category).length}</b></button>)}
            {graph.nodes.some(node=>fieldCategory(node)==='UNCLASSIFIED')?<button type="button" aria-pressed={activeCategory==='UNCLASSIFIED'} onClick={()=>setActiveCategory(activeCategory==='UNCLASSIFIED'?'ALL':'UNCLASSIFIED')}><span>UNCLASSIFIED</span><b>{graph.nodes.filter(node=>fieldCategory(node)==='UNCLASSIFIED').length}</b></button>:null}
          </nav>
          <div className="rootReferenceSidebarKicker">ADDITIONAL FILTERS</div>
          <label className="rootExplorerLabel">DOMAIN
            <select value={domainFilter} onChange={event=>setDomainFilter(event.target.value)}><option value="ALL">ALL DOMAINS</option>{domains.map(domain=><option key={domain} value={domain}>{domain}</option>)}</select>
          </label>
          <label className="rootExplorerLabel">Temporal resolution
            <select value={temporalResolution} onChange={event=>setTemporalResolution(event.target.value)}>
              {['ALL','SYSTEM_HISTORY','REGIME','PHENOMENON','CYCLE','TRANSITION','EVENT','OBSERVATION'].map(level=><option key={level} value={level}>{level.replaceAll('_',' ')}</option>)}
            </select>
          </label>
          <label className="rootExplorerLabel">AUTHORITY
            <select value={authorityFilter} onChange={event=>setAuthorityFilter(event.target.value)}><option value="ALL">ALL STATES</option>{[...new Set(graph.nodes.map(node=>node.realityPassport?.authority.state ?? 'UNKNOWN'))].sort().map(state=><option key={state} value={state}>{state}</option>)}</select>
          </label>
          <label className="rootExplorerLabel">EVIDENCE STATE
            <select value={evidenceFilter} onChange={event=>setEvidenceFilter(event.target.value)}><option value="ALL">ALL EVIDENCE STATES</option><option value="WITH_REFERENCES">WITH REFERENCES</option><option value="WITHOUT_REFERENCES">NO REFERENCES REPRESENTED</option></select>
          </label>
          <label className="rootExplorerLabel">NODE TYPE
            <select value={activeType} onChange={event=>setActiveType(event.target.value)}><option value="ALL">ALL TYPES</option>{allTypes.map(type=><option key={type} value={type}>{humanize(type)}</option>)}</select>
          </label>
          <label className="rootExplorerLabel">RELATIONS
            <select value={relationFilter} onChange={event=>setRelationFilter(event.target.value)}><option value="ALL">ALL RELATIONS</option><option value="CONNECTED">CONNECTED</option><option value="ISOLATED">ISOLATED</option></select>
          </label>
          <label className="rootExplorerLabel">RETURN STATE
            <select value={returnFilter} onChange={event=>setReturnFilter(event.target.value)}><option value="ALL">ALL RETURN STATES</option>{['OBSERVED','PENDING','NOT_APPLICABLE','UNKNOWN'].map(state=><option key={state} value={state}>{state.replaceAll('_',' ')}</option>)}</select>
          </label>
          <p className="rootReferenceSidebarNote">SOURCE INDEPENDENCE: NOT ESTABLISHED UNLESS PROVENANCE IDENTIFIES DISTINCT ORIGINAL SOURCES. Reference count is not independence.</p>
          <button className="rootExplorerReset" type="button" onClick={()=>{setQuery('');setActiveType('ALL');setActiveCategory('ALL');setAuthorityFilter('ALL');setEvidenceFilter('ALL');setRelationFilter('ALL');setReturnFilter('ALL');setDomainFilter('ALL');setTemporalResolution('ALL');setFocusId(null);setSelectedId(null);}}>SHOW COMPLETE FIELD</button>
        </aside>

        <section className="rootFieldStage rootHorizontalGraph" aria-label="Canonical Neural Graph">
          <div className="rootReferenceModes" aria-label="Field perspective">
            {([['FIELD','CURRENT_STATE'],['TRAJECTORIES','TRAJECTORY'],['HIERARCHY','HIERARCHY'],['CONTRAST','RETURN_CONTRAST']] as const).map(([label,mode])=><button type="button" key={mode} aria-pressed={reading===mode} onClick={()=>setReading(mode)}>{label}</button>)}
          </div>
          <div className="rootFieldInstitutionIdentity" aria-hidden="true"><span>SYSTEM</span><span>FRICTION</span><span>INSTITUTE</span></div>
          <RootCognitiveFieldPixi nodes={fieldNodes} edges={fieldEdges} width={topology.width} height={topology.height} onSelect={id=>setSelectedId(id)} />
          {!visibleNodes.length ? <div className="rootFieldEmpty">NO COGNITIVE OBJECTS MATCH THE SELECTED FILTERS.</div> : null}
          <div className="rootFieldTimelineFooter" aria-label="Field state and chronology">
            <span>{reading.replaceAll('_',' ')} · {graph.sourceState.toUpperCase()} · {graph.readPlane}</span>
            <span>{visibleNodes.length} OBJECTS · {visibleEdges.length} RELATIONS · {date(graph.loadedAt)}</span>
            {selectedId?<button type="button" onClick={()=>setFocusId(focusId===selectedId?null:selectedId)}>{focusId===selectedId?'SHOW ALL RELATIONS':'ISOLATE RELATIONS'}</button>:null}
          </div>
        </section>

        <section className="rootGovernanceConsole" aria-label="Governance Console and Reality Passport">
          <header className="rootGovernanceHead">
            <span>ROOT / GOVERNANCE CONSOLE</span>
            <h1>Reality Passport</h1>
            <p>Evidence, inference, authority, execution and RETURN remain distinct.</p>
          </header>
          <div className="rootGovernanceSingleReading">
            {selected ? (
              <>
                <header className="rootPassportIdentity">
                  <span>SELECTED COGNITIVE OBJECT · {fieldCategory(selected)}</span>
                  <h2>{selected.label}</h2>
                  <dl>
                    <div><dt>OBJECT ID</dt><dd>{selected.id}</dd></div>
                    <div><dt>TYPE</dt><dd>{selected.type}</dd></div>
                    <div><dt>ORIGIN</dt><dd>{selected.origin || 'UNKNOWN'}</dd></div>
                    <div><dt>SOURCE</dt><dd>{selected.provenance || 'NOT REPRESENTED'}</dd></div>
                    <div><dt>LAST OBSERVED</dt><dd>{selected.realityPassport?.temporal.captureTime ?? selected.fieldHistory?.lastObservedAt ?? 'NOT OBSERVED'}</dd></div>
                    <div><dt>EPISTEMIC STATE</dt><dd>{selected.reality?.state ?? representedText(selected.attributes.epistemicClass,'UNKNOWN')}</dd></div>
                  </dl>
                </header>
                <section className="rootPassportQuestion rootPassportScientific" aria-label="Scientific temporal and dynamical reading">
                  <h3>SCIENTIFIC TEMPORAL READING</h3>
                  <p>Temporal resolution is derived from observed sequence, cycle, recurrence, phase or chronology as available, not inferred from database creation time.</p>
                  <div className="rootPassportScientificProperties">
                    <span>TIME<strong>{temporalReading(selected).label}</strong></span>
                    <span>SCIENTIFIC RESOLUTIONS<strong>{selected.scientificReading?.temporal.availableResolutions.join(' / ') || 'NOT REPRESENTED'}</strong></span>
                    <span>LOCAL DYNAMICAL ATTRACTOR<strong>{selected.scientificReading?.attractor.state ?? 'NOT OBSERVED'}</strong></span>
                    <span>ATTRACTOR RECURRENCE<strong>{selected.scientificReading?.attractor.recurrenceObserved===true?'OBSERVED':'NOT OBSERVED'}</strong></span>
                    <span>ATTRACTOR RECOVERY<strong>{selected.scientificReading?.attractor.recoveryObserved===true?'OBSERVED':'NOT OBSERVED'}</strong></span>
                  </div>
                  <p>{selected.scientificReading?.attractor.reason ?? 'No bounded dynamical attractor reading was supplied.'}</p>
                  <h4>PROPERTY DISCOVERY · {selected.scientificReading?.propertyDiscovery.status ?? 'NOT OBSERVED'}</h4>
                  {selected.scientificReading?.propertyDiscovery.candidates.length ?
                    <ul className="rootPassportScientificCandidates">{selected.scientificReading.propertyDiscovery.candidates.slice(0,6).map((candidate,index)=>
                      <li key={candidate.sourceRef+':'+index}><strong>{candidate.property}</strong><span>{String(candidate.value)}</span><small>{candidate.epistemicClass} · {candidate.sourceRef}</small></li>
                    )}</ul> :
                    <p>NO PROPERTY CANDIDATES OBSERVED IN THIS BOUNDED READING.</p>}
                  <p>Property and attractor observations do not confer authority or canonical truth. {selected.scientificReading?.propertyDiscovery.boundary ?? ''}</p>
                </section>

                <section className="rootPassportQuestion rootPassportKnowledgeTime" data-knowledge-contract="KNEW_THEN_KNOWN_NOW">
                  <h3>KNEW THEN / KNOWN NOW</h3>
                  <p>Compare epistemic records at two dated cut-offs. The date an event happened, the date its state was recorded, and the date the database row changed are different.</p>
                  {knowledgeContrast ? <>
                    {knowledgeContrast.history.length>=2 && knowledgeContrast.then.provenance==='PERSISTED_EPOCH' ?
                      <label className="rootKnowledgeCutoffLabel" htmlFor="root-knowledge-cutoff">
                        HISTORICAL KNOWLEDGE CUT-OFF
                        <select id="root-knowledge-cutoff"
                          value={knowledgeContrast.selectedCutoff ?? ''}
                          onChange={event=>setKnowledgeCutoffSelection({nodeId:selected.id,cutoff:event.target.value})}>
                          {knowledgeContrast.history.slice(0,-1).map(epoch=><option key={epoch.eventId} value={epoch.occurredAt}>{knowledgeDate(epoch.occurredAt)} · {epoch.state ?? 'UNKNOWN'}</option>)}
                        </select>
                      </label> : null}
                    <div className="rootPassportKnowledgeGrid">
                      <article className="rootPassportKnowledgeMoment" data-time-role="THEN">
                        <h4>KNEW THEN</h4>
                        <dl>
                          <div><dt>KNOWLEDGE RECORDED</dt><dd><time dateTime={knowledgeContrast.then.knownAt ?? undefined}>{knowledgeDate(knowledgeContrast.then.knownAt)}</time></dd></div>
                          <div><dt>WORLD EVENT / EFFECTIVE</dt><dd>{knowledgeDate(knowledgeContrast.then.eventAt)}</dd></div>
                          <div><dt>OBSERVED / CAPTURED</dt><dd>{knowledgeDate(knowledgeContrast.then.observedAt)}</dd></div>
                          <div><dt>{knowledgeContrast.then.stateMeaning==='EPISTEMIC'?'EPISTEMIC STATE':'RECORDED OBJECT STATE'}</dt><dd>{knowledgeContrast.then.state}</dd></div>
                          <div><dt>SOURCE RECORD</dt><dd>{knowledgeContrast.then.sourceRef ?? 'NOT REPRESENTED'}</dd></div>
                        </dl>
                        <p>{knowledgeContrast.then.statement ?? (knowledgeContrast.then.provenance==='PERSISTED_EPOCH'
                          ? 'A prior STATE is documented, but its historical claim text is NOT RECORDED.'
                          : 'No recoverable earlier knowledge statement is represented.')}</p>
                        <small>{knowledgeContrast.then.boundary}</small>
                      </article>
                      <article className="rootPassportKnowledgeMoment" data-time-role="NOW">
                        <h4>KNOWN NOW</h4>
                        <dl>
                          <div><dt>KNOWLEDGE RECORDED</dt><dd><time dateTime={knowledgeContrast.now.knownAt ?? undefined}>{knowledgeDate(knowledgeContrast.now.knownAt)}</time></dd></div>
                          <div><dt>WORLD EVENT / EFFECTIVE</dt><dd>{knowledgeDate(knowledgeContrast.now.eventAt)}</dd></div>
                          <div><dt>OBSERVED / CAPTURED</dt><dd>{knowledgeDate(knowledgeContrast.now.observedAt)}</dd></div>
                          <div><dt>RECORD LAST UPDATED</dt><dd>{knowledgeDate(knowledgeContrast.now.recordUpdatedAt)}</dd></div>
                          <div><dt>{knowledgeContrast.now.stateMeaning==='EPISTEMIC'?'EPISTEMIC STATE':'RECORDED OBJECT STATE'}</dt><dd>{knowledgeContrast.now.state}</dd></div>
                          <div><dt>SOURCE RECORD</dt><dd>{knowledgeContrast.now.sourceRef ?? 'NOT REPRESENTED'}</dd></div>
                        </dl>
                        <p>{knowledgeContrast.now.statement ?? 'No present knowledge statement is represented beyond the classified epistemic state.'}</p>
                        <small>{knowledgeContrast.now.boundary}</small>
                      </article>
                    </div>
                    <div className="rootPassportKnowledgeDelta">
                      <strong>TEMPORAL CONTRAST · {knowledgeContrast.comparison.replaceAll('_',' ')}</strong>
                      <p>{knowledgeContrast.comparison==='INSUFFICIENT_TEMPORAL_EVIDENCE'
                        ? 'The available record cannot establish a dated comparison. Unknown historical content remains unknown.'
                        : knowledgeContrast.comparison==='CHANGED'
                          ? 'The recorded epistemic STATE changed between the knowledge dates. This does not by itself prove the world changed.'
                          : 'No change of recorded epistemic STATE is demonstrated. Supporting evidence may still differ.'}</p>
                      <p>PERSISTED EPOCHS: {selected.fieldHistory?.epochCount ?? 'NOT OBSERVED'} · DATED EPOCHS IN THIS READING: {knowledgeContrast.history.length}.
                        {knowledgeContrast.historySampleBounded?' BOUNDED SAMPLE: earlier records are not fully loaded.':''}</p>
                      <p>READ AT: {knowledgeDate(graph.loadedAt)} · Later observations add a new layer; they never rewrite what was known at an earlier cut-off.</p>
                    </div>
                  </> : <p>TEMPORAL CONTRAST NOT AVAILABLE.</p>}
                </section>

                <section className="rootPassportQuestion">
                  <h3>01 · WHAT DO WE KNOW?</h3>
                  <p>{representedText(selected.attributes.observedOutcome ?? selected.attributes.statement ?? selected.attributes.evidenceKind,'No observation statement represented for this object.')}</p>
                  <p>Documented provenance: {selected.provenance || 'NOT REPRESENTED'}. {selected.lineage.length} lineage references; {qualifiedRelationCount(selected,graph.edges)} evidence-qualified relations. These counts are not evidence of independent confirmation.</p>
                </section>
                <section className="rootPassportQuestion">
                  <h3>02 · WHAT DO WE INFER?</h3>
                  <p>{representedText(selected.attributes.hypothesis ?? selected.attributes.inference ?? selected.attributes.model ?? selected.attributes.objective,'No testable hypothesis or inference represented in this object.')}</p>
                  <p>METHOD · {selected.methodResult?.methodId ?? 'NOT REPRESENTED'} · {selected.methodResult?.epistemicClass ?? 'UNKNOWN'}.</p>
                </section>
                <section className="rootPassportQuestion">
                  <h3>03 · WHAT WAS AUTHORIZED?</h3>
                  <p>Authority: {selected.realityPassport?.authority.state ?? selected.reality?.authority ?? 'UNKNOWN'}.</p>
                  <p>Authority expansion: {representedText(selected.realityPassport?.authority.authorityExpanded,'NOT REPRESENTED')}. Permissions to mint RETURN or promote canon remain governed by their actual contracts.</p>
                </section>
                <section className="rootPassportQuestion">
                  <h3>04 · WHAT WAS EXECUTED?</h3>
                  <p>Recorded execution state: {selected.realityPassport?.authority.executionState ?? selected.reality?.executionState ?? 'NOT OBSERVED'}.</p>
                  <p>An authorized decision or proposed action does not prove execution.</p>
                </section>
                <section className="rootPassportQuestion">
                  <h3>05 · WHAT DID REALITY RETURN?</h3>
                  <p>RETURN status: {selected.realityPassport?.returnState.status ?? 'UNKNOWN'}.</p>
                  <p>Method contrast: {selected.methodResult?.contrastStatus ?? 'NOT REPRESENTED'} · Epochs: {selected.fieldHistory?.epochCount ?? 'NOT OBSERVED'}.</p>
                  <h4>FIELD HISTORY</h4>
                  {selected.fieldHistory?.recentEpochs?.length?<ol className="rootPassportHistory">{selected.fieldHistory.recentEpochs.slice(-5).reverse().map(epoch=><li key={epoch.eventId}><time>{date(epoch.occurredAt)}</time><span>{humanize(epoch.previousState ?? 'UNKNOWN')} → {humanize(epoch.state ?? 'UNKNOWN')}</span></li>)}</ol>:<p>T0 / T1 comparison: NOT ESTABLISHED BY THE AVAILABLE RECORD.</p>}
                </section>
                <section className="rootPassportQuestion">
                  <h3>06 · WHAT WAS LEARNED AND INTEGRATED?</h3>
                  <p>LEARNING · {selected.learningState?.state ?? 'NOT REPRESENTED'}.</p>
                  <p>{selected.learningState?.boundary ?? 'Learning cannot be asserted as integrated without a recorded governed decision.'}</p>
                </section>
                <section className="rootPassportQuestion rootPassportContrast">
                  <h3>HYPOTHESIS / EVIDENCE CONTRAST</h3>
                  <dl>
                    <div><dt>SUPPORTING RELATIONS</dt><dd>{selected.realityPassport?.provenance.supportingRelationCount ?? 'NOT REPRESENTED'}</dd></div>
                    <div><dt>CONTRADICTING RELATIONS</dt><dd>{selected.realityPassport?.provenance.contradictionCount ?? 'NOT REPRESENTED'}</dd></div>
                    <div><dt>INDEPENDENT SOURCES</dt><dd>NOT ESTABLISHED</dd></div>
                    <div><dt>CALIBRATED CONFIDENCE</dt><dd>NOT CALIBRATED</dd></div>
                    <div><dt>VERIFICATION</dt><dd>{selected.realityPassport?.verification.state ?? 'UNKNOWN'}</dd></div>
                    <div><dt>NEXT DISCRIMINATING OBSERVATION</dt><dd>{selected.realityPassport?.verification.nextBestObservation ?? 'NOT REPRESENTED'}</dd></div>
                  </dl>
                  <p>No confidence percentage is inferred from graph degree, citations, agents or relation counts.</p>
                </section>
                <section className="rootPassportQuestion">
                  <h3>RELATIONS · {selectedEdges.length}</h3>
                  <div className="rootPassportRelations">
                    {selectedEdges.length?selectedEdges.slice(0,30).map(edge=>{const outgoing=edge.source===selected.id;const other=nodeById.get(outgoing?edge.target:edge.source);return <button type="button" key={edge.id} onClick={()=>setSelectedId(other?.id??null)}><span>{outgoing?'→':'←'} {humanize(edge.relation)}</span><strong>{other?.label ?? (outgoing?edge.target:edge.source)}</strong><small>{edge.provenance || 'PROVENANCE NOT REPRESENTED'}</small></button>}):<p>NO ADMITTED RELATIONS</p>}
                  </div>
                </section>
                <section className="rootPassportQuestion">
                  <h3>GOVERNED ACTIONS</h3>
                  <p>Actions open existing workspaces. Selecting an object does not authorize execution or change its canonical record.</p>
                  <nav className="rootReferenceActionLinks" aria-label="Governed actions">
                    <a href="/root/evidence-review">REVIEW EVIDENCE ↗</a>
                    <a href="/method-lab">OPEN METHOD LAB ↗</a>
                    <a href="/root?reading=REALITY_CHAIN">RECONSTRUCT REALITY CHAIN ↗</a>
                  </nav>
                </section>
              </>
            ) : <div className="rootPassportWaiting">{requestedNode?<><h2>CASE NOT ADMITTED TO THE COGNITIVE GRAPH</h2><p>This reference does not identify an admitted canonical node. No Reality Passport is fabricated.</p><p><a href={'/reality-chain?case='+encodeURIComponent(requestedNode)}>Inspect the authorized Case Platform record in Reality Chain ↗</a></p></>:<><h2>SELECT AN OBJECT IN THE GRAPH</h2><p>The Reality Passport will appear here. Structural orientation does not manufacture observations or relations.</p></>}<p>{graph.nodes.length} admitted nodes · {graph.edges.length} admitted edges.</p></div>}
            <section className="rootPassportQuestion rootPassportAgents">
              <h3>INSTITUTIONAL AGENTS / RUNTIME REGISTRY</h3>
              <p>Registry read: {agentRegistryState}. These are registered capabilities, not automatically agents assigned to the selected object.</p>
              {agents.length?<div className="rootPassportAgentList">{agents.map(agent=><article key={agent.agentKey}><strong>{agent.name}</strong><span>{agent.entityKind} · {agent.status} · {agent.lifecycleState}</span><p>{agent.capability}</p><small>{agent.permissions} · LAST RUN: {agent.lastRunAt ?? 'NOT OBSERVED'}</small></article>)}</div>:<p>AGENT REGISTRY NOT AVAILABLE OR NO REGISTERED RECORDS OBSERVED.</p>}
            </section>
            <details className="rootPassportGovernance" open={Boolean(searchParams.get('decision'))}>
              <summary>GOVERNED DECISIONS / AUTHORIZATION</summary>
              <SfiRootWorkspace enabled decisionOnly/>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}

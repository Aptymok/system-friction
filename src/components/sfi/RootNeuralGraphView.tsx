'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SfiRootWorkspace } from './SfiRootWorkspace';
import { RootCognitiveFieldPixi } from './RootCognitiveFieldPixi';
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

type RegisteredAgent={key:string;name:string;kind:string;status:string;permissions:string;capability:string};
const FIELD_GROUPS=['GOVERNANCE','CASES & PROJECTS','INSTITUTIONAL ATTRACTOR','EXTERNAL REALITY','AUTHORITY BOUNDARY','PROJECTIONS','UNCLASSIFIED'] as const;
type FieldGroup=typeof FIELD_GROUPS[number];
function fieldGroup(node:GraphNode):FieldGroup {
  const type=node.type.toLowerCase();
  const a=node.attributes;
  const semantic=[type,String(a.category??''),String(a.classification??''),String(a.domain??'')].join(' ').toLowerCase();
  if(/authority|constraint|permission|authorization|boundary/.test(semantic))return 'AUTHORITY BOUNDARY';
  if(/projection|scenario|forecast|simulation/.test(semantic))return 'PROJECTIONS';
  if(/governance|policy|mandate|regulation|approval|decision/.test(semantic))return 'GOVERNANCE';
  if(/attractor|institutional.objective|institutional.goal/.test(semantic))return 'INSTITUTIONAL ATTRACTOR';
  if(/case|project|investigation|research/.test(semantic))return 'CASES & PROJECTS';
  if(/actor|source|external|phenomenon|world|location|event|signal/.test(semantic))return 'EXTERNAL REALITY';
  return 'UNCLASSIFIED';
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
  if (type.includes('return') || type.includes('outcome')) return '#7B9B82';
  if (type.includes('learning')) return '#9D7CAC';
  if (type.includes('hypothesis')) return '#C8A951';
  if (type.includes('evidence') || /OBSERVED/.test(epistemic)) return '#4A7AAA';
  if (type.includes('case')) return '#B85050';
  if (type.includes('twin') || type.includes('method')) return '#8D9A9E';
  if (/DECLARED/.test(epistemic)) return '#C8A951';
  if (/HYPOTHESIZED|SIMULATED/.test(epistemic)) return '#9D7CAC';
  return '#7D756A';
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

const observedText=(value:unknown):string=>value===null||value===undefined||value===''?'NOT RECORDED':typeof value==='string'||typeof value==='number'?String(value):'NOT RECORDED';
const attribute=(node:GraphNode,keys:string[]):string=>{for(const key of keys){const v=node.attributes[key];if(typeof v==='string'&&v.trim())return v;if(typeof v==='number')return String(v);}return 'NOT RECORDED';};
const isSpine=(node:GraphNode)=>/^(system|canonical|ontology|spine|root)$/i.test(node.type)||/cognitive[_ -]?spine|system[_ -]?backbone/i.test(node.type);

export function RootNeuralGraphView({ graph }: { graph: GraphPayload }) {
  const searchParams=useSearchParams();
  const requestedReading=searchParams.get('reading');
  const allowedReadings=['CURRENT_STATE','HIERARCHY','TRAJECTORY','RETROLONGITUDINAL','PROJECTION','FRICTION_REGIME','REALITY_CHAIN','RETURN_CONTRAST'] as const;
  const initialReading=(allowedReadings as readonly string[]).includes(requestedReading||'') ? requestedReading as typeof allowedReadings[number] : 'CURRENT_STATE';
  const [query, setQuery] = useState('');
  const [consoleTab,setConsoleTab]=useState<'PASSPORT'|'AUTHORITY'|'JR'|'TRAJECTORY'|'LEARNING'|'ACTIONS'|'AGENTS'>('PASSPORT');
  const [agentId,setAgentId]=useState('');
  const [agentCatalog,setAgentCatalog]=useState<RegisteredAgent[]>([]);
  const [agentCatalogState,setAgentCatalogState]=useState<'LOADING'|'AVAILABLE'|'UNAVAILABLE'>('LOADING');
  const [activeGroup,setActiveGroup]=useState<FieldGroup|'ALL'>('ALL');
  const [authorityFilter,setAuthorityFilter]=useState('ALL');
  const [evidenceFilter,setEvidenceFilter]=useState('ALL');
  useEffect(()=>{let alive=true;fetch('/api/root/agent-catalog',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('unavailable');return r.json();}).then((result:{items:RegisteredAgent[]})=>{if(alive){setAgentCatalog(result.items);setAgentCatalogState('AVAILABLE');}}).catch(()=>{if(alive)setAgentCatalogState('UNAVAILABLE');});return()=>{alive=false};},[]);
  const [activeType, setActiveType] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reading, setReading] = useState<'CURRENT_STATE'|'HIERARCHY'|'TRAJECTORY'|'RETROLONGITUDINAL'|'PROJECTION'|'FRICTION_REGIME'|'REALITY_CHAIN'|'RETURN_CONTRAST'>(initialReading);
  const [temporalResolution, setTemporalResolution] = useState('ALL');
  const [focusId,setFocusId]=useState<string|null>(null);
  const horizontalRailRef=useRef<HTMLDivElement|null>(null);
  const openHorizon=(horizon:0|1)=>horizontalRailRef.current?.scrollTo({left:horizontalRailRef.current.clientWidth*horizon,behavior:'smooth'});

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
      if (activeGroup !== 'ALL' && fieldGroup(node)!==activeGroup) return false;
      if (authorityFilter!=='ALL' && String(node.realityPassport?.authority.state??node.reality?.authority??'UNKNOWN').toUpperCase()!==authorityFilter) return false;
      if (evidenceFilter==='EVIDENCE_BOUND' && qualifiedRelationCount(node,graph.edges)===0)return false;
      if (evidenceFilter==='NOT_REPRESENTED' && qualifiedRelationCount(node,graph.edges)>0)return false;
      if (temporalResolution !== 'ALL' && !node.scientificReading?.temporal.availableResolutions.includes(temporalResolution)) return false;
      if (!needle) return true;
      return [node.label, node.type, node.origin, node.provenance, ...node.lineage]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [activeType,activeGroup,authorityFilter,evidenceFilter,graph.nodes,graph.edges,query,temporalResolution,focusIds]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [graph.edges, visibleNodeIds],
  );

  const topology = useMemo(() => buildPositions(graph.nodes, reading), [graph.nodes, reading]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
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
    <main className="neuralGraphShell rootFieldMode" data-neural-graph-contract="SFI-ROOT-NEURAL-GRAPH-1.1">
      <div className="rootFieldIdentity">
        <strong>ROOT · GLOBAL COGNITIVE FIELD OF REALITY</strong>
        <span>NOTHING ACTS ALONE. REALITY ANSWERS BACK.</span>
        <span>{date(graph.loadedAt)}</span>
      </div>

      <nav className="rootHorizonNavigation" aria-label="ROOT operational horizons"><button type="button" onClick={()=>openHorizon(0)}>01 · NEURAL GRAPH</button><button type="button" onClick={()=>openHorizon(1)}>02 · GOVERNANCE CONSOLE</button></nav>
      <div className="rootHorizontalRail" ref={horizontalRailRef} aria-label="ROOT operational horizontal workspace">
      <section className="rootFieldStage rootHorizontalGraph" data-hub-open={selected?'true':undefined} aria-label="Canonical cognitive field">
        <RootCognitiveFieldPixi nodes={fieldNodes} edges={fieldEdges} width={topology.width} height={topology.height} onSelect={(id)=>{setSelectedId(id);setConsoleTab('PASSPORT');openHorizon(1);}}/>
        <aside className="rootFieldExplorer" aria-label="Cognitive field explorer">
          <h2>ROOT</h2><p>GLOBAL COGNITIVE FIELD OF REALITY</p>
          <strong>{visibleNodes.length} VISIBLE OBJECTS · {visibleEdges.length} RELATIONS</strong>
          <div className="rootFieldExplorerCategories">
            <button type="button" aria-pressed={activeGroup==='ALL'} onClick={()=>setActiveGroup('ALL')}>ALL CATEGORIES <span>{graph.nodes.length}</span></button>
            {FIELD_GROUPS.map(group=><button type="button" key={group} aria-pressed={activeGroup===group} onClick={()=>setActiveGroup(group)}>{group}<span>{graph.nodes.filter(n=>fieldGroup(n)===group).length}</span></button>)}
          </div>
          <details open><summary>FILTERS</summary>
            <label>SEARCH<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search objects and sources"/></label>
            <label>NODE TYPE<select value={activeType} onChange={event=>setActiveType(event.target.value)}><option value="ALL">ALL TYPES</option>{allTypes.map(type=><option key={type} value={type}>{humanize(type)}</option>)}</select></label>
            <label>AUTHORITY<select value={authorityFilter} onChange={event=>setAuthorityFilter(event.target.value)}>{['ALL','UNKNOWN','AUTHORIZED','BLOCKED','CONDITIONAL'].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <label>EVIDENCE<select value={evidenceFilter} onChange={event=>setEvidenceFilter(event.target.value)}><option value="ALL">ALL</option><option value="EVIDENCE_BOUND">EVIDENCE-QUALIFIED RELATION</option><option value="NOT_REPRESENTED">NO QUALIFIED RELATION REPRESENTED</option></select></label>
            <label>FIELD READING<select value={reading} onChange={event=>setReading(event.target.value as typeof reading)}>{allowedReadings.map(mode=><option key={mode} value={mode}>{mode.replaceAll('_',' ')}</option>)}</select></label>
            <label>TEMPORAL BASIS<select value={temporalResolution} onChange={event=>setTemporalResolution(event.target.value)}>{['ALL','SYSTEM_HISTORY','REGIME','PHENOMENON','CYCLE','TRANSITION','EVENT','OBSERVATION'].map(level=><option key={level} value={level}>{level.replaceAll('_',' ')}</option>)}</select></label>
            <button type="button" onClick={()=>{setActiveGroup('ALL');setActiveType('ALL');setAuthorityFilter('ALL');setEvidenceFilter('ALL');setQuery('');setTemporalResolution('ALL');setFocusId(null);}}>CLEAR FILTERS</button>
          </details>
        </aside>
        <div className="rootFieldLegend">
          <span>{reading.replaceAll('_',' ')}</span>
          <span>{visibleNodes.length} cognitive · {visibleEdges.length} relations</span>
          {graph.admission.excludedNodes ? <span>{graph.admission.excludedNodes} documentary source objects outside cognitive admission</span> : null}
        </div>
        {!visibleNodes.length ? <div className="rootFieldEmpty">Canonical source observed. No objects currently satisfy cognitive admission.</div> : null}


      </section>

      <section className="rootGovernanceConsole" aria-label="ROOT governed operational console">
        <header className="rootGovernanceHead"><span>ROOT / GOVERNANCE CONSOLE</span><h1>{selected?.label??'Select an object in the graph'}</h1><p>Only represented records are shown. Missing information is not authorization or an observed result.</p></header>
        <nav className="rootGovernanceTabs" aria-label="Object instruments">
          {(['PASSPORT','AUTHORITY','JR','TRAJECTORY','LEARNING','ACTIONS','AGENTS'] as const).map(tab=><button type="button" key={tab} aria-current={consoleTab===tab?'page':undefined} onClick={()=>setConsoleTab(tab)}>{({PASSPORT:'PASSPORT',AUTHORITY:'AUTHORITY',JR:'JR LOGBOOK',TRAJECTORY:'TRAJECTORIES',LEARNING:'LEARNING',ACTIONS:'ACTIONS',AGENTS:'AGENTS'} as const)[tab]}</button>)}
        </nav>
        {selected&& !isSpine(selected)&&consoleTab==='PASSPORT'?<div className="rootRealityQuestions">
          <header><h2>PASSPORT DE LA REALIDAD</h2><p>Object: {selected.label} · {humanize(selected.type)} · state {observedText(selected.reality?.state)}</p></header>
          <article><b>01 · What do we know and observe?</b><p>{observedText(selected.attributes.statement??selected.attributes.observedOutcome??selected.attributes.objective??selected.attributes.scope)}</p><small>Source: {observedText(selected.provenance)} · As of: {observedText(selected.realityPassport?.temporal.captureTime??selected.reality?.captureTime)}</small></article>
          <article><b>02 · What was inferred, and by whom?</b><p>{observedText(selected.attributes.inference??selected.attributes.hypothesis??selected.attributes.analysis)}</p><small>Model: {attribute(selected,['model','modelId','provider'])} · Agent: {attribute(selected,['agentId','agentName'])} · Account/user: {attribute(selected,['accountId','userId','createdBy'])} · Duration: {attribute(selected,['durationMs','executionDuration'])}</small></article>
          <article><b>03 · What was authorized, by whom?</b><p>Autoridad: {observedText(selected.realityPassport?.authority.state??selected.reality?.authority)}</p><small>Who: {attribute(selected,['authorizedBy','approverId'])} · When: {attribute(selected,['authorizedAt','approvalTime'])} · Scope: {attribute(selected,['authorizedScope','scope'])}</small></article>
          <article><b>04 · What was executed and what resulted?</b><p>Execution state: {observedText(selected.realityPassport?.authority.executionState??selected.reality?.executionState)}</p><small>Executor: {attribute(selected,['executedBy','executorId'])} · Date: {attribute(selected,['executedAt','executionTime'])} · Result: {attribute(selected,['executionResult','result'])}</small></article>
          <article><b>05 · What did reality return? What changed? </b><p>RETURN: {observedText(selected.realityPassport?.returnState.status)} · Contraste: {observedText(selected.methodResult?.contrastStatus)}</p><small>Before: {observedText(selected.fieldHistory?.firstObservedAt)} · Latest cutoff: {observedText(selected.fieldHistory?.lastObservedAt)} · After: {observedText(selected.realityPassport?.returnState.observed??selected.reality?.observedReturn)}</small></article>
          <article><b>06 · What was learned and who approved integration?</b><p>Learning: {observedText(selected.learningState?.state)}</p><small>Basis: {observedText(selected.learningState?.classification)} · Integration approved by: {attribute(selected,['learningApprovedBy','promotedBy'])} · Promotion evidence: {observedText(selected.learningState?.candidateEventId)}</small></article>
          <footer><span>Evidence independence is not established by counting relations. An action response alone is not an observed RETURN.</span></footer>
        </div>:null}
        {selected&&isSpine(selected)&&consoleTab==='PASSPORT'?<section className="rootGovernancePanel"><h2>OBJETO ESTRUCTURAL</h2><p>Este nodo pertenece a la columna vertebral del sistema. No se le atribuye un pasaporte de decisión artificial.</p></section>:null}
        {!selected?<section className="rootGovernancePanel"><h2>SELECCIONE UN NODO</h2><p>Abra un objeto real en el Neural Graph para consultar su cadena, responsabilidades, historia y resultados.</p><button type="button" onClick={()=>openHorizon(0)}>IR AL GRAFO</button></section>:null}
        {consoleTab==='AUTHORITY'?<section className="rootGovernancePanel"><h2>AUTHORITY Y LÍMITES</h2><p>Estado: {observedText(selected?.realityPassport?.authority.state)} · Decisión: {observedText(selected?.realityPassport?.decision)}</p><p>Who: {selected?attribute(selected,['authorizedBy','approverId']):'NOT RECORDED'} · Autorización externa no inferida.</p></section>:null}
        {consoleTab==='JR'?<section className="rootGovernancePanel"><h2>BITÁCORA TEMPORAL</h2>{selected?.fieldHistory?.recentEpochs?.length?selected.fieldHistory.recentEpochs.map(epoch=><div className="rootGovernanceLog" key={epoch.eventId}><time>{date(epoch.occurredAt)}</time><span>{observedText(epoch.state)}</span><small>{observedText(epoch.censoring)}</small></div>):<p>NOT OBSERVED: no hay épocas persistidas representadas para este nodo.</p>}</section>:null}
        {consoleTab==='TRAJECTORY'?<section className="rootGovernancePanel"><h2>TRAJECTORIES</h2><p>{selected?.fieldHistory?.persistedHistory?`Épocas persistidas: ${selected.fieldHistory.epochCount}. Última observación: ${observedText(selected.fieldHistory.lastObservedAt)}.`:'No hay una trayectoria persistida representada.'}</p><button type="button" onClick={()=>setReading('TRAJECTORY')}>VER LECTURA DE TRAYECTORIA</button></section>:null}
        {consoleTab==='LEARNING'?<section className="rootGovernancePanel"><h2>CONTRASTE Y LEARNING</h2><p>Contraste: {observedText(selected?.methodResult?.contrastStatus)} · Learning: {observedText(selected?.learningState?.state)}</p><p>Simulación, inferencia y observación conservan su clasificación original.</p></section>:null}
        {consoleTab==='ACTIONS'?<section className="rootGovernancePanel"><h2>ACTIONS SOBRE UNA INSTANCIA</h2><p>Estas entradas abren instrumentos ya existentes. No ejecutan ni alteran el nodo original.</p>{selected?<><a href={`/root?reading=REALITY_CHAIN&node=${encodeURIComponent(selected.id)}`}>RECONSTRUIR REALITY CHAIN</a><a href={`/method-lab?sourceNode=${encodeURIComponent(selected.id)}`}>ABRIR EN METHOD LAB (CONTEXTO PROPUESTO)</a><button type="button" onClick={()=>setConsoleTab('AGENTS')}>ELEGIR AGENTE</button></>:<p>Seleccione un nodo para continuar.</p>}</section>:null}
        {consoleTab==='AGENTS'?<section className="rootGovernancePanel"><h2>INSTITUTIONAL AGENT CATALOG</h2><p>The code registry is not evidence of runtime health, account identity, execution or authority. Available agents are distinguished from services and observers.</p>{agentCatalogState==='AVAILABLE'?<><select aria-label="Select registered agent" value={agentId} onChange={event=>setAgentId(event.target.value)}><option value="">SELECT REGISTERED AGENT</option>{agentCatalog.map(agent=><option key={agent.key} value={agent.key}>{agent.name} · {agent.kind.toUpperCase()}</option>)}</select>{agentId&&agentCatalog.find(a=>a.key===agentId)?<><p>{agentCatalog.find(a=>a.key===agentId)?.capability}</p><dl><div><dt>ENTITY KIND</dt><dd>{agentCatalog.find(a=>a.key===agentId)?.kind}</dd></div><div><dt>DECLARED PERMISSION</dt><dd>{agentCatalog.find(a=>a.key===agentId)?.permissions}</dd></div><div><dt>RUNTIME STATUS</dt><dd>NOT VERIFIED</dd></div><div><dt>CASE EXECUTIONS</dt><dd>NOT LINKED BY THIS CATALOG</dd></div></dl></>:null}</>:<p>{agentCatalogState==='LOADING'?'LOADING CATALOG':'CATALOG UNAVAILABLE'}</p>}</section>:null}
        <details className="rootFieldAuthority rootGovernanceAuthority" open={Boolean(searchParams.get('decision'))}>
        <summary>AUTHORITY</summary>
        <SfiRootWorkspace enabled decisionOnly/>
        </details>
        <nav className="rootGovernanceLinks" aria-label="Institutional operating destinations"><a href="/root?reading=REALITY_CHAIN">REALITY CHAIN</a><a href="/root?reading=RETURN_CONTRAST">RETURN CONTRAST</a><a href="/root?reading=RETROLONGITUDINAL">FIELD HISTORY</a></nav>
      </section>
      </div>
    </main>
  );}

'use client';

import { useMemo, useState } from 'react';
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

export function RootNeuralGraphView({ graph }: { graph: GraphPayload }) {
  const searchParams=useSearchParams();
  const requestedReading=searchParams.get('reading');
  const allowedReadings=['CURRENT_STATE','HIERARCHY','TRAJECTORY','RETROLONGITUDINAL','PROJECTION','FRICTION_REGIME','REALITY_CHAIN','RETURN_CONTRAST'] as const;
  const initialReading=(allowedReadings as readonly string[]).includes(requestedReading||'') ? requestedReading as typeof allowedReadings[number] : 'CURRENT_STATE';
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      if (temporalResolution !== 'ALL' && !node.scientificReading?.temporal.availableResolutions.includes(temporalResolution)) return false;
      if (!needle) return true;
      return [node.label, node.type, node.origin, node.provenance, ...node.lineage]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [activeType, graph.nodes, query, temporalResolution,focusIds]);

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
    <main className="neuralGraphShell rootFieldMode rootReferenceCockpit" data-root-layout="REFERENCE-SIMULTANEOUS-20261008" data-neural-graph-contract="SFI-ROOT-NEURAL-GRAPH-1.1">
      <div className="rootFieldIdentity">
        <strong>ROOT · GLOBAL COGNITIVE FIELD OF REALITY</strong>
        <span>NOTHING ACTS ALONE. REALITY ANSWERS BACK.</span>
        <span>{date(graph.loadedAt)}</span>
      </div>

      <div className="rootHorizontalRail" aria-label="Simultaneous ROOT cognitive field and governed console">
       <aside className="rootReferenceSidebar" aria-label="Cognitive field filters">
         <div className="rootReferenceSidebarTitle"><strong>ROOT</strong><span>GLOBAL COGNITIVE FIELD OF REALITY</span></div>
         <div className="rootReferenceSource" data-state={graph.sourceState}><i/><span>{graph.sourceState.toUpperCase()} · {graph.readPlane}<small>{graph.nodes.length} admitted objects · {graph.edges.length} relations</small></span></div>
         <label className="rootReferenceSearchLabel" htmlFor="root-reference-search">SEARCH THE FIELD</label>
         <input className="rootReferenceSearch" id="root-reference-search" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Cases, evidence, methods…" aria-label="Search canonical cognitive objects"/>
         <div className="rootReferenceSidebarKicker">REPRESENTED CATEGORIES</div>
         <nav className="rootReferenceFilters" aria-label="Filter node types">
           <button type="button" aria-pressed={activeType==='ALL'} onClick={()=>setActiveType('ALL')}><span>ALL NODES</span><b>{graph.nodes.length}</b></button>
           {allTypes.map(type=><button type="button" key={type} aria-pressed={activeType===type} onClick={()=>setActiveType(activeType===type?'ALL':type)}><span>{humanize(type)}</span><b>{graph.nodes.filter(node=>node.type===type).length}</b></button>)}
         </nav>
         <p className="rootReferenceSidebarNote">These are admitted graph objects, not the institution’s complete inventory. Unobserved states remain explicit.</p>
         <a className="rootReferenceSidebarLink" href="/root/evidence-review">REVIEW EVIDENCE ↗</a>
       </aside>
      <section className="rootFieldStage rootHorizontalGraph" data-hub-open={selected?'true':undefined} aria-label="Canonical cognitive field">
        <div className="rootReferenceModes" aria-label="Graph perspective">
         {([['FIELD','CURRENT_STATE'],['TRAJECTORIES','TRAJECTORY'],['HIERARCHY','HIERARCHY'],['CONTRAST','RETURN_CONTRAST']] as const).map(([label,mode])=><button type="button" key={mode} aria-pressed={reading===mode} onClick={()=>setReading(mode)}>{label}</button>)}
        </div>
        <div className="rootReferenceCategoryLegend" aria-label="Admitted cognitive types">
         {allTypes.slice(0,4).map(type=><div key={type}><i/><span>{humanize(type)}<small>{graph.nodes.filter(node=>node.type===type).length} nodes</small></span></div>)}
        </div>
        <RootCognitiveFieldPixi nodes={fieldNodes} edges={fieldEdges} width={topology.width} height={topology.height} onSelect={(id)=>{setSelectedId(id);}}/>
        <div className="rootFieldControls">
          <select aria-label="Field reading" value={reading} onChange={(event)=>setReading(event.target.value as typeof reading)}>
            {allowedReadings.map((mode)=><option key={mode} value={mode}>{mode.replaceAll('_',' ')}</option>)}
          </select>
          <select aria-label="Temporal resolution" value={temporalResolution} onChange={(event)=>setTemporalResolution(event.target.value)}>
            {['ALL','SYSTEM_HISTORY','REGIME','PHENOMENON','CYCLE','TRANSITION','EVENT','OBSERVATION'].map((level)=><option key={level} value={level}>{level.replaceAll('_',' ')}</option>)}
          </select>
          <span className="rootReferenceReadPlane">{graph.sourceState.toUpperCase()} · {graph.readPlane}</span>
          {selectedId?<button type="button" onClick={()=>setFocusId(focusId===selectedId?null:selectedId)}>{focusId===selectedId?'EXIT NODE':'ENTER NODE'}</button>:null}
        </div>
        <div className="rootFieldLegend">
          <span>{reading.replaceAll('_',' ')}</span>
          <span>{visibleNodes.length} cognitive · {visibleEdges.length} relations</span>
          {graph.admission.excludedNodes ? <span>{graph.admission.excludedNodes} documentary source objects outside cognitive admission</span> : null}
        </div>
        {!visibleNodes.length ? <div className="rootFieldEmpty">Canonical source observed. No objects currently satisfy cognitive admission.</div> : null}

        {selected ? (
          <aside className="rootFieldHub">
            <button className="rootFieldHubClose" onClick={()=>setSelectedId(null)} aria-label="Close object hub">×</button>
            <span className="rootFieldHubKicker">{humanize(selected.type)} · {humanize(realityPassportStage(selected))}</span>
            <h2>{selected.label}</h2>
            <p className="rootFieldHubProvenance">{selected.origin} · {selected.provenance}</p>

            <section className="rootFieldHumanSection">
              <span>WHAT IS THIS?</span>
              <p>{String(selected.attributes.statement ?? selected.attributes.observedOutcome ?? selected.attributes.objective ?? selected.attributes.scope ?? selected.attributes.evidenceKind ?? selected.attributes.classification ?? 'A persisted cognitive object in the SFI field. Its meaning is reconstructed through its relations, provenance and temporal state.')}</p>
            </section>

            <section className="rootFieldHumanSection">
              <span>WHAT DOES SFI KNOW?</span>
              <ul>
                <li>Epistemic state: <strong>{humanize(String(selected.reality?.state ?? selected.attributes.epistemicClass ?? 'UNKNOWN'))}</strong></li>
                <li>{selectedEdges.length} represented structural relation{selectedEdges.length===1?'':'s'}; {qualifiedRelationCount(selected,graph.edges)} evidence-qualified.</li>
                <li>Reality Chain position: <strong>{humanize(realityPassportStage(selected))}</strong>.</li>
                {selected.fieldHistory?.epochCount?<li>{selected.fieldHistory.epochCount} persisted field epoch{selected.fieldHistory.epochCount===1?'':'s'} available.</li>:null}
                {selected.realityPassport?.returnState.status==='OBSERVED'?<li>Observed RETURN is represented for this object.</li>:null}
              </ul>
            </section>

            <section className="rootFieldHumanSection">
              <span>WHAT IS STILL UNKNOWN?</span>
              <ul>
                {(!selected.realityPassport?.authority.state||selected.realityPassport.authority.state==='UNKNOWN')?<li>Institutional authority is not sufficiently represented.</li>:null}
                {(!selected.realityPassport?.verification.state||selected.realityPassport.verification.state==='UNKNOWN')?<li>Verification state remains unknown.</li>:null}
                {selected.realityPassport?.returnState.status!=='OBSERVED'?<li>Observed RETURN has not been represented.</li>:null}
                {!selected.fieldHistory?.persistedHistory?<li>Longitudinal history is incomplete or not yet persisted.</li>:null}
                {selected.realityPassport?.verification.nextBestObservation?<li>Next discriminating observation: {selected.realityPassport.verification.nextBestObservation}</li>:null}
              </ul>
            </section>

            <section className="rootFieldHumanSection">
              <span>WHY IS THIS CONNECTED?</span>
              {selectedEdges.length?<div className="rootFieldRelations">
                {selectedEdges.slice(0,8).map((edge)=>{const outbound=edge.source===selected.id;const other=nodeById.get(outbound?edge.target:edge.source);return <button key={edge.id} onClick={()=>setSelectedId(other?.id??null)}><small>{outbound?'→':'←'} {humanize(edge.relation)}</small><strong>{other?.label??(outbound?edge.target:edge.source)}</strong><em>{edge.origin==='operational_projection' ? humanize(edge.provenance) : `RELATION · ${edge.weight.toFixed(3)}`}</em></button>;})}
              </div>:<p>No represented relation is currently available for this object.</p>}
            </section>

            <section className="rootFieldHumanSection">
              <span>WHAT CAN I DO NEXT?</span>
              <div className="rootFieldActions">
                <button type="button" onClick={()=>setFocusId(focusId===selected.id?null:selected.id)}>{focusId===selected.id?'EXIT CONNECTION FIELD':'EXPLORE CONNECTIONS'}</button>
                <a href="/root/evidence-review">SEE EVIDENCE</a>
                <a href="/root?reading=REALITY_CHAIN">RECONSTRUCT REALITY CHAIN</a>
                <a href="/root?reading=RETURN_CONTRAST">VIEW RETURN / CONTRAST</a>
              </div>
            </section>

            {selected.fieldHistory?.recentEpochs?.length ? <section className="rootFieldHumanSection rootFieldJrLog"><span>JR / FIELD LOGBOOK · FIELD HISTORY</span>
              {selected.fieldHistory.recentEpochs.slice(0,6).map((epoch)=><div key={epoch.eventId}><time>{date(epoch.occurredAt)}</time><strong>{humanize(epoch.previousState ?? 'UNKNOWN')} → {humanize(epoch.state ?? 'UNKNOWN')}</strong><small>{epoch.relationTransitions.length} relation transition{epoch.relationTransitions.length===1?'':'s'}</small></div>)}
            </section>:null}

            {selected.learningState ? <section className="rootFieldHumanSection"><span>LEARNING</span><p>LEARNING · {humanize(selected.learningState.state)} · {humanize(selected.learningState.classification ?? 'UNCLASSIFIED')}</p></section> : null}

            {selected.methodResult ? <section className="rootFieldHumanSection"><span>METHOD RESULT</span><p>METHOD · {selected.methodResult.methodId}@{selected.methodResult.methodVersion} · {humanize(selected.methodResult.epistemicClass)}</p></section> : null}

            <details className="rootFieldTechnical">
              <summary>TECHNICAL DETAILS</summary>
              <div className="rootFieldHubGrid">
                <span>STATE<strong>{selected.reality?.state ?? String(selected.attributes.epistemicClass ?? 'UNKNOWN')}</strong></span>
                <span>REALITY DECISION<strong>{selected.realityPassport?.decision ?? 'UNKNOWN'}</strong></span>
                <span>TIME<strong>{temporalReading(selected).label}</strong></span>
                <span>AUTHORITY<strong>{selected.realityPassport?.authority.state ?? selected.reality?.authority ?? 'UNKNOWN'}</strong></span>
                <span>VERIFICATION<strong>{selected.realityPassport?.verification.state ?? selected.reality?.verificationState ?? 'UNKNOWN'}</strong></span>
                <span>RETURN<strong>{selected.realityPassport?.returnState.status ?? (selected.reality?.observedReturn == null ? 'NOT OBSERVED' : 'OBSERVED')}</strong></span>
                <span>STRUCTURAL LINKS<strong>{selectedEdges.length}</strong></span>
                <span>QUALIFIED RELATIONS<strong>{qualifiedRelationCount(selected,graph.edges)}</strong></span>
                <span>PERSISTED EPOCHS<strong>{selected.fieldHistory?.epochCount ?? 0}</strong></span>
                <span>HISTORY RANGE<strong>{selected.fieldHistory?.firstObservedAt ? `${date(selected.fieldHistory.firstObservedAt)} → ${date(selected.fieldHistory.lastObservedAt)}` : 'NOT YET PERSISTED'}</strong></span>
                <span>LOCAL DYNAMICAL ATTRACTOR<strong>{selected.scientificReading?.attractor.state ?? 'NOT ESTABLISHED'}</strong></span>
                <span>METHOD<strong>{selected.methodResult ? `${selected.methodResult.methodId}@${selected.methodResult.methodVersion}` : 'NOT REPRESENTED'}</strong></span>
              </div>
              {selected.realityPassport?<div className="rootFieldTechnicalPassport">
                <code>SUPPORTING_RELATIONS={selected.realityPassport.provenance.supportingRelationCount}</code>
                <code>CONTRADICTIONS={selected.realityPassport.provenance.contradictionCount}</code>
                <code>LINEAGE={selected.realityPassport.provenance.lineageCount}</code>
                <code>CAPTURE={selected.realityPassport.temporal.captureTime ?? selected.realityPassport.temporal.nodeUpdatedAt ?? 'NOT_REPRESENTED'}</code>
                <code>SOURCE_VERSION={selected.realityPassport.temporal.sourceVersion ?? 'NOT_REPRESENTED'}</code>
                <code>MAY_MINT_RETURN={String(selected.realityPassport.authority.mayMintReturn ?? 'NOT_REPRESENTED')}</code>
                <code>MAY_PROMOTE_CANON={String(selected.realityPassport.authority.mayPromoteCanon ?? 'NOT_REPRESENTED')}</code>
              </div>:null}
              {selected.lineage.length?<div className="rootFieldTechnicalPassport">{selected.lineage.map((item)=><code key={item}>{item}</code>)}</div>:null}
            </details>
          </aside>
        ):null}
      </section>

      <section className="rootGovernanceConsole" aria-label="ROOT governed operational console">
        <nav className="rootReferenceConsoleTabs" aria-label="Operational console sections">
          <a href="#root-panel-summary">SUMMARY</a><a href="#root-panel-authority">AUTHORITY</a><a href="#root-panel-logbook">JR LOGBOOK</a><a href="#root-panel-trajectories">TRAJECTORIES</a><a href="#root-panel-learning">LEARNING</a><a href="#root-panel-actions">ACTIONS</a>
        </nav>
        <header className="rootGovernanceHead"><span>ROOT / GOVERNED OPERATION</span><h1>From relations to decisions.</h1><p>Evidence, authority and RETURN remain separate. This console reports only what the current institutional records support.</p></header>
        <div className="rootGovernanceMetrics"><article><span>COGNITIVE OBJECTS</span><strong>{graph.nodes.length}</strong><small>{graph.sourceState.toUpperCase()} · {graph.readPlane}</small></article><article><span>ADMITTED RELATIONS</span><strong>{graph.edges.length}</strong><small>{graph.admission.excludedEdges} excluded</small></article><article><span>SELECTED OBJECT</span><strong>{selected ? selected.label : 'NONE'}</strong><small>{selected?.realityPassport?.decision ?? 'SELECT A NODE IN THE GRAPH'}</small></article><article><span>OBSERVED RETURN</span><strong>{selected?.realityPassport?.returnState.status ?? 'NOT SELECTED'}</strong><small>Reported from existing case provenance</small></article></div>
        <div className="rootGovernanceMatrix"><section id="root-panel-summary" className="rootGovernancePanel"><h2>SUMMARY / REALITY PASSPORT</h2>{selected?<><strong>{selected.label}</strong><p>{selected.realityPassport?.boundary ?? 'No canonical Reality Passport is represented for this object.'}</p><dl><div><dt>OBSERVATION</dt><dd>{selected.reality?.state ?? 'UNKNOWN'}</dd></div><div><dt>EVIDENCE</dt><dd>{selected.realityPassport?.provenance.supportingRelationCount ?? 'NOT REPRESENTED'} supporting relations; independence not established</dd></div><div><dt>INFERENCE / DECISION</dt><dd>{selected.realityPassport?.decision ?? 'UNKNOWN'}</dd></div><div><dt>AUTHORITY</dt><dd>{selected.realityPassport?.authority.state ?? 'UNKNOWN'}</dd></div><div><dt>EXECUTION</dt><dd>{selected.realityPassport?.authority.executionState ?? 'UNKNOWN'}</dd></div><div><dt>RETURN</dt><dd>{selected.realityPassport?.returnState.status ?? 'NOT OBSERVED'}</dd></div></dl></>:<p>Select an actual node in the cognitive field to inspect its evidence, authority, time and RETURN.</p>}</section><section id="root-panel-trajectories" className="rootGovernancePanel"><h2>TRAJECTORIES / TEMPORAL FIELD</h2><p>Use the existing field reading selector to inspect trajectory, retrolongitudinal states, projections, friction regimes and contrast.</p><strong>{reading.replaceAll('_',' ')}</strong><p>{selected?.fieldHistory?.persistedHistory ? `${selected.fieldHistory.epochCount} persisted epochs · ${date(selected.fieldHistory.lastObservedAt)}` : 'Historical reconstruction not established for the selected object.'}</p><button type="button" onClick={()=>setReading('TRAJECTORY')}>EXPLORE TRAJECTORY</button><button type="button" onClick={()=>setReading('RETURN_CONTRAST')}>RETURN / CONTRAST</button></section><section id="root-panel-logbook" className="rootGovernancePanel"><h2>JR / FIELD LOGBOOK</h2><p>Visible history is limited to events actually represented by the selected object. Learning states do not certify empirical results.</p>{selected?.fieldHistory?.recentEpochs?.length ? selected.fieldHistory.recentEpochs.slice(-5).reverse().map(epoch=><div className="rootGovernanceLog" key={epoch.eventId}><time>{date(epoch.occurredAt)}</time><span>{epoch.state ?? 'UNKNOWN'}</span><small>{epoch.censoring}</small></div>):<p>NOT OBSERVED · Select a node with persisted field history.</p>}<p>LEARNING · {selected?.learningState?.state ?? 'NOT REPRESENTED'}</p></section><section id="root-panel-learning" className="rootGovernancePanel"><h2>LEARNING / CONTRAST / RETURN</h2><p>Method Lab findings and scientific interpretation retain their declared epistemic class.</p><dl><div><dt>METHOD</dt><dd>{selected?.methodResult?.methodId ?? 'NOT REPRESENTED'}</dd></div><div><dt>RESULT CLASS</dt><dd>{selected?.methodResult?.epistemicClass ?? 'UNKNOWN'}</dd></div><div><dt>CONTRAST</dt><dd>{selected?.methodResult?.contrastStatus ?? 'NOT REPRESENTED'}</dd></div><div><dt>LEARNING</dt><dd>{selected?.learningState?.state ?? 'NOT REPRESENTED'}</dd></div></dl></section><section id="root-panel-authority" className="rootGovernancePanel"><h2>AUTHORITY / AUTHORIZATION</h2><dl>
 <div><dt>AUTHORITY</dt><dd>{selected?.realityPassport?.authority.state ?? 'UNKNOWN'}</dd></div>
 <div><dt>EXECUTION</dt><dd>{selected?.realityPassport?.authority.executionState ?? 'UNKNOWN'}</dd></div>
 <div><dt>RETURN</dt><dd>{selected?.realityPassport?.returnState.status ?? 'NOT OBSERVED'}</dd></div>
 </dl><a className="rootReferencePanelLink" href="#root-governed-actions">VIEW GOVERNED DECISIONS ↗</a></section>
 <section id="root-panel-actions" className="rootGovernancePanel"><h2>MATERIAL ACTIONS / BOUNDARIES</h2><p>Select an existing governed workspace. This interface does not grant or execute authority.</p>
 <nav className="rootReferenceActionLinks" aria-label="Governed operations">
 <a href="/root/evidence-review">REVIEW EVIDENCE ↗</a>
 <a href="/governance">GOVERNANCE ↗</a>
 <a href="/method-lab">METHOD LAB ↗</a>
 <a href="/root?reading=REALITY_CHAIN">REALITY CHAIN ↗</a>
 </nav></section></div>
        <details id="root-governed-actions" className="rootFieldAuthority rootGovernanceAuthority" open={Boolean(searchParams.get('decision'))}>
        <summary>AUTHORITY</summary>
        <SfiRootWorkspace enabled decisionOnly/>
        </details>
        <nav className="rootGovernanceLinks" aria-label="Institutional operating destinations"><a href="/root?reading=REALITY_CHAIN">REALITY CHAIN</a><a href="/root?reading=RETURN_CONTRAST">RETURN CONTRAST</a><a href="/root?reading=RETROLONGITUDINAL">FIELD HISTORY</a></nav>
      </section>
      </div>
    </main>
  );}

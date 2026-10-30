export type MihmMetricKey = 'ihg' | 'nti' | 'ldi' | 'continuity';

export type MihmRegime = 'stable' | 'watch' | 'critical' | 'unknown';

export type NodeType = 'field' | 'agent' | 'source' | 'interface' | 'integration' | 'security' | 'unknown';

export type CapacityLevel = 'high' | 'medium' | 'low' | 'critical';

export type MihmVector = {
  ihg: number;
  nti: number;
  ldi: number;
  continuity?: number;
  /** @deprecated Compatibility alias. This is not a canonical MIHM Phi. */
  phi?: number;
};

export type SFINode = {
  id: string;
  type: NodeType;
  vector: MihmVector;
  weight?: number;
  qualified?: boolean;
  qualification?: number;
};

export type MihmComputationInput = {
  observedAt: string;
  sourceIds: string[];
  vector: MihmVector;
};

export type MihmComputationResult = {
  regime: MihmRegime;
  vector: MihmVector;
  confidence: number;
  warnings: string[];
  metricContract: {
    id: 'REDUCED_KERNEL_CONTINUITY';
    canonicalPhi: false;
    legacyAlias: 'phi';
  };
};

export type ReducedMihmCampoInput = {
  confidence: number;
  sourceState: 'observed' | 'degraded' | 'missing';
  nodes: Array<{
    type: string;
    weight: number;
    value: number | null;
    nti: number | null;
    simulated: boolean;
  }>;
};

export type ReducedMihmGraphInput = {
  sourceState: 'observed' | 'degraded' | 'missing';
  nodes: unknown[];
  edges: Array<{ weight?: number | null }>;
};

export type ReducedMihmInput = {
  observedAt: string;
  campo: ReducedMihmCampoInput;
  graph: ReducedMihmGraphInput;
};

export type ReducedMihmResult = MihmComputationResult & {
  sourceIds: string[];
  degradation: number;
  operationalCapacity: number;
};

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function continuityValue(vector: MihmVector): number {
  return clamp01(vector.continuity ?? vector.phi ?? vector.ihg * (1 - vector.ldi) * (1 - vector.nti * 0.5));
}

export function qualifyNode(node: SFINode, delta = 0): SFINode {
  const ihg = clamp01(node.vector.ihg);
  const nti = clamp01(node.vector.nti);
  const ldi = clamp01(node.vector.ldi);
  const continuity = continuityValue({ ...node.vector, ihg, nti, ldi });
  const qualification = clamp01((ihg * 0.45) + ((1 - nti) * 0.2) + ((1 - ldi) * 0.25) + (continuity * 0.1) + delta);

  return {
    ...node,
    vector: { ihg, nti, ldi, continuity, phi: continuity },
    qualified: qualification >= 0.5,
    qualification,
  };
}

export function degradeNode(
  node: SFINode,
  alpha: number,
  elapsed: number,
  initialDegradation = 0,
) {
  const pressure = clamp01((node.vector.nti * 0.45) + (node.vector.ldi * 0.45) + ((1 - node.vector.ihg) * 0.1));
  const timeLoad = Math.max(0, elapsed) * Math.max(0, alpha);
  return clamp01(initialDegradation + pressure * timeLoad);
}

export function operationalCapacity(
  node: SFINode,
  degradation: number,
  weightIn: number,
  weightOut: number,
) {
  const qualified = qualifyNode(node);
  const flowBalance = clamp01((Math.max(0, weightIn) + Math.max(0, weightOut)) / 2);
  const continuity = continuityValue(qualified.vector);
  const integrity = clamp01((qualified.vector.ihg * 0.4) + ((1 - qualified.vector.nti) * 0.2) + ((1 - qualified.vector.ldi) * 0.2) + (continuity * 0.2));
  return clamp01(integrity * (1 - clamp01(degradation)) * (0.5 + flowBalance * 0.5));
}

export function capacityLevel(co: number): CapacityLevel {
  const capacity = clamp01(co);
  if (capacity >= 0.75) return 'high';
  if (capacity >= 0.5) return 'medium';
  if (capacity >= 0.25) return 'low';
  return 'critical';
}

export function deriveRegime(
  continuity: number,
  degradation: number,
  operationalCapacityValue: number,
): MihmRegime {
  const c = clamp01(continuity);
  const d = clamp01(degradation);
  const co = clamp01(operationalCapacityValue);

  if (c < 0.25 || d >= 0.75 || co < 0.25) return 'critical';
  if (c < 0.5 || d >= 0.45 || co < 0.5) return 'watch';
  return 'stable';
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function computeReducedMihm(input: ReducedMihmInput): ReducedMihmResult {
  const campoNodes = input.campo.nodes;
  const graphNodeCount = input.graph.nodes.length;
  const graphEdgeCount = input.graph.edges.length;
  const totalGraph = Math.max(1, graphNodeCount + graphEdgeCount);
  const graphDensity = clamp01(graphEdgeCount / totalGraph);
  const avgWeight = clamp01(average(campoNodes.map((node) => node.weight)));
  const avgValue = clamp01(average(campoNodes.map((node) => typeof node.value === 'number' ? node.value : 0)));
  const avgNti = clamp01(average(campoNodes.map((node) => typeof node.nti === 'number' ? node.nti : 0)));
  const simulatedRatio = clamp01(campoNodes.filter((node) => node.simulated).length / Math.max(1, campoNodes.length));
  const sourcePenalty = input.campo.sourceState === 'missing'
    ? 1
    : input.campo.sourceState === 'degraded'
      ? 0.45
      : 0;
  const graphPenalty = input.graph.sourceState === 'observed' && graphEdgeCount > 0 ? 0 : 0.35;

  const ihg = clamp01((input.campo.confidence * 0.45) + (avgWeight * 0.25) + (graphDensity * 0.2) + (avgValue * 0.1));
  const nti = clamp01((avgNti * 0.55) + (sourcePenalty * 0.25) + (simulatedRatio * 0.2));
  const ldi = clamp01((sourcePenalty * 0.45) + (graphPenalty * 0.25) + ((1 - input.campo.confidence) * 0.2) + (simulatedRatio * 0.1));
  const continuity = clamp01(ihg * (1 - ldi) * (1 - (nti * 0.35)));
  const qualified = qualifyNode({
    id: 'sfi.kernel',
    type: 'field',
    vector: { ihg, nti, ldi, continuity },
    weight: avgWeight,
  });
  const degradation = degradeNode(qualified, 0.35, 1, ldi * 0.25);
  const operationalCapacityValue = operationalCapacity(qualified, degradation, avgWeight, graphDensity);
  const warnings = [
    'legacy_phi_alias_only',
    ...(input.campo.sourceState === 'observed' ? [] : [`campo_${input.campo.sourceState}`]),
    ...(input.graph.sourceState === 'observed' && graphEdgeCount > 0 ? [] : ['graph_not_observed']),
    ...(simulatedRatio > 0 ? ['simulated_sources_present'] : []),
  ];

  return {
    regime: deriveRegime(continuity, degradation, operationalCapacityValue),
    vector: {
      ihg: Number(ihg.toFixed(4)),
      nti: Number(nti.toFixed(4)),
      ldi: Number(ldi.toFixed(4)),
      continuity: Number(continuity.toFixed(4)),
      phi: Number(continuity.toFixed(4)),
    },
    confidence: Number(clamp01(input.campo.confidence * (1 - (sourcePenalty * 0.3)) * (1 - (graphPenalty * 0.2))).toFixed(4)),
    warnings,
    metricContract: {
      id: 'REDUCED_KERNEL_CONTINUITY',
      canonicalPhi: false,
      legacyAlias: 'phi',
    },
    sourceIds: campoNodes.map((node) => node.type),
    degradation: Number(degradation.toFixed(4)),
    operationalCapacity: Number(operationalCapacityValue.toFixed(4)),
  };
}


/**
 * MIHM Foundation F1 — bounded topology contrast.
 * Research-grade descriptive comparator only; no identity, causality, prediction or canonical Phi.
 * Source-state and coverage flags are caller declarations, not evidence admission.
 */
export type MihmTopologyRelation = {
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
};

export type MihmTopologySnapshot = {
  boundaryId: string;
  relationSemanticsId: string;
  observedAt: string;
  sourceState: 'OBSERVED' | 'SIMULATED' | 'NOT_OBSERVED';
  coverage: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN';
  nodeIds: string[];
  relations: MihmTopologyRelation[];
  evidenceRefs: string[];
};

export type MihmTopologyProtocol = {
  boundaryId: string;
  relationSemanticsId: string;
  observerId: string;
  resolution: 'NODE_RELATION';
  temporalResolution: 'INSTANT' | 'DAILY' | 'WEEKLY';
  directed: boolean;
};

export type MihmTopologyContrast = {
  contract: 'MIHM-TOPOLOGY-CONTRAST-1.0';
  status: 'STRUCTURAL_CHANGE' | 'EQUIVALENT_WITHIN_PROTOCOL' | 'INDETERMINATE';
  epistemicClass: 'DERIVED' | 'SIMULATED' | 'UNKNOWN';
  protocol: MihmTopologyProtocol;
  counts: {
    beforeNodes: number;
    afterNodes: number;
    beforeRelations: number;
    afterRelations: number;
    aggregatesEqual: boolean;
  } | null;
  delta: {
    addedNodes: string[];
    removedNodes: string[];
    addedRelations: Array<MihmTopologyRelation & { count: number }>;
    removedRelations: Array<MihmTopologyRelation & { count: number }>;
    weakComponentsBefore: number;
    weakComponentsAfter: number;
  } | null;
  missing: string[];
  limitations: string[];
};

/**
 * Compare two complete, identity-stable, same-boundary snapshots at one declared resolution.
 * Parallel relations are counted, orientation is predeclared, and observations never become proof
 * of ontology. Weights, causal attribution and predictive claims are explicitly out of scope.
 */
export function compareMihmTopology(input: {
  protocol: MihmTopologyProtocol;
  before: MihmTopologySnapshot;
  after: MihmTopologySnapshot;
}): MihmTopologyContrast {
  const { protocol, before, after } = input;
  const missing: string[] = [];
  const limitations = [
    'Topology contrast does not establish individual identity, emergence, causality or prediction.',
    'Stable node identifiers and relation semantics must be independently justified; relabeling can mimic change.',
    'Relation weights and unobserved relations are not measured by this NODE_RELATION protocol.',
    'Caller-provided OBSERVED and COMPLETE labels do not constitute independent evidence adjudication.',
  ];
  const epistemicClass: MihmTopologyContrast['epistemicClass'] =
    before.sourceState === 'NOT_OBSERVED' || after.sourceState === 'NOT_OBSERVED' ? 'UNKNOWN' :
    before.sourceState === 'SIMULATED' || after.sourceState === 'SIMULATED' ? 'SIMULATED' : 'DERIVED';
  const base = {
    contract: 'MIHM-TOPOLOGY-CONTRAST-1.0' as const,
    protocol, epistemicClass, limitations,
  };
  const validName = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0 && value === value.trim();
  if (!validName(protocol.boundaryId) || !validName(protocol.relationSemanticsId) || !validName(protocol.observerId) ||
      protocol.resolution !== 'NODE_RELATION' || !['INSTANT', 'DAILY', 'WEEKLY'].includes(protocol.temporalResolution) ||
      typeof protocol.directed !== 'boolean') {
    missing.push('valid predeclared observer, boundary, relation semantics, temporal resolution and orientation');
  }
  if (before.boundaryId !== protocol.boundaryId || after.boundaryId !== protocol.boundaryId) {
    missing.push('both snapshots must use the predeclared boundary');
  }
  if (before.relationSemanticsId !== protocol.relationSemanticsId || after.relationSemanticsId !== protocol.relationSemanticsId) {
    missing.push('both snapshots must use the predeclared relation semantics');
  }
  if (before.coverage !== 'COMPLETE' || after.coverage !== 'COMPLETE') {
    missing.push('complete node and edge census at both times');
  }
  if (!['OBSERVED', 'SIMULATED'].includes(before.sourceState) ||
      !['OBSERVED', 'SIMULATED'].includes(after.sourceState)) {
    missing.push('two observed or explicitly simulated snapshots');
  }
  const firstTime = Date.parse(before.observedAt), secondTime = Date.parse(after.observedAt);
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime) || secondTime <= firstTime) {
    missing.push('valid ordered T0 and T1 observation timestamps');
  }
  for (const [label, snapshot] of [['T0', before], ['T1', after]] as const) {
    if (!Array.isArray(snapshot.nodeIds) || snapshot.nodeIds.length === 0 ||
        snapshot.nodeIds.some((id) => !validName(id)) || new Set(snapshot.nodeIds).size !== snapshot.nodeIds.length) {
      missing.push(label + ': nonempty unique stable node identifiers');
    }
    if (!Array.isArray(snapshot.relations) || snapshot.relations.some((r) =>
          !r || !validName(r.sourceNodeId) || !validName(r.targetNodeId) || !validName(r.relation) ||
          !Array.isArray(snapshot.nodeIds) || !snapshot.nodeIds.includes(r.sourceNodeId) ||
          !snapshot.nodeIds.includes(r.targetNodeId))) {
      missing.push(label + ': relations with valid endpoints and typed relation labels');
    }
    if (snapshot.sourceState === 'OBSERVED' &&
        (!Array.isArray(snapshot.evidenceRefs) || !snapshot.evidenceRefs.some(validName))) {
      missing.push(label + ': evidence references for observational claim');
    }
  }
  if (missing.length) return { ...base, status: 'INDETERMINATE', counts: null, delta: null, missing };

  // JSON tuples prevent identifier collisions; a multiset preserves parallel edge multiplicity.
  const keyed = (relation: MihmTopologyRelation) => {
    const [source, target] = protocol.directed || relation.sourceNodeId <= relation.targetNodeId
      ? [relation.sourceNodeId, relation.targetNodeId]
      : [relation.targetNodeId, relation.sourceNodeId];
    return JSON.stringify([source, target, relation.relation]);
  };
  const bag = (relations: MihmTopologyRelation[]) => {
    const counts = new Map<string, number>();
    for (const relation of relations) {
      const key = keyed(relation);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const oldBag = bag(before.relations), newBag = bag(after.relations);
  const addedRelations: Array<MihmTopologyRelation & { count: number }> = [];
  const removedRelations: Array<MihmTopologyRelation & { count: number }> = [];
  for (const key of [...new Set([...oldBag.keys(), ...newBag.keys()])].sort()) {
    const change = (newBag.get(key) ?? 0) - (oldBag.get(key) ?? 0);
    const [sourceNodeId, targetNodeId, relation] = JSON.parse(key) as [string, string, string];
    if (change > 0) addedRelations.push({ sourceNodeId, targetNodeId, relation, count: change });
    if (change < 0) removedRelations.push({ sourceNodeId, targetNodeId, relation, count: -change });
  }
  const oldNodes = new Set(before.nodeIds), newNodes = new Set(after.nodeIds);
  const addedNodes = after.nodeIds.filter((id) => !oldNodes.has(id)).sort();
  const removedNodes = before.nodeIds.filter((id) => !newNodes.has(id)).sort();
  const weakComponents = (snapshot: MihmTopologySnapshot) => {
    const neighbors = new Map(snapshot.nodeIds.map((id) => [id, new Set<string>()]));
    for (const edge of snapshot.relations) {
      neighbors.get(edge.sourceNodeId)!.add(edge.targetNodeId);
      neighbors.get(edge.targetNodeId)!.add(edge.sourceNodeId);
    }
    const seen = new Set<string>();
    let components = 0;
    for (const id of snapshot.nodeIds) {
      if (seen.has(id)) continue;
      components++;
      const stack = [id];
      while (stack.length) {
        const current = stack.pop()!;
        if (seen.has(current)) continue;
        seen.add(current);
        for (const next of neighbors.get(current)!) if (!seen.has(next)) stack.push(next);
      }
    }
    return components;
  };
  const status: MihmTopologyContrast['status'] =
    addedNodes.length || removedNodes.length || addedRelations.length || removedRelations.length
      ? 'STRUCTURAL_CHANGE' : 'EQUIVALENT_WITHIN_PROTOCOL';
  return {
    ...base, status, missing: [],
    counts: {
      beforeNodes: before.nodeIds.length, afterNodes: after.nodeIds.length,
      beforeRelations: before.relations.length, afterRelations: after.relations.length,
      aggregatesEqual: before.nodeIds.length === after.nodeIds.length &&
        before.relations.length === after.relations.length,
    },
    delta: {
      addedNodes, removedNodes, addedRelations, removedRelations,
      weakComponentsBefore: weakComponents(before),
      weakComponentsAfter: weakComponents(after),
    },
  };
}


/** Versioned historical arithmetic, not a replacement for any canonical Phi. */
export type MihmNormalizedNode = {id:string;C:number;E:number;L:number;M?:number;R?:number;K?:number};
export function calculateMihmNodeState(nodes:MihmNormalizedNode[],version:'LEGACY_V1_5'|'LEGACY_V2'='LEGACY_V2') {
  const valid=nodes.length>0&&new Set(nodes.map(n=>n.id)).size===nodes.length&&nodes.every(n=>n.id&&(version==='LEGACY_V1_5'?[n.C,n.E,n.L]:[n.C,n.E,n.L,n.M]).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1));
  if(!valid||nodes.length>256||!['LEGACY_V1_5','LEGACY_V2'].includes(version))return {crm:null,crmStatus:'MISSING_OR_INVALID',status:'BLOCKED' as const,ihg:null,ice:null,sensitivity:[],formula:version==='LEGACY_V1_5'?'LEGACY_V1_5_DOCUMENTED_EQUATION':'LEGACY_V2_DOCUMENTED_EQUATION',canonicalPhiCalculated:false};
  const terms=nodes.map(n=>{const effective=n.L*(version==='LEGACY_V1_5'?1:2-(n.M as number)),factor=1-Math.min(effective,1);return{nodeId:n.id,contribution:(n.C-n.E)*factor,
    dC:factor/nodes.length,dE:-factor/nodes.length,
    dL:effective<1?-(n.C-n.E)*(version==='LEGACY_V1_5'?1:2-(n.M as number))/nodes.length:null,
    dM:version==='LEGACY_V1_5'?null:effective<1?(n.C-n.E)*n.L/nodes.length:null};});
  const total=nodes.reduce((s,n)=>s+n.E,0);
  const crmValid=nodes.every(n=>[n.R,n.K].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1));
  return {crm:crmValid?nodes.reduce((sum,n)=>sum+(n.R as number)*(n.K as number),0)/nodes.length:null,crmStatus:crmValid?'DERIVED':'MISSING_OR_INVALID',status:'DERIVED' as const,ihg:terms.reduce((s,n)=>s+n.contribution,0)/nodes.length,
    ice:total===0?null:Math.max(...nodes.map(n=>n.E))/total,sensitivity:terms,
    formula:version==='LEGACY_V1_5'?'LEGACY_V1_5_DOCUMENTED_EQUATION':'LEGACY_V2_DOCUMENTED_EQUATION',canonicalPhiCalculated:false};
}

export function simulateMihmRedistribution(nodes:Array<{id:string;capacity:number;load:number}>,transfers:Array<{from:string;to:string;amount:number}>) {
  const blocked=(reason:string)=>({status:'BLOCKED' as const,reason,nodes:[] as typeof nodes,totalBefore:null,totalAfter:null,externalActionAuthorized:false});
  if(!nodes.length||nodes.length>256||transfers.length>4096||new Set(nodes.map(n=>n.id)).size!==nodes.length||nodes.some(n=>!n.id||![n.capacity,n.load].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)))return blocked('INVALID_NODE_MEASUREMENTS');
  const draft=nodes.map(n=>({...n}));const index=new Map(draft.map(n=>[n.id,n]));
  const outgoing=new Map<string,number>(),incoming=new Map<string,number>();
  for(const t of transfers){
    if(!index.has(t.from)||!index.has(t.to)||t.from===t.to||typeof t.amount!=='number'||!Number.isFinite(t.amount)||t.amount<0)return blocked('INVALID_TRANSFER');
    outgoing.set(t.from,(outgoing.get(t.from)??0)+t.amount);incoming.set(t.to,(incoming.get(t.to)??0)+t.amount);
  }
  for(const n of draft){
    if((outgoing.get(n.id)??0)>n.load)return blocked('TRANSFER_EXCEEDS_SOURCE_LOAD');
    n.load=n.load-(outgoing.get(n.id)??0)+(incoming.get(n.id)??0);
    if(!Number.isFinite(n.load)||((incoming.get(n.id)??0)>0&&n.load>n.capacity))return blocked('RECIPIENT_CAPACITY_EXCEEDED');
  }
  const totalBefore=nodes.reduce((s,n)=>s+n.load,0),totalAfter=draft.reduce((s,n)=>s+n.load,0);
  if(!Number.isFinite(totalAfter)||Math.abs(totalBefore-totalAfter)>1e-10*Math.max(1,totalBefore))return blocked('LOAD_CONSERVATION_FAILED');
  return {status:'SIMULATED' as const,reason:null,nodes:draft,totalBefore,totalAfter,externalActionAuthorized:false};
}

export function projectMihmDynamics(input:{state:number[];transition:number[][];forcing:number[];steps:number}) {
  const n=input.state.length;
  const blocked=(reason:string)=>({status:'BLOCKED' as const,reason,trajectory:[] as number[][],stability:'NOT_ESTABLISHED',realWorldHomeostasisEstablished:false});
  if(n<1||n>64||!Number.isInteger(input.steps)||input.steps<1||input.steps>1000||input.forcing.length!==n||input.transition.length!==n||input.transition.some(r=>r.length!==n)||[...input.state,...input.forcing,...input.transition.flat()].some(v=>typeof v!=='number'||!Number.isFinite(v)))return blocked('INVALID_OR_UNBOUNDED_MODEL');
  const trajectory=[input.state.slice()];
  for(let k=0;k<input.steps;k++){
    const prev=trajectory[trajectory.length-1];
    const next=input.transition.map((r,i)=>r.reduce((sum,a,j)=>sum+a*prev[j],input.forcing[i]));
    if(next.some(v=>!Number.isFinite(v)))return blocked('MODEL_NUMERIC_OVERFLOW');
    trajectory.push(next);
  }
  const contractionBound=Math.max(...input.transition.map(r=>r.reduce((s,v)=>s+Math.abs(v),0)));
  if(!Number.isFinite(contractionBound))return blocked('MODEL_NORM_OVERFLOW');
  return {status:'SIMULATED' as const,reason:null,trajectory,contractionBound,
    stability:contractionBound<1?'SUFFICIENT_CONTRACTION_OF_DECLARED_MODEL':'NOT_ESTABLISHED',realWorldHomeostasisEstablished:false};
}

export type MihmForecastPair={id:string;unit:string;issuedAt:string;availableAt:string;targetAt:string;outcomeAvailableAt:string;observed:number;candidate:number;baseline:number};
function mihmIso(value:string) {
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))return false;
  const time=Date.parse(value);if(!Number.isFinite(time))return false;
  const zone=value.endsWith('Z')?null:value.slice(-6);
  if(zone&&(Number(zone.slice(1,3))>23||Number(zone.slice(4))>59))return false;
  const shift=zone?(zone[0]==='-'?-1:1)*(Number(zone.slice(1,3))*60+Number(zone.slice(4))):0;
  return new Date(time+shift*60000).toISOString().slice(0,10)===value.slice(0,10);
}
export function compareMihmForecasts(rows:MihmForecastPair[],evaluatedAt=new Date().toISOString()) {
  const base={scientificValidation:false,canonicalPhiCalculated:false};
  if(!mihmIso(evaluatedAt)||rows.length>10000||new Set(rows.map(r=>r.unit)).size>1||new Set(rows.map(r=>r.id)).size!==rows.length)return {...base,status:'BLOCKED',n:0,candidateMAE:null,baselineMAE:null,relativeImprovement:null,excluded:rows.map(r=>r.id)};
  const accepted=rows.filter(r=>{
    const times=[r.issuedAt,r.availableAt,r.targetAt,r.outcomeAvailableAt].map(t=>typeof t==='string'?Date.parse(t):NaN);
    return r.id&&r.unit&&[r.issuedAt,r.availableAt,r.targetAt,r.outcomeAvailableAt].every(mihmIso)&&times[3]<=Date.parse(evaluatedAt)&&times.every(Number.isFinite)&&times[1]<=times[0]&&times[0]<times[2]&&times[2]<=times[3]&&[r.observed,r.candidate,r.baseline].every(v=>typeof v==='number'&&Number.isFinite(v));
  });
  const excluded=rows.filter(r=>!accepted.includes(r)).map(r=>r.id);
  const n=accepted.length;if(!n)return {...base,status:'INSUFFICIENT',n:0,candidateMAE:null,baselineMAE:null,relativeImprovement:null,excluded};
  const candidateMAE=accepted.reduce((s,r)=>s+Math.abs(r.observed-r.candidate),0)/n;
  const baselineMAE=accepted.reduce((s,r)=>s+Math.abs(r.observed-r.baseline),0)/n;
  if(!Number.isFinite(candidateMAE)||!Number.isFinite(baselineMAE))return {...base,status:'BLOCKED',n:0,candidateMAE:null,baselineMAE:null,relativeImprovement:null,excluded:rows.map(r=>r.id)};
  return {...base,status:'DERIVED',n,candidateMAE,baselineMAE,relativeImprovement:baselineMAE===0||!Number.isFinite(1-candidateMAE/baselineMAE)?null:1-candidateMAE/baselineMAE,excluded};
}

/** Reproducible declared measurement-range propagation, NOT empirical confidence. */
export function sampleMihmUncertainty(input:{nodes:MihmNormalizedNode[];radius:number;samples:number;seed:number}) {
  if(calculateMihmNodeState(input.nodes).ihg===null||!Number.isFinite(input.radius)||input.radius<0||input.radius>1||!Number.isInteger(input.samples)||input.samples<2||input.samples>10000||!Number.isInteger(input.seed))return {status:'BLOCKED' as const,ihg:null};
  let seed=input.seed>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const values:number[]=[];
  for(let i=0;i<input.samples;i++){
    const sample=input.nodes.map(n=>({...n,C:clamp01(n.C+(2*random()-1)*input.radius),E:clamp01(n.E+(2*random()-1)*input.radius),L:clamp01(n.L+(2*random()-1)*input.radius),M:clamp01((n.M as number)+(2*random()-1)*input.radius)}));
    values.push(calculateMihmNodeState(sample).ihg as number);
  }
  values.sort((a,b)=>a-b);
  return {status:'SIMULATED' as const,ihg:{min:values[0],median:values[Math.floor(values.length/2)],max:values[values.length-1]},seed:input.seed,samples:input.samples,distribution:'INDEPENDENT_UNIFORM_CLIPPED_DECLARED_RANGES',empiricalConfidenceInterval:false};
}

export function screenMihmPathologies(input:{nodes:Array<{id:string;capacity:number;declaredCapacity:number;load:number;previousCapacity:number;latency:number;previousLatency:number}>;edges:Array<{from:string;to:string}>;limits:{phantomCapacityGap:number;latencyIncrease:number}}) {
  const ids=new Set(input.nodes.map(n=>n.id));
  if(!input.nodes.length||input.nodes.length>256||input.edges.length>4096||ids.size!==input.nodes.length||input.nodes.some(n=>!n.id||[n.capacity,n.declaredCapacity,n.load,n.previousCapacity,n.latency,n.previousLatency].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0))||[input.limits.phantomCapacityGap,input.limits.latencyIncrease].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)||input.edges.some(e=>!ids.has(e.from)||!ids.has(e.to)||e.from===e.to))return {status:'BLOCKED' as const,phantomCapacity:[],silentFatigue:[],exposedRecipients:[],causalSepsisEstablished:false};
  const phantomCapacity=input.nodes.filter(n=>n.declaredCapacity-n.capacity>input.limits.phantomCapacityGap).map(n=>n.id);
  const silentFatigue=input.nodes.filter(n=>n.capacity<n.previousCapacity&&n.latency-n.previousLatency>input.limits.latencyIncrease).map(n=>n.id);
  const overloaded=new Set(input.nodes.filter(n=>n.load>n.capacity).map(n=>n.id));
  const reached=new Set(overloaded);let changed=true;
  while(changed){changed=false;for(const e of input.edges)if(reached.has(e.from)&&!reached.has(e.to)){reached.add(e.to);changed=true;}}
  return {status:'DERIVED_SCREENING' as const,phantomCapacity,silentFatigue,exposedRecipients:[...reached].filter(id=>!overloaded.has(id)),causalSepsisEstablished:false,calibratedThresholds:false};
}


/**
 * P0 MIHM empirical metrology: a seven-day same-weekday absolute-change
 * envelope fitted on the TRAINING block alone. This is NOT a learned
 * dynamical transition, causal propagation, calibrated canonical Phi,
 * viability limit, prospective forecast or homeostasis certificate.
 *
 * Keep the original source revision and as-of availability separate:
 * historic data collected today cannot be assumed present at past T0.
 */
export type MihmHistoricalDailyPoint = {
  day: string;
  value: number | null;
  state: 'MEASURED' | 'MISSING' | 'INFERRED' | 'SIMULATED' | 'CONTRADICTED';
  unit: string;
};
export type MihmHistoricalVariationInput = {
  boundary: string;
  nodeRef: string;
  dimensionRef: string;
  unit: string;
  sourceResponseSha256: string;
  originalT0SourceAvailability: 'NOT_VERIFIED' | 'DOCUMENTED';
  sourceAvailabilityEvidenceRef?: string;
  trainThrough: string;
  validationThrough: string;
  rows: MihmHistoricalDailyPoint[];
};

export function calibrateMihmHistoricalVariationEnvelope(input: MihmHistoricalVariationInput) {
  const blocked = (reason: string) => ({
    contract: 'SFI-MIHM-HISTORICAL-VARIATION-CALIBRATION-0.1' as const,
    status: 'ABSTAINED' as const,
    reason, threshold: null as number | null, nTrain: 0, nValidation: 0,
    nHistoricalAudit: 0, validationExceedances: null as number | null,
    validationExceedanceRate: null as number | null,
    canonicalPhiCalculated: false as const,
    viabilityEstablished: false as const, homeostasisEstablished: false as const,
    prospectiveSkillEstablished: false as const,
    externallyValidated: false as const,
    productionPromotionAllowed: false as const,
  });
  if (!input || typeof input !== 'object' || !Array.isArray(input.rows) ||
    !input.boundary?.trim() || !input.nodeRef?.trim() ||
    !input.dimensionRef?.trim() || !input.unit?.trim() ||
    !/^[a-f0-9]{64}$/i.test(input.sourceResponseSha256) ||
    !['NOT_VERIFIED', 'DOCUMENTED'].includes(input.originalT0SourceAvailability) ||
    (input.originalT0SourceAvailability === 'DOCUMENTED' &&
      !input.sourceAvailabilityEvidenceRef?.trim())) return blocked('SOURCE_BOUNDARY_OR_LINEAGE_INCOMPLETE');
  const toDay = (s: string) => {
    if (typeof s !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return null;
    const ms = Date.parse(s + 'T12:00:00Z');
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s ? ms : null;
  };
  const trainEnd = toDay(input.trainThrough);
  const validationEnd = toDay(input.validationThrough);
  if (trainEnd === null || validationEnd === null || trainEnd >= validationEnd ||
    input.rows.length < 60 || input.rows.length > 2000) return blocked('INVALID_OR_TOO_SMALL_CHRONOLOGICAL_COHORT');
  let previousDay: number | null = null;
  for (const row of input.rows) {
    if (!row || row.state !== 'MEASURED' || row.unit !== input.unit ||
      typeof row.value !== 'number' || !Number.isFinite(row.value) || row.value < 0) {
      return blocked('UNOBSERVED_INFERRED_OR_UNIT_CONFLICTED_SAMPLE');
    }
    const day = toDay(row.day);
    if (day === null || (previousDay !== null && day - previousDay !== 86_400_000)) {
      return blocked('DUPLICATE_GAP_OR_INVALID_DAY');
    }
    previousDay = day;
  }
  if (toDay(input.rows[0].day)! >= trainEnd ||
    toDay(input.rows.at(-1)!.day)! <= validationEnd) {
    return blocked('EMPTY_CALIBRATION_OR_AUDIT_WINDOW');
  }
  const train: number[] = [], validation: number[] = [], historicalAudit: number[] = [];
  for (let i = 7; i < input.rows.length; i++) {
    const delta = Math.abs(input.rows[i].value! - input.rows[i - 7].value!);
    const day = toDay(input.rows[i].day)!;
    (day <= trainEnd ? train : day <= validationEnd ? validation : historicalAudit).push(delta);
  }
  if (train.length < 30 || validation.length < 14 || historicalAudit.length < 1) {
    return blocked('INSUFFICIENT_SEPARATED_TRAIN_VALIDATION_AUDIT');
  }
  // Fixed a priori P90 rule; validation and historical-audit outcomes cannot
  // influence the threshold. Nearest-rank empirical quantile, ties are not alarms.
  const ordered = [...train].sort((a, b) => a - b);
  const threshold = ordered[Math.ceil(0.9 * ordered.length) - 1];
  const exceed = (arr: number[]) => arr.filter(value => value > threshold).length;
  const validationExceedances = exceed(validation);
  const historicalAuditExceedances = exceed(historicalAudit);
  return {
    contract: 'SFI-MIHM-HISTORICAL-VARIATION-CALIBRATION-0.1' as const,
    status: 'RETROSPECTIVE_DERIVED_ONLY' as const,
    reason: 'SEASONAL_NAIVE_ERROR_ENVELOPE_NOT_A_VIABILITY_LIMIT',
    boundary: input.boundary,
    nodeRef: input.nodeRef,
    dimensionRef: input.dimensionRef,
    sourceResponseSha256: input.sourceResponseSha256,
    originalT0SourceAvailability: input.originalT0SourceAvailability,
    unit: input.unit,
    method: 'ABSOLUTE_CHANGE_FROM_SAME_DAY_PREVIOUS_WEEK_P90_NEAREST_RANK' as const,
    trainThrough: input.trainThrough, validationThrough: input.validationThrough,
    threshold, nTrain: train.length, nValidation: validation.length,
    nHistoricalAudit: historicalAudit.length,
    trainingExceedances: exceed(train),
    validationExceedances,
    validationExceedanceRate: validationExceedances / validation.length,
    historicalAuditExceedances,
    historicalAuditIndependentHoldout: false as const,
    thresholdTunedOnValidationOrAudit: false as const,
    sourceAvailabilityIndependentlyVerifiedByThisCalculation: false as const,
    canonicalPhiCalculated: false as const,
    viabilityEstablished: false as const,
    homeostasisEstablished: false as const,
    prospectiveSkillEstablished: false as const,
    externallyValidated: false as const,
    productionPromotionAllowed: false as const,
  };
}

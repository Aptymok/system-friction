export type RootTopologyNodeId = 'GRAPH' | 'PRED' | 'AMV' | 'ROOT' | 'EVID' | 'WORLD';
export type RootTopologyEdgeKind = 'cycle' | 'cross' | 'weak' | 'radial';
export type RootTopologyRingKind = 'root' | 'agent' | 'memory' | 'evidence' | 'prediction' | 'world';

export type RootTopologyNode = {
  id: RootTopologyNodeId;
  label: string;
  x: number;
  y: number;
  value: number;
  source: string;
  meaning: string;
};

export type RootTopologyEdge = {
  id: string;
  from: RootTopologyNodeId;
  to: RootTopologyNodeId;
  kind: RootTopologyEdgeKind;
  weight: number;
  source: string;
  meaning: string;
};

export type RootTopologyRing = {
  id: RootTopologyRingKind;
  radius: number;
  weight: number;
  source: string;
  meaning: string;
};

export type RootMicroSignal = {
  id: string;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  source: string;
};

export type RootTopologyModelInput = {
  confidence: number;
  graphNodeCount: number;
  evidenceCount: number;
  predictionCount: number;
  amvCount: number;
  queueCount: number;
  warningCount: number;
  agentCount: number;
};

export type RootTopologyModel = {
  nodes: RootTopologyNode[];
  edges: RootTopologyEdge[];
  rings: RootTopologyRing[];
  microSignals: RootMicroSignal[];
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function pressure(count: number, divisor: number) {
  return clamp01(count / divisor);
}

export function buildRootTopologyModel(input: RootTopologyModelInput): RootTopologyModel {
  const confidence = clamp01(input.confidence);
  const predictionPressure = pressure(input.predictionCount, 12);
  const evidencePressure = pressure(input.evidenceCount, 24);
  const memoryPressure = pressure(input.amvCount, 18);
  const queuePressure = pressure(input.queueCount, 10);
  const warningPressure = pressure(input.warningCount, 8);
  const agentAvailability = pressure(input.agentCount, 5);

  const nodes: RootTopologyNode[] = [
    {
      id: 'GRAPH',
      label: 'GRAPH',
      x: 50,
      y: 10,
      value: input.graphNodeCount,
      source: 'initialState.neuralGraph.nodes.length',
      meaning: 'Relational substrate available for institutional observation.',
    },
    {
      id: 'PRED',
      label: 'PRED',
      x: 82,
      y: 27,
      value: input.predictionCount,
      source: 'initialState.predictionRegistry.entries.length',
      meaning: 'Active registry of hypotheses, forecasts and return windows.',
    },
    {
      id: 'AMV',
      label: 'AMV',
      x: 80,
      y: 70,
      value: input.amvCount,
      source: 'initialState.amv.items.length',
      meaning: 'Operational memory available for longitudinal observation.',
    },
    {
      id: 'ROOT',
      label: 'ROOT',
      x: 50,
      y: 90,
      value: Math.round(confidence * 100),
      source: 'worldVector.today.observation.confidence + root governance proxy',
      meaning: 'Founder governance point; readiness proxy until a dedicated ROOT index exists.',
    },
    {
      id: 'EVID',
      label: 'EVID',
      x: 20,
      y: 70,
      value: input.evidenceCount,
      source: 'initialState.neuralGraph.evidence.length',
      meaning: 'Traceable evidence load supporting institutional readings.',
    },
    {
      id: 'WORLD',
      label: 'WORLD',
      x: 18,
      y: 27,
      value: Math.round(confidence * 100),
      source: 'worldVector.today.observation.confidence',
      meaning: 'External contextual signal from the World Vector layer.',
    },
  ];

  const cycle: RootTopologyNodeId[] = ['GRAPH', 'PRED', 'AMV', 'ROOT', 'EVID', 'WORLD'];
  const edges: RootTopologyEdge[] = [];

  cycle.forEach((from, index) => {
    const to = cycle[(index + 1) % cycle.length];
    edges.push({
      id: `${from}-${to}-cycle`,
      from,
      to,
      kind: 'cycle',
      weight: 0.48 + confidence * 0.22,
      source: 'fixed SFI operational cycle contract',
      meaning: 'Primary institutional cycle: structure, hypothesis, memory, governance, evidence, world.',
    });
  });

  const crossPairs: Array<[RootTopologyNodeId, RootTopologyNodeId, number, string]> = [
    ['GRAPH', 'AMV', memoryPressure, 'Graph structure depends on available operational memory.'],
    ['PRED', 'EVID', Math.max(predictionPressure, evidencePressure), 'Prediction strength must be confronted with evidence load.'],
    ['ROOT', 'PRED', Math.max(queuePressure, predictionPressure), 'Founder governance routes or approves predictive pressure.'],
    ['WORLD', 'GRAPH', confidence, 'External signal is incorporated into the internal graph.'],
    ['AMV', 'WORLD', Math.max(memoryPressure, confidence), 'Memory gives continuity to external signal readings.'],
    ['ROOT', 'EVID', Math.max(queuePressure, evidencePressure), 'Founder review depends on available evidence.'],
  ];

  crossPairs.forEach(([from, to, weight, meaning]) => {
    edges.push({
      id: `${from}-${to}-cross`,
      from,
      to,
      kind: 'cross',
      weight: 0.16 + clamp01(weight) * 0.28,
      source: 'derived from node counts and confidence proxies',
      meaning,
    });
  });

  nodes.filter((node) => node.id !== 'ROOT').forEach((node) => {
    edges.push({
      id: `ROOT-${node.id}-radial`,
      from: 'ROOT',
      to: node.id,
      kind: 'radial',
      weight: 0.18 + Math.max(queuePressure, confidence, warningPressure) * 0.24,
      source: 'root governance radial projection',
      meaning: `ROOT can inspect, route or calibrate ${node.id}.`,
    });
  });

  const rings: RootTopologyRing[] = [
    { id: 'root', radius: 8, weight: Math.max(queuePressure, warningPressure), source: 'executionQueue + systemHealth.warnings', meaning: 'Founder intervention pressure.' },
    { id: 'agent', radius: 14, weight: agentAvailability, source: 'systemHealth.llmProvidersAvailable', meaning: 'Agentic availability layer.' },
    { id: 'memory', radius: 20, weight: memoryPressure, source: 'initialState.amv.items.length', meaning: 'AMV persistence layer.' },
    { id: 'evidence', radius: 26, weight: evidencePressure, source: 'initialState.neuralGraph.evidence.length', meaning: 'Evidence density layer.' },
    { id: 'prediction', radius: 32, weight: predictionPressure, source: 'initialState.predictionRegistry.entries.length', meaning: 'Predictive pressure layer.' },
    { id: 'world', radius: 38, weight: confidence, source: 'worldVector.today.observation.confidence', meaning: 'External contextual signal layer.' },
  ];

  const microCount = Math.max(24, Math.min(72, input.graphNodeCount + input.evidenceCount + input.predictionCount + input.amvCount));
  const microSignals: RootMicroSignal[] = Array.from({ length: microCount }, (_, index) => {
    const angle = (index * 137.5) * Math.PI / 180;
    const radialBand = rings[index % rings.length];
    const radius = radialBand.radius + ((index * 5) % 9) - 4;
    return {
      id: `micro-${index}`,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      radius: 0.23 + (index % 5) * 0.055,
      opacity: 0.10 + clamp01(radialBand.weight) * 0.22 + (index % 4) * 0.025,
      source: radialBand.source,
    };
  });

  return { nodes, edges, rings, microSignals };
}

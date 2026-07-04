export type AgentLatticeStatus = 'active' | 'degraded' | 'idle' | 'queued';

export type AgentLatticeNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  status: AgentLatticeStatus;
  throughput: string;
  memoryIntegrity: number;
  warnings: number;
  dependencyFailures: number;
  source: string;
};

export type AgentLatticeLink = {
  id: string;
  from: string;
  to: string;
  kind: 'primary' | 'secondary' | 'weak' | 'failed';
  weight: number;
};

export type AgentLatticeModel = {
  nodes: AgentLatticeNode[];
  links: AgentLatticeLink[];
  healthIndex: number;
  dependencyHealth: number;
  memoryIntegrity: number;
  throughputScore: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function statusFrom(raw: unknown): AgentLatticeStatus {
  const value = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (/(fail|error|degraded|warn)/.test(value)) return 'degraded';
  if (/(queued|pending)/.test(value)) return 'queued';
  if (/(idle|missing|none)/.test(value)) return 'idle';
  if (/(active|ok|stable|live|operational)/.test(value)) return 'active';
  return 'idle';
}

export function buildAgentLatticeModel(input: {
  worldVectorStatus: unknown;
  graphStatus: unknown;
  amvStatus: unknown;
  predictionStatus: unknown;
  providerCount: number;
  amvCount: number;
  evidenceCount: number;
  predictionCount: number;
  warningCount: number;
}) : AgentLatticeModel {
  const warningPressure = clamp01(input.warningCount / 8);
  const providerHealth = clamp01(input.providerCount / 5);
  const memoryScore = clamp01(0.62 + Math.min(input.amvCount, 18) / 60 - warningPressure * 0.18);
  const evidenceScore = clamp01(0.55 + Math.min(input.evidenceCount, 24) / 70);
  const predictionScore = clamp01(0.52 + Math.min(input.predictionCount, 12) / 45 - warningPressure * 0.12);

  const nodes: AgentLatticeNode[] = [
    { id: 'world-vector', label: 'World Vector Agent', x: 50, y: 10, status: statusFrom(input.worldVectorStatus), throughput: `${Math.max(1, input.evidenceCount)} sig/s`, memoryIntegrity: evidenceScore, warnings: 0, dependencyFailures: 0, source: 'initialState.worldVectorAgent' },
    { id: 'neural-graph', label: 'Neural Graph Agent', x: 24, y: 24, status: statusFrom(input.graphStatus), throughput: `${input.evidenceCount} evid`, memoryIntegrity: evidenceScore, warnings: input.warningCount ? 1 : 0, dependencyFailures: 0, source: 'initialState.neuralGraph + systemHealth.graphStatus' },
    { id: 'amv', label: 'AMV Agent', x: 76, y: 24, status: statusFrom(input.amvStatus), throughput: `${input.amvCount} mem`, memoryIntegrity: memoryScore, warnings: input.amvCount ? 0 : 1, dependencyFailures: input.amvCount ? 0 : 1, source: 'initialState.amv' },
    { id: 'prediction', label: 'Prediction Agent', x: 22, y: 58, status: statusFrom(input.predictionStatus), throughput: `${input.predictionCount} pred`, memoryIntegrity: predictionScore, warnings: input.predictionCount ? 0 : 1, dependencyFailures: 0, source: 'initialState.predictionRegistry' },
    { id: 'calibration', label: 'Calibration Agent', x: 78, y: 58, status: input.warningCount ? 'degraded' : 'idle', throughput: 'derived', memoryIntegrity: clamp01(1 - warningPressure), warnings: input.warningCount, dependencyFailures: input.warningCount > 2 ? 1 : 0, source: 'systemHealth.warnings derived calibration pressure' },
    { id: 'report', label: 'Report Agent', x: 30, y: 82, status: providerHealth > 0 ? 'active' : 'idle', throughput: `${input.providerCount} llm`, memoryIntegrity: providerHealth, warnings: providerHealth > 0 ? 0 : 1, dependencyFailures: providerHealth > 0 ? 0 : 1, source: 'systemHealth.llmProvidersAvailable' },
    { id: 'cognitive-twin', label: 'Cognitive Twin Agent', x: 70, y: 82, status: providerHealth > 0 ? 'active' : 'idle', throughput: 'root', memoryIntegrity: clamp01((providerHealth + memoryScore) / 2), warnings: 0, dependencyFailures: 0, source: 'initialState.cognitiveTwin' },
    { id: 'root-orchestrator', label: 'ROOT Orchestrator', x: 50, y: 50, status: input.warningCount ? 'degraded' : 'active', throughput: 'control', memoryIntegrity: clamp01((providerHealth + memoryScore + evidenceScore) / 3), warnings: input.warningCount, dependencyFailures: input.warningCount > 3 ? 1 : 0, source: 'derived root orchestration state' },
  ];

  const links: AgentLatticeLink[] = [
    ['root-orchestrator', 'world-vector', 'primary'], ['root-orchestrator', 'neural-graph', 'primary'], ['root-orchestrator', 'amv', 'primary'], ['root-orchestrator', 'prediction', 'primary'], ['root-orchestrator', 'calibration', input.warningCount ? 'failed' : 'secondary'], ['root-orchestrator', 'report', 'secondary'], ['root-orchestrator', 'cognitive-twin', 'secondary'], ['neural-graph', 'prediction', 'secondary'], ['amv', 'prediction', 'secondary'], ['world-vector', 'neural-graph', 'secondary'], ['amv', 'cognitive-twin', 'weak'], ['report', 'cognitive-twin', 'weak'],
  ].map(([from, to, kind]) => ({ id: `${from}-${to}`, from, to, kind: kind as AgentLatticeLink['kind'], weight: kind === 'primary' ? 0.82 : kind === 'secondary' ? 0.55 : kind === 'failed' ? 0.35 : 0.28 }));

  const healthIndex = clamp01(nodes.reduce((sum, node) => sum + node.memoryIntegrity, 0) / nodes.length - warningPressure * 0.16);
  const failures = nodes.reduce((sum, node) => sum + node.dependencyFailures, 0);

  return {
    nodes,
    links,
    healthIndex,
    dependencyHealth: clamp01(1 - failures / Math.max(1, nodes.length)),
    memoryIntegrity: clamp01(nodes.reduce((sum, node) => sum + node.memoryIntegrity, 0) / nodes.length),
    throughputScore: clamp01((providerHealth + evidenceScore + predictionScore) / 3),
  };
}

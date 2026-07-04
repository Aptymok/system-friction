import { RootSceneViewport } from '../scene/RootSceneViewport';
import type { RootSceneModel } from '../scene/rootSceneTypes';
import { buildAgentLatticeModel } from './agentLatticeModel';

type Props = {
  worldVectorStatus: unknown;
  graphStatus: unknown;
  amvStatus: unknown;
  predictionStatus: unknown;
  providerCount: number;
  amvCount: number;
  evidenceCount: number;
  predictionCount: number;
  warningCount: number;
};

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function buildAgentScene(props: Props): RootSceneModel {
  const model = buildAgentLatticeModel(props);

  return {
    title: 'Agentic Operations',
    subtitle: 'ROOT orchestrator lattice',
    nodes: model.nodes.map((node) => ({
      id: node.id,
      label: node.id === 'root-orchestrator' ? 'ROOT' : node.label.replace(' Agent', ''),
      x: node.x,
      y: node.y,
      value: node.throughput,
      status: node.status,
      kind: node.id === 'root-orchestrator' ? 'core' : 'agent',
      source: node.source,
      meaning: `${node.label}. Memory integrity ${percent(node.memoryIntegrity)}. Warnings ${node.warnings}. Dependency failures ${node.dependencyFailures}.`,
      dataClass: node.source.includes('derived') ? 'derived' : 'mixed',
    })),
    edges: model.links.map((link) => ({
      id: link.id,
      from: link.from,
      to: link.to,
      weight: link.weight,
      kind: link.kind,
      source: 'agentLatticeModel.links',
      meaning: `Agent dependency link classified as ${link.kind}.`,
    })),
    rings: [
      { id: 'inner-orchestration', radius: 14, weight: model.healthIndex, label: 'ROOT', source: 'agentLatticeModel.healthIndex', meaning: 'Inner orchestration stability.' },
      { id: 'dependency-orbit', radius: 26, weight: model.dependencyHealth, label: 'DEPS', source: 'agentLatticeModel.dependencyHealth', meaning: 'Dependency integrity orbit.' },
      { id: 'memory-orbit', radius: 38, weight: model.memoryIntegrity, label: 'MEM', source: 'agentLatticeModel.memoryIntegrity', meaning: 'Memory integrity orbit.' },
    ],
    annotations: [],
    readouts: [
      { id: 'health', label: 'health', value: percent(model.healthIndex), source: 'agentLatticeModel.healthIndex', meaning: 'Derived health index across agent nodes.', dataClass: 'derived' },
      { id: 'deps', label: 'deps', value: percent(model.dependencyHealth), source: 'agentLatticeModel.dependencyHealth', meaning: 'Derived dependency health.', dataClass: 'derived' },
      { id: 'memory', label: 'memory', value: percent(model.memoryIntegrity), source: 'agentLatticeModel.memoryIntegrity', meaning: 'Derived memory integrity.', dataClass: 'derived' },
      { id: 'throughput', label: 'flow', value: percent(model.throughputScore), source: 'agentLatticeModel.throughputScore', meaning: 'Derived throughput score.', dataClass: 'derived' },
    ],
  };
}

export default function AgentViewEngine(props: Props) {
  return <RootSceneViewport model={buildAgentScene(props)} />;
}

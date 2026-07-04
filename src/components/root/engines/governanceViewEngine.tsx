import { RootSceneViewport } from '../scene/RootSceneViewport';
import type { RootSceneModel, RootSceneNode } from '../scene/rootSceneTypes';

type Props = { queueCount: number; predictionCount: number; warningCount: number; confidence: number };

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function pct(value: number) {
  return `${Math.round(clamp(value) * 100)}%`;
}

export default function GovernanceViewEngine({ queueCount, predictionCount, warningCount, confidence }: Props) {
  const pressure = clamp((queueCount * 0.10) + (predictionCount * 0.04) + (warningCount * 0.08));
  const velocity = clamp(confidence - pressure * 0.28);
  const routes = [
    { id: 'APPROVE', x: 50, y: 16, weight: clamp(confidence * 0.8), source: 'worldVector.today.observation.confidence' },
    { id: 'DENY', x: 82, y: 39, weight: clamp(warningCount / 8), source: 'initialState.systemHealth.warnings.length' },
    { id: 'HOLD', x: 70, y: 74, weight: pressure, source: 'executionQueue + predictions + warnings pressure' },
    { id: 'INSPECT', x: 30, y: 74, weight: clamp((predictionCount + warningCount) / 20), source: 'predictionRegistry.entries + systemHealth.warnings' },
    { id: 'ROUTE', x: 18, y: 39, weight: clamp(queueCount / 10), source: 'initialState.executionQueue.length' },
  ];

  const core: RootSceneNode = {
    id: 'root-decision-core',
    label: 'ROOT',
    x: 50,
    y: 48,
    value: pct(velocity),
    status: warningCount ? 'watch' : 'stable',
    kind: 'core',
    source: 'derived from confidence and action pressure',
    meaning: 'Decision chamber core. It routes founder actions without simulating approval.',
    dataClass: 'derived',
  };

  const scene: RootSceneModel = {
    title: 'Founder Governance',
    subtitle: 'Decision chamber',
    nodes: [
      core,
      ...routes.map((route) => ({
        id: `route-${route.id.toLowerCase()}`,
        label: route.id,
        x: route.x,
        y: route.y,
        value: pct(route.weight),
        status: route.weight > 0.55 ? 'active' : route.weight > 0.18 ? 'watch' : 'idle',
        kind: 'decision-route',
        source: route.source,
        meaning: `${route.id} route pressure derived from live ROOT queue, predictions, warnings or confidence.`,
        dataClass: 'derived' as const,
      })),
    ],
    edges: routes.map((route) => ({
      id: `root-${route.id.toLowerCase()}`,
      from: core.id,
      to: `route-${route.id.toLowerCase()}`,
      weight: route.weight,
      kind: 'route',
      source: route.source,
      meaning: `${route.id} pressure vector.`,
    })),
    rings: [
      { id: 'decision-inner', radius: 14, weight: velocity, label: 'VEL', source: 'derived governance velocity', meaning: 'Action velocity after pressure.' },
      { id: 'decision-pressure', radius: 28, weight: pressure, label: 'PRS', source: 'queue, predictions and warnings', meaning: 'Decision pressure.' },
      { id: 'decision-boundary', radius: 40, weight: confidence, label: 'CONF', source: 'worldVector.today.observation.confidence', meaning: 'Confidence boundary.' },
    ],
    annotations: [],
    readouts: [
      { id: 'pressure', label: 'pressure', value: pct(pressure), source: 'queueCount + predictionCount + warningCount', meaning: 'Derived decision pressure.', dataClass: 'derived' },
      { id: 'velocity', label: 'velocity', value: pct(velocity), source: 'confidence - pressure', meaning: 'Derived decision velocity.', dataClass: 'derived' },
      { id: 'queue', label: 'queue', value: queueCount, source: 'initialState.executionQueue.length', meaning: 'Real action queue count.', dataClass: 'real' },
      { id: 'warnings', label: 'warnings', value: warningCount, source: 'initialState.systemHealth.warnings.length', meaning: 'Real warning count.', dataClass: 'real' },
    ],
  };

  return <RootSceneViewport model={scene} />;
}

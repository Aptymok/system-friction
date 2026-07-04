import { RootSceneViewport } from '../scene/RootSceneViewport';
import type { RootSceneModel, RootSceneNode } from '../scene/rootSceneTypes';
import { buildPredictionTopologyModel } from './predictionTopologyModel';

type Props = { entries: unknown[]; confidence: number };

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function buildPredictionScene(entries: unknown[], confidence: number): RootSceneModel {
  const model = buildPredictionTopologyModel(entries, confidence);
  const nowNode: RootSceneNode = {
    id: 'prediction-now',
    label: 'NOW',
    x: 10,
    y: 50,
    value: model.drafts.length,
    status: model.drafts.length ? 'active' : 'gated',
    kind: 'time-origin',
    source: 'initialState.predictionRegistry.entries.length',
    meaning: 'Current registry anchor. Hypothesis paths appear only when real registry entries exist.',
    dataClass: model.drafts.length ? 'real' : 'gated',
  };

  const nodes: RootSceneNode[] = [nowNode];
  const edges: RootSceneModel['edges'] = [];

  model.paths.forEach((path) => {
    const draft = model.drafts.find((item) => item.id === path.hypothesisId);
    path.nodes.forEach((pathNode, index) => {
      const nodeId = `${path.id}-${index}`;
      nodes.push({
        id: nodeId,
        label: index === path.nodes.length - 1 ? path.hypothesisId : `T+${index + 1}`,
        x: pathNode.x,
        y: pathNode.y,
        value: percent(pathNode.probability),
        status: draft?.approvalState ?? path.band,
        kind: index === path.nodes.length - 1 ? 'hypothesis' : 'probability-route',
        source: `${path.source}; ${draft?.evidenceBasis ?? 'predictionRegistry.entries'}`,
        meaning: draft ? `${draft.label}. Domain: ${draft.domain}. Evidence basis: ${draft.evidenceBasis}.` : 'Projected prediction route derived from registry data.',
        dataClass: 'mixed',
      });

      edges.push({
        id: `${path.id}-edge-${index}`,
        from: index === 0 ? nowNode.id : `${path.id}-${index - 1}`,
        to: nodeId,
        weight: pathNode.probability,
        kind: `probability-${path.band}`,
        source: path.source,
        meaning: 'Temporal route derived from the registered hypothesis probability.',
      });
    });
  });

  return {
    title: 'Prediction Registry',
    subtitle: 'Branching probability space',
    nodes,
    edges,
    rings: [
      { id: 'low-band', radius: 16, weight: 0.2, label: 'LOW', source: 'static probability band', meaning: 'Low probability band for route comparison.' },
      { id: 'mid-band', radius: 28, weight: 0.45, label: 'MID', source: 'static probability band', meaning: 'Middle probability band for route comparison.' },
      { id: 'high-band', radius: 40, weight: 0.72, label: 'HIGH', source: 'static probability band', meaning: 'High probability band for route comparison.' },
    ],
    annotations: ['NOW', 'T+1W', 'T+1M', 'T+3M', 'T+6M', 'T+12M'].map((label, index) => ({
      id: `prediction-axis-${label}`,
      label,
      x: [10, 18, 32, 46, 74, 88][index] ?? 88,
      y: 12,
      source: 'prediction scene temporal axis',
      meaning: 'Temporal marker for prediction verification windows.',
      dataClass: 'derived',
    })),
    readouts: [
      { id: 'drafts', label: 'entries', value: model.drafts.length, source: 'initialState.predictionRegistry.entries.length', meaning: 'Real prediction entries loaded into ROOT.', dataClass: 'real' },
      { id: 'risk', label: 'risk', value: percent(model.falsificationRisk), source: 'predictionTopologyModel.falsificationRisk', meaning: 'Derived falsification risk for loaded entries.', dataClass: model.drafts.length ? 'derived' : 'gated' },
      { id: 'calibration', label: 'calibration', value: percent(model.calibrationReadiness), source: 'predictionTopologyModel.calibrationReadiness', meaning: 'Derived calibration readiness for loaded entries.', dataClass: model.drafts.length ? 'derived' : 'gated' },
      { id: 'quality', label: 'quality', value: percent(model.qualityIndex), source: 'predictionTopologyModel.qualityIndex', meaning: 'Derived registry quality index.', dataClass: model.drafts.length ? 'derived' : 'gated' },
    ],
  };
}

export default function PredictionViewEngine({ entries, confidence }: Props) {
  return <RootSceneViewport model={buildPredictionScene(entries, confidence)} />;
}

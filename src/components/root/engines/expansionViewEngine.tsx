import { RootSceneViewport } from '../scene/RootSceneViewport';
import type { RootSceneModel } from '../scene/rootSceneTypes';
import { buildRootExpansionModel } from '../rootExpansionModel';

type Props = { confidence: number; amvCount: number; predictionCount: number; evidenceCount: number };

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export default function ExpansionViewEngine(props: Props) {
  const model = buildRootExpansionModel(props);
  const themeNodes = model.themes.map((theme, index) => {
    const angle = (index / model.themes.length) * Math.PI * 2 - Math.PI / 2;
    const radius = 20 + theme.persistence * 26;
    return {
      id: `theme-${theme.id}`,
      label: theme.recommendation.toUpperCase(),
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      value: pct(theme.persistence),
      status: theme.recommendation,
      kind: 'opportunity',
      source: theme.source,
      meaning: `${theme.label}. Velocity ${pct(theme.velocity)}. Recommendation ${theme.recommendation}.`,
      dataClass: 'derived' as const,
    };
  });

  const scene: RootSceneModel = {
    title: 'Expansion Investigation',
    subtitle: 'Opportunity field',
    nodes: [
      {
        id: 'expansion-core',
        label: 'ROOT',
        x: 50,
        y: 50,
        value: 'DER',
        status: 'derived',
        kind: 'core',
        source: model.source,
        meaning: 'Derived opportunity field. It indicates investigation pressure, not a completed external publication.',
        dataClass: 'derived',
      },
      ...themeNodes,
    ],
    edges: themeNodes.map((node) => ({
      id: `expansion-${node.id}`,
      from: 'expansion-core',
      to: node.id,
      weight: Number.parseInt(String(node.value), 10) / 100,
      kind: node.status,
      source: node.source,
      meaning: `${node.label} opportunity route derived from current ROOT signals.`,
    })),
    rings: [
      { id: 'study-field', radius: 18, weight: .35, label: 'STUDY', source: 'rootExpansionModel recommendations', meaning: 'Study route band.' },
      { id: 'build-field', radius: 31, weight: model.attractorIndex, label: 'BUILD', source: 'rootExpansionModel.attractorIndex', meaning: 'Build route band.' },
      { id: 'hold-field', radius: 44, weight: 1 - model.attractorIndex, label: 'HOLD', source: 'rootExpansionModel.attractorIndex', meaning: 'Hold route band.' },
    ],
    annotations: [{ id: 'derived-label', label: 'DERIVED', x: 50, y: 12, source: model.source, meaning: 'Scene values are derived from existing ROOT counts.', dataClass: 'derived' }],
    readouts: [
      { id: 'themes', label: 'themes', value: model.themes.length, source: 'rootExpansionModel.themes.length', meaning: 'Derived opportunity theme count.', dataClass: 'derived' },
      { id: 'investigations', label: 'investigations', value: model.investigations.length, source: 'rootExpansionModel.investigations.length', meaning: 'Derived investigation queue count.', dataClass: 'derived' },
      { id: 'attractor', label: 'attractor', value: pct(model.attractorIndex), source: 'rootExpansionModel.attractorIndex', meaning: 'Derived attractor persistence index.', dataClass: 'derived' },
      { id: 'data-class', label: 'data', value: 'DERIVED', source: model.source, meaning: 'All expansion routes are derived from live ROOT counts.', dataClass: 'derived' },
    ],
  };

  return <RootSceneViewport model={scene} />;
}

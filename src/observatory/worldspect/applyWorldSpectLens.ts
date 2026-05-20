import { getWorldSpectCategoryConfig, type WorldSpectCategory } from './worldSpectCategories';
import type { GraphMode } from '@/observatory/laboratory/graphModes';

export type LensGraphNode = {
  id: string;
  label: string;
  cluster?: string;
  weight?: number;
  opacity?: number;
};

export type LensGraphEdge = {
  from: string;
  to: string;
  strength?: number;
};

export type WorldSpectLensState = {
  nodes: LensGraphNode[];
  edges: LensGraphEdge[];
  prioritizedNodes: string[];
  suppressedNodes: string[];
  graphModes: GraphMode[];
  suggestedProcesses: string[];
  visibleReading: string;
  category: WorldSpectCategory;
};

export function applyWorldSpectLens(input: {
  baseGraph: { nodes: LensGraphNode[]; edges: LensGraphEdge[] };
  category: WorldSpectCategory;
  worldSpectSnapshot?: Record<string, unknown> | null;
  intentProfile?: string;
  cognitiveTwinUxState?: Record<string, unknown> | null;
}): WorldSpectLensState {
  const config = getWorldSpectCategoryConfig(input.category);
  const prioritized = new Set(config.prioritizedSurfaceNodes.map((node) => node.toLowerCase()));
  const suppressed = new Set(config.suppressedSurfaceNodes.map((node) => node.toLowerCase()));
  const nodes = input.baseGraph.nodes.map((node) => {
    const key = node.label.toLowerCase();
    const isPriority = prioritized.has(key) || config.prioritizedSurfaceNodes.some((item) => key.includes(item.toLowerCase()));
    const isSuppressed = suppressed.has(key) || config.suppressedSurfaceNodes.some((item) => key.includes(item.toLowerCase()));
    return {
      ...node,
      weight: isPriority ? 1 : isSuppressed ? 0.28 : node.weight ?? 0.58,
      opacity: isPriority ? 1 : isSuppressed ? 0.26 : 0.62,
    };
  });
  const edges = input.baseGraph.edges.map((edge) => {
    const from = nodes.find((node) => node.id === edge.from);
    const to = nodes.find((node) => node.id === edge.to);
    const touchesPriority = Boolean(from?.weight === 1 || to?.weight === 1);
    return { ...edge, strength: touchesPriority ? 0.92 : edge.strength ?? 0.36 };
  });
  const hasSnapshot = Boolean(input.worldSpectSnapshot);
  return {
    nodes,
    edges,
    prioritizedNodes: nodes.filter((node) => node.weight === 1).map((node) => node.id),
    suppressedNodes: nodes.filter((node) => node.opacity !== undefined && node.opacity < 0.4).map((node) => node.id),
    graphModes: config.preferredGraphModes,
    suggestedProcesses: config.suggestedProcesses,
    visibleReading: hasSnapshot
      ? `${config.label}: ${config.description} Recomendacion: ${config.suggestedProcesses[0]}.`
      : 'WorldSpect sin medicion vigente. La lente queda preparada.',
    category: input.category,
  };
}

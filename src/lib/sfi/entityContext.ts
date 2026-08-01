import { readOperationalConsoleState } from './operationalConsole';
import type { CanonicalEntityGraph } from './entityGraph';

export type EntityContext = {
  entityId: string;
  entitySummary: string[];
  graphSnapshot: CanonicalEntityGraph;
  timeline: Array<{ step: string; value: string }>;
};

export async function buildEntityContext(graph: CanonicalEntityGraph, entityId: string): Promise<EntityContext> {
  const operationalState = await readOperationalConsoleState();
  const metrics = [
    `${graph.nodes.length} nodos institucionales disponibles`,
    `${graph.edges.length} relaciones del grafo cargadas`,
  ];

  if (operationalState.ok) {
    metrics.push('estado operacional recuperado desde las vistas canónicas');
  } else {
    metrics.push('sin datos operativos disponibles en la sesión actual');
  }

  return {
    entityId,
    entitySummary: metrics,
    graphSnapshot: graph,
    timeline: [
      { step: 'Graph', value: graph.nodes.length > 0 ? 'Grafo institucional encontrado' : 'Sin nodos del grafo disponibles' },
      { step: 'Operational state', value: operationalState.ok ? 'Vista operacional leída' : 'Vista operacional no disponible' },
      { step: 'Entity', value: entityId },
    ],
  };
}

export function collectEntityTimeline(context: EntityContext) {
  return context.timeline.map((item) => `${item.step}: ${item.value}`);
}

export function resolveEntityTrajectory(context: EntityContext) {
  return context.timeline.map((item) => item.step);
}

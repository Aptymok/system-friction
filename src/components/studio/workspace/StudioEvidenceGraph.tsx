import { EntityLink } from '@/components/entity/EntityLink';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioEvidenceGraph({ state }: { state: StudioProductionState }) {
  const nodes = state.fieldGraph.nodes.slice(0, 18);
  const edges = state.fieldGraph.edges.slice(0, 24);
  return (
    <section className="studio-evidence-graph" aria-label="Evidence graph">
      <header><span>EVIDENCE GRAPH</span><strong>{nodes.length} nodes / {edges.length} edges</strong></header>
      <div className="studio-evidence-graph__columns">
        <ol>
          {nodes.map((node) => (
            <li key={node.id}>
              <strong>{node.label}</strong>
              <span>{node.type} / {node.status}</span>
              {node.type === 'evidence' ? <EntityLink entityId={node.evidenceIds[0]} entityType="EVIDENCE" compact /> : null}
            </li>
          ))}
        </ol>
        <ol>
          {edges.map((edge) => (
            <li key={`${edge.from}-${edge.to}-${edge.relationType}`}>
              <span>{edge.from}</span>
              <strong>{edge.relationType}</strong>
              <span>{edge.to}</span>
              <em>{edge.confidence.toFixed(3)}</em>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

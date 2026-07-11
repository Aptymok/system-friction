import type { RootEvidenceEdge, RootEvidenceNode } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from '../sovereignTypes';

function position(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const ring = index % 3 === 0 ? 108 : index % 3 === 1 ? 176 : 236;
  return { x: 320 + Math.cos(angle) * ring, y: 250 + Math.sin(angle) * ring };
}

export function EvidenceGraph({ nodes, edges, onSelect }: { nodes: RootEvidenceNode[]; edges: RootEvidenceEdge[]; onSelect: (selection: RootSelection) => void }) {
  const visibleNodes = nodes.slice(0, 36); const positions = new Map(visibleNodes.map((node, index) => [node.id, position(index, visibleNodes.length)]));
  if (!visibleNodes.length) return <div className="rs-empty"><b>SIN EVIDENCIA</b><p>No hay nodos persistidos. El atlas no genera sustitutos.</p></div>;
  return <div className="rs-graph"><div className="rs-graph-legend"><span>LAYOUT DERIVED</span><strong>RELATIONSHIPS OBSERVED</strong></div><svg viewBox="0 0 640 500" role="img" aria-label="Persisted evidence graph">{edges.slice(0, 80).map((edge) => { const from = positions.get(edge.from); const to = positions.get(edge.to); return from && to ? <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} data-relation={edge.relation} opacity={edge.weight ?? 0.45} /> : null; })}{visibleNodes.map((node) => { const point = positions.get(node.id)!; return <g key={node.id} role="button" tabIndex={0} transform={`translate(${point.x} ${point.y})`} onClick={() => onSelect({ kind: 'evidence node', id: node.id, title: node.label, source: node.source, observedAt: node.observedAt, confidence: node.confidence, evidenceIds: node.evidenceIds, warning: null, data: node })} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') event.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true })); }}><circle r={Math.max(5, 6 + Math.min(node.evidenceIds.length, 6))} /><text y="-12">{node.label.slice(0, 18)}</text></g>; })}</svg></div>;
}

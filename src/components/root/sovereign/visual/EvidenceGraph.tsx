'use client';

import { useMemo, useState } from 'react';
import type { RootEvidenceEdge, RootEvidenceNode } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from '../sovereignTypes';

type Depth = 1 | 2 | 3 | 'all';

function finite(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validNode(node: RootEvidenceNode) {
  return Boolean(node?.id?.trim() && node?.label?.trim());
}

function dedupeNodes(nodes: RootEvidenceNode[]) {
  const map = new Map<string, RootEvidenceNode>();
  for (const node of nodes) {
    if (!validNode(node) || map.has(node.id)) continue;
    map.set(node.id, node);
  }
  return [...map.values()];
}

function validEdges(edges: RootEvidenceEdge[], ids: Set<string>) {
  const map = new Map<string, RootEvidenceEdge>();
  for (const edge of edges) {
    if (!edge?.id?.trim() || !edge.from?.trim() || !edge.to?.trim()) continue;
    if (!ids.has(edge.from) || !ids.has(edge.to) || map.has(edge.id)) continue;
    map.set(edge.id, edge);
  }
  return [...map.values()];
}

function degrees(nodes: RootEvidenceNode[], edges: RootEvidenceEdge[]) {
  const result = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    result.set(edge.from, (result.get(edge.from) ?? 0) + 1);
    result.set(edge.to, (result.get(edge.to) ?? 0) + 1);
  }
  return result;
}

function levels(anchor: string | null, nodes: RootEvidenceNode[], edges: RootEvidenceEdge[]) {
  const result = new Map<string, number>();
  if (!anchor) return result;
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
  }
  const queue = [anchor];
  result.set(anchor, 0);
  while (queue.length) {
    const current = queue.shift()!;
    const next = (result.get(current) ?? 0) + 1;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (result.has(neighbor)) continue;
      result.set(neighbor, next);
      queue.push(neighbor);
    }
  }
  const detached = Math.max(0, ...result.values()) + 1;
  for (const node of nodes) if (!result.has(node.id)) result.set(node.id, detached);
  return result;
}

function safeSelection(node: RootEvidenceNode, degree: number): RootSelection {
  return {
    kind: 'evidence-node',
    id: node.id,
    title: node.label,
    source: node.source,
    observedAt: node.observedAt,
    confidence: node.confidence,
    evidenceIds: Array.isArray(node.evidenceIds) ? node.evidenceIds.filter((item) => typeof item === 'string') : [],
    warning: null,
    // Do not push arbitrary historical payloads into client selection state. The
    // semantic-context route reconstructs detail from persisted source records.
    data: {
      nodeType: node.type,
      epistemicClass: node.epistemicClass,
      confidence: node.confidence,
      lineage: Array.isArray(node.lineage) ? node.lineage.filter((item) => typeof item === 'string') : [],
      degree,
    },
  };
}

export function EvidenceGraph({ nodes, edges, onSelect }: { nodes: RootEvidenceNode[]; edges: RootEvidenceEdge[]; onSelect: (selection: RootSelection) => void }) {
  const cleanNodes = useMemo(() => dedupeNodes(nodes), [nodes]);
  const nodeIds = useMemo(() => new Set(cleanNodes.map((node) => node.id)), [cleanNodes]);
  const cleanEdges = useMemo(() => validEdges(edges, nodeIds), [edges, nodeIds]);
  const nodeDegrees = useMemo(() => degrees(cleanNodes, cleanEdges), [cleanNodes, cleanEdges]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth>(2);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const autoAnchor = useMemo(() => [...cleanNodes].sort((a, b) => (nodeDegrees.get(b.id) ?? 0) - (nodeDegrees.get(a.id) ?? 0))[0]?.id ?? null, [cleanNodes, nodeDegrees]);
  const anchor = focusId && nodeIds.has(focusId) ? focusId : autoAnchor;
  const nodeLevels = useMemo(() => levels(anchor, cleanNodes, cleanEdges), [anchor, cleanNodes, cleanEdges]);
  const maxDepth = depth === 'all' ? Number.POSITIVE_INFINITY : depth;
  const visibleNodes = useMemo(() => cleanNodes
    .filter((node) => (nodeLevels.get(node.id) ?? Number.POSITIVE_INFINITY) <= maxDepth)
    .sort((a, b) => (nodeLevels.get(a.id) ?? 99) - (nodeLevels.get(b.id) ?? 99) || (nodeDegrees.get(b.id) ?? 0) - (nodeDegrees.get(a.id) ?? 0)), [cleanNodes, nodeLevels, maxDepth, nodeDegrees]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => cleanEdges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)), [cleanEdges, visibleIds]);

  const points = useMemo(() => {
    const byLevel = new Map<number, RootEvidenceNode[]>();
    for (const node of visibleNodes) {
      const level = nodeLevels.get(node.id) ?? 0;
      byLevel.set(level, [...(byLevel.get(level) ?? []), node]);
    }
    const result = new Map<string, { x: number; y: number }>();
    for (const [level, group] of byLevel.entries()) {
      if (level === 0) {
        group.forEach((node) => result.set(node.id, { x: 500, y: 350 }));
        continue;
      }
      const radius = Math.min(300, 90 + level * 80);
      group.sort((a, b) => (nodeDegrees.get(b.id) ?? 0) - (nodeDegrees.get(a.id) ?? 0) || a.label.localeCompare(b.label));
      group.forEach((node, index) => {
        const angle = -Math.PI / 2 + (index / Math.max(1, group.length)) * Math.PI * 2 + level * 0.23;
        result.set(node.id, { x: 500 + Math.cos(angle) * radius, y: 350 + Math.sin(angle) * radius });
      });
    }
    return result;
  }, [visibleNodes, nodeLevels, nodeDegrees]);

  if (!cleanNodes.length) return <div className="rs-empty"><b>SIN EVIDENCIA</b><p>No hay nodos persistidos válidos. El atlas no genera sustitutos.</p></div>;

  const quarantinedNodes = Math.max(0, nodes.length - cleanNodes.length);
  const quarantinedEdges = Math.max(0, edges.length - cleanEdges.length);
  const anchorNode = cleanNodes.find((node) => node.id === anchor) ?? null;

  return <div className={`rs-graph rs-graph-v2 ${expanded ? 'is-expanded' : ''}`}>
    <div className="rs-graph-toolbar">
      <div><span>GRAFO RELACIONAL</span><strong>{visibleNodes.length}/{cleanNodes.length} N · {visibleEdges.length}/{cleanEdges.length} E</strong></div>
      <div className="rs-graph-actions">
        {([1, 2, 3, 'all'] as const).map((value) => <button type="button" key={String(value)} className={depth === value ? 'active' : ''} onClick={() => setDepth(value)}>{value === 'all' ? 'TODO' : `${value}S`}</button>)}
        <button type="button" onClick={() => setFocusId(null)}>AUTO</button>
        <button type="button" onClick={() => setZoom((value) => Math.max(.55, Number((value - .15).toFixed(2))))}>−</button>
        <button type="button" onClick={() => setZoom((value) => Math.min(2.4, Number((value + .15).toFixed(2))))}>+</button>
        <button type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? 'CERRAR' : 'AMPLIAR'}</button>
      </div>
    </div>
    {(quarantinedNodes || quarantinedEdges) ? <div className="rs-graph-quarantine">CUARENTENA DE LECTURA · {quarantinedNodes} N · {quarantinedEdges} E inválidos/duplicados fuera del grafo activo</div> : null}
    <div className="rs-graph-stage">
      <svg viewBox="0 0 1000 700" role="img" aria-label="Persisted evidence graph">
        <defs><marker id="atlas-evidence-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" /></marker></defs>
        <g transform={`translate(${500 * (1 - zoom)} ${350 * (1 - zoom)}) scale(${zoom})`}>
          {visibleEdges.map((edge) => {
            const from = points.get(edge.from); const to = points.get(edge.to);
            if (!from || !to) return null;
            const focused = edge.from === anchor || edge.to === anchor;
            return <g key={edge.id} className={focused ? 'edge-focused' : ''}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} opacity={Math.max(.12, Math.min(1, finite(edge.weight, .45)))} markerEnd="url(#atlas-evidence-arrow)" />{focused ? <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8}>{edge.relation.slice(0, 42)}</text> : null}</g>;
          })}
          {visibleNodes.map((node) => {
            const point = points.get(node.id); if (!point) return null;
            const focused = node.id === anchor;
            const degree = nodeDegrees.get(node.id) ?? 0;
            return <g key={node.id} role="button" tabIndex={0} className={focused ? 'node-focused' : ''} transform={`translate(${point.x} ${point.y})`} onClick={() => { setFocusId(node.id); onSelect(safeSelection(node, degree)); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setFocusId(node.id); onSelect(safeSelection(node, degree)); } }}><circle r={focused ? 10 : Math.min(8, 5 + degree * .35)} /><text y={focused ? -16 : -12}>{node.label.slice(0, focused ? 34 : 20)}</text><title>{`${node.label}\n${node.type} · ${node.epistemicClass}\n${degree} relaciones`}</title></g>;
          })}
        </g>
      </svg>
    </div>
    <div className="rs-graph-footer"><span>FOCO · {anchorNode?.label ?? 'MISSING'}</span><span>ZOOM · {Math.round(zoom * 100)}%</span><span>LAYOUT DERIVED · RELACIONES PERSISTIDAS</span></div>
    <style jsx>{`
      .rs-graph-v2{position:relative;min-height:620px;border:1px solid rgba(200,169,81,.18);background:#050504;overflow:hidden}.rs-graph-v2.is-expanded{position:fixed;z-index:180;inset:16px;min-height:0;background:#050504;box-shadow:0 24px 100px rgba(0,0,0,.85)}.rs-graph-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid rgba(200,169,81,.12)}.rs-graph-toolbar span,.rs-graph-footer,.rs-graph-quarantine{font-size:8px;letter-spacing:.12em;color:#777064}.rs-graph-toolbar strong{display:block;margin-top:4px;color:#cbb675;font-size:10px}.rs-graph-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.rs-graph-actions button{border:1px solid rgba(200,169,81,.2);background:#090908;color:#9c8d69;padding:6px 8px;font-size:8px;cursor:pointer}.rs-graph-actions button.active,.rs-graph-actions button:hover{border-color:#8d7540;color:#e0c674}.rs-graph-quarantine{padding:7px 12px;border-bottom:1px solid rgba(184,80,80,.2);color:#b18472}.rs-graph-stage{height:540px;overflow:hidden}.is-expanded .rs-graph-stage{height:calc(100vh - 130px)}.rs-graph-stage svg{width:100%;height:100%}.rs-graph-stage line{stroke:#8d7540;stroke-width:1}.rs-graph-stage path{fill:#8d7540}.rs-graph-stage .edge-focused line{stroke:#d9bd70;stroke-width:1.5}.rs-graph-stage g>text{fill:#8b816e;font-size:9px;text-anchor:middle;pointer-events:none}.rs-graph-stage .edge-focused text{fill:#a99665;font-size:8px}.rs-graph-stage circle{fill:#070706;stroke:#9b844b;stroke-width:1.2;cursor:pointer}.rs-graph-stage .node-focused circle{fill:#b89d58;stroke:#ead080;stroke-width:2}.rs-graph-stage .node-focused text{fill:#ead080}.rs-graph-footer{display:flex;justify-content:space-between;gap:12px;padding:8px 12px;border-top:1px solid rgba(200,169,81,.12)}@media(max-width:760px){.rs-graph-toolbar{align-items:flex-start;flex-direction:column}.rs-graph-stage{height:480px}.rs-graph-footer{flex-direction:column}.rs-graph-v2.is-expanded{inset:4px}}
    `}</style>
  </div>;
}

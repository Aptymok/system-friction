'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import './RootNeuralGraphView.css';

type GraphNode = {
  id: string;
  label: string;
  type: string;
  origin: string;
  provenance: string;
  lineage: string[];
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
  origin: string;
};

type GraphPayload = {
  sourceState: 'observed' | 'degraded' | 'missing';
  degradedReason: string | null;
  readPlane: 'SUPABASE' | 'NEON' | 'PROJECTION' | 'UNAVAILABLE';
  primaryDiagnostic: string | null;
  loadedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type Position = { x: number; y: number };

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function nodeTone(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('document')) return '#d5b36f';
  if (normalized.includes('series')) return '#9f8452';
  if (normalized.includes('pattern')) return '#b8866b';
  if (normalized.includes('mihm')) return '#c6654e';
  return '#8e846e';
}

function short(value: string, max = 34) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function date(value: string | null) {
  if (!value) return 'MISSING';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString('es-MX');
}

function buildPositions(nodes: GraphNode[]) {
  const types = [...new Set(nodes.map((node) => node.type))].sort();
  const typeIndex = new Map(types.map((type, index) => [type, index]));
  const width = 1180;
  const height = 700;
  const positions = new Map<string, Position>();

  for (const node of nodes) {
    const group = typeIndex.get(node.type) ?? 0;
    const groupAngle = (Math.PI * 2 * group) / Math.max(1, types.length) - Math.PI / 2;
    const centerRadiusX = types.length <= 2 ? 230 : 330;
    const centerRadiusY = types.length <= 2 ? 150 : 210;
    const centerX = width / 2 + Math.cos(groupAngle) * centerRadiusX;
    const centerY = height / 2 + Math.sin(groupAngle) * centerRadiusY;
    const seed = hash(node.id);
    const localAngle = ((seed % 360) / 180) * Math.PI;
    const localRadius = 24 + ((seed >>> 8) % 112);
    positions.set(node.id, {
      x: Math.max(38, Math.min(width - 38, centerX + Math.cos(localAngle) * localRadius)),
      y: Math.max(38, Math.min(height - 38, centerY + Math.sin(localAngle) * localRadius * 0.72)),
    });
  }

  return { positions, types, width, height };
}

export function RootNeuralGraphView({ graph }: { graph: GraphPayload }) {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const degree = useMemo(() => {
    const values = new Map<string, number>();
    for (const edge of graph.edges) {
      values.set(edge.source, (values.get(edge.source) ?? 0) + 1);
      values.set(edge.target, (values.get(edge.target) ?? 0) + 1);
    }
    return values;
  }, [graph.edges]);

  const allTypes = useMemo(
    () => [...new Set(graph.nodes.map((node) => node.type))].sort(),
    [graph.nodes],
  );

  const visibleNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return graph.nodes.filter((node) => {
      if (activeType !== 'ALL' && node.type !== activeType) return false;
      if (!needle) return true;
      return [node.label, node.type, node.origin, node.provenance, ...node.lineage]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [activeType, graph.nodes, query]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [graph.edges, visibleNodeIds],
  );

  const topology = useMemo(() => buildPositions(graph.nodes), [graph.nodes]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
  const selectedEdges = useMemo(
    () => selected
      ? graph.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id).slice(0, 40)
      : [],
    [graph.edges, selected],
  );

  const labelled = useMemo(() => {
    const candidates = [...visibleNodes]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 18)
      .map((node) => node.id);
    if (selectedId && !candidates.includes(selectedId)) candidates.push(selectedId);
    return new Set(candidates);
  }, [degree, selectedId, visibleNodes]);

  const continuity = graph.readPlane === 'NEON';
  const graphObserved = graph.sourceState === 'observed';
  const typeCount = allTypes.length;

  return (
    <main className="neuralGraphShell" data-neural-graph-contract="SFI-ROOT-NEURAL-GRAPH-1.0">
      <header className="neuralGraphHeader">
        <div>
          <span className="neuralGraphEyebrow">ROOT · NEURAL GRAPH · CANONICAL GRAPH STORE</span>
          <h1>La institución como topología observable.</h1>
          <p>
            Esta vista no inventa conexiones. Proyecta nodos y relaciones persistidos, conserva procedencia
            y separa relación documental de validación, causalidad o autoridad.
          </p>
        </div>
        <div className="neuralGraphHeaderActions">
          <Link href="/root">← ROOT</Link>
          <Link href="/library">LIBRARY</Link>
        </div>
      </header>

      <section className="neuralGraphPulse" aria-label="Estado del Neural Graph">
        <article><span>NODOS</span><strong>{graph.nodes.length}</strong><small>persistidos + proyección canónica</small></article>
        <article><span>RELACIONES</span><strong>{graph.edges.length}</strong><small>aristas visibles en perfil SFI</small></article>
        <article data-state={graph.readPlane}><span>READ PLANE</span><strong>{graph.readPlane}</strong><small>{continuity ? 'Continuidad activa' : graph.readPlane === 'SUPABASE' ? 'Primario activo' : 'Proyección / no disponible'}</small></article>
        <article data-state={graph.sourceState}><span>GRAPH STATE</span><strong>{graph.sourceState.toUpperCase()}</strong><small>{graphObserved ? 'persisted graph observed' : 'degraded projection'}</small></article>
        <article><span>ONTOLOGY TYPES</span><strong>{typeCount}</strong><small>{allTypes.slice(0, 3).join(' · ') || 'MISSING'}</small></article>
      </section>

      <section className="neuralGraphBoundary">
        <strong>RELACIÓN ≠ CAUSALIDAD.</strong>
        <span>DECLARED / DOCUMENTARY ≠ VALIDATED · CONNECTION ≠ AUTHORITY · GRAPH ≠ RETURN.</span>
      </section>

      <section className="neuralGraphControls">
        <label>
          <span>BUSCAR EN TOPOLOGÍA</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="nodo, tipo, procedencia, lineage…"
          />
        </label>
        <div className="neuralGraphFilters" aria-label="Filtrar por tipo de nodo">
          <button className={activeType === 'ALL' ? 'active' : ''} onClick={() => setActiveType('ALL')}>TODO · {graph.nodes.length}</button>
          {allTypes.map((type) => (
            <button key={type} className={activeType === type ? 'active' : ''} onClick={() => setActiveType(type)}>
              {type.toUpperCase()} · {graph.nodes.filter((node) => node.type === type).length}
            </button>
          ))}
        </div>
      </section>

      <div className="neuralGraphLayout">
        <section className="neuralGraphCanvas" aria-label="Topología del grafo canónico">
          <div className="neuralGraphCanvasMeta">
            <span>VISIBLE {visibleNodes.length} NODES · {visibleEdges.length} EDGES</span>
            <span>LOADED {date(graph.loadedAt)}</span>
          </div>
          <svg viewBox={`0 0 ${topology.width} ${topology.height}`} role="img" aria-label="Neural Graph de System Friction Institute">
            <defs>
              <radialGradient id="sfiGraphGlow">
                <stop offset="0%" stopColor="#d5b36f" stopOpacity=".18" />
                <stop offset="100%" stopColor="#d5b36f" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={topology.width / 2} cy={topology.height / 2} r="310" fill="url(#sfiGraphGlow)" />
            {visibleEdges.map((edge) => {
              const from = topology.positions.get(edge.source);
              const to = topology.positions.get(edge.target);
              if (!from || !to) return null;
              const selectedEdge = selectedId === edge.source || selectedId === edge.target;
              return (
                <line
                  key={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={selectedEdge ? 'graphEdge selected' : 'graphEdge'}
                  strokeWidth={selectedEdge ? 1.4 : Math.max(.35, Math.min(1, edge.weight || .35))}
                />
              );
            })}
            {visibleNodes.map((node) => {
              const position = topology.positions.get(node.id);
              if (!position) return null;
              const selectedNode = selectedId === node.id;
              const showLabel = labelled.has(node.id);
              const radius = selectedNode ? 7 : 2.8 + Math.min(3.2, (degree.get(node.id) ?? 0) * .22);
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label}, ${node.type}`}
                  onClick={() => setSelectedId(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedId(node.id);
                  }}
                  className={selectedNode ? 'graphNode selected' : 'graphNode'}
                >
                  <circle cx={position.x} cy={position.y} r={radius + (selectedNode ? 8 : 3)} className="graphNodeHalo" />
                  <circle cx={position.x} cy={position.y} r={radius} fill={nodeTone(node.type)} />
                  {showLabel ? (
                    <text x={position.x + 9} y={position.y - 7} className="graphLabel">
                      {short(node.label)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          {!visibleNodes.length ? <div className="neuralGraphEmpty">No hay nodos que coincidan con este filtro.</div> : null}
        </section>

        <aside className="neuralGraphInspector">
          <div className="neuralGraphInspectorHead">
            <span>INSPECTOR</span>
            <strong>{selected ? selected.label : 'Selecciona un nodo'}</strong>
          </div>
          {selected ? (
            <>
              <dl>
                <div><dt>TYPE</dt><dd>{selected.type}</dd></div>
                <div><dt>ORIGIN</dt><dd>{selected.origin}</dd></div>
                <div><dt>PROVENANCE</dt><dd>{selected.provenance}</dd></div>
                <div><dt>DEGREE</dt><dd>{degree.get(selected.id) ?? 0}</dd></div>
                <div><dt>ID</dt><dd>{selected.id}</dd></div>
              </dl>
              <section>
                <span>LINEAGE</span>
                {selected.lineage.length
                  ? selected.lineage.slice(0, 12).map((item) => <code key={item}>{item}</code>)
                  : <p>MISSING · no lineage adicional declarado.</p>}
              </section>
              <section>
                <span>RELACIONES</span>
                {selectedEdges.length ? selectedEdges.map((edge) => {
                  const outbound = edge.source === selected.id;
                  const other = nodeById.get(outbound ? edge.target : edge.source);
                  return (
                    <button
                      key={edge.id}
                      className="neuralGraphRelation"
                      onClick={() => setSelectedId(other?.id ?? null)}
                    >
                      <small>{outbound ? '→' : '←'} {edge.relation}</small>
                      <strong>{other?.label ?? (outbound ? edge.target : edge.source)}</strong>
                    </button>
                  );
                }) : <p>Sin relaciones visibles.</p>}
              </section>
            </>
          ) : (
            <p>Selecciona un nodo para ver procedencia, lineage y relaciones adyacentes. La vista no asigna significado causal a una arista.</p>
          )}
        </aside>
      </div>

      <footer className="neuralGraphFooter">
        <div>
          <span>RUNTIME</span>
          <p>{graphObserved ? 'Grafo canónico persistido disponible.' : 'Vista degradada: la proyección documental conserva observabilidad sin fingir persistencia.'}</p>
        </div>
        <div>
          <span>PRIMARY DIAGNOSTIC</span>
          <p>{graph.primaryDiagnostic ?? 'PRIMARY READ AVAILABLE'}</p>
        </div>
        <div>
          <span>CANONICAL GRAPH</span>
          <p>{graphObserved ? 'OBSERVED' : graph.sourceState.toUpperCase()} · {graph.degradedReason ?? 'NO DEGRADATION REPORTED'}</p>
        </div>
      </footer>
    </main>
  );
}

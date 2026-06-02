'use client';

import { useMemo, useState } from 'react';

type RuntimeNode = { label?: string; nodeKey?: string; id?: string; nodeType?: string; ontologyType?: string; runtimeState?: string; pressure?: number; degradation?: number; patterns?: unknown[]; variables?: unknown[]; linkedDocuments?: unknown[] };
type TwinState = { data?: { seed?: { nodeCatalog?: unknown[] } } };
type FreeNode = { id: string; label: string; type: string; x: number; y: number; pressure: number; degradation: number; color: string; shape: 'circle' | 'diamond' | 'square' | 'triangle' | 'hex' | 'dot'; links: number[] };

function asNode(value: unknown): RuntimeNode | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeNode : null; }
function arr(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function clamp01(value: number) { return Math.max(0, Math.min(1, value)); }
function hash(input: string) { let value = 2166136261; for (let i = 0; i < input.length; i += 1) value = Math.imul(value ^ input.charCodeAt(i), 16777619); return Math.abs(value >>> 0); }
function ratio(seed: number, salt: number) { const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453; return x - Math.floor(x); }
function labelOf(node: RuntimeNode) { return node.label || node.nodeKey || node.id || 'nodo'; }
function rawOf(node: RuntimeNode) { return `${node.nodeType || node.ontologyType || ''} ${node.nodeKey || ''} ${node.label || ''} ${arr(node.variables).join(' ')} ${arr(node.patterns).join(' ')}`.toLowerCase(); }
function pressureOf(node: RuntimeNode) { return typeof node.pressure === 'number' ? clamp01(node.pressure) : clamp01(0.16 + arr(node.patterns).length * 0.08 + arr(node.variables).length * 0.05); }
function degradationOf(node: RuntimeNode) { if (typeof node.degradation === 'number') return clamp01(node.degradation); const runtime = String(node.runtimeState || '').toLowerCase(); const docs = arr(node.linkedDocuments).length; return clamp01(pressureOf(node) * 0.38 + (docs === 0 ? 0.26 : 0.08) + (runtime === 'degraded' || runtime === 'missing' ? 0.24 : 0)); }
function colorOf(node: RuntimeNode, d: number) { const raw = rawOf(node); if (d > 0.62 || raw.includes('risk') || raw.includes('contradic') || raw.includes('friccion')) return '#C87060'; if (raw.includes('doc') || raw.includes('evidence') || raw.includes('mem') || raw.includes('atlas') || raw.includes('cuadernillo') || raw.includes('sobre')) return '#3B8BD4'; if (raw.includes('missing') || raw.includes('latent') || raw.includes('extern')) return '#5A5855'; return '#C8A951'; }
function shapeOf(node: RuntimeNode, color: string): FreeNode['shape'] { const raw = rawOf(node); if (raw.includes('acp') || raw.includes('govern') || raw.includes('policy')) return 'diamond'; if (raw.includes('doc') || raw.includes('evidence')) return 'square'; if (raw.includes('perturb') || raw.includes('risk') || raw.includes('change')) return 'triangle'; if (raw.includes('mihm') || raw.includes('metric') || raw.includes('ihg') || raw.includes('nti')) return 'hex'; if (color === '#5A5855') return 'dot'; return 'circle'; }

function buildNodes(twin: TwinState | null) {
  const rawNodes = (twin?.data?.seed?.nodeCatalog ?? []).map(asNode).filter(Boolean) as RuntimeNode[];
  const nodes = rawNodes.slice(0, 150).map((node, index): FreeNode => {
    const id = node.nodeKey || node.id || `${labelOf(node)}-${index}`;
    const seed = hash(`${id}:${labelOf(node)}`);
    const pressure = pressureOf(node);
    const degradation = degradationOf(node);
    const color = colorOf(node, degradation);
    return { id, label: labelOf(node), type: node.nodeType || node.ontologyType || 'node', x: 4 + ratio(seed, 1) * 92, y: 4 + ratio(seed, 2) * 92, pressure, degradation, color, shape: shapeOf(node, color), links: [] };
  });
  nodes.forEach((node, index) => { node.links = nodes.map((target, targetIndex) => ({ targetIndex, target, distance: Math.hypot(target.x - node.x, target.y - node.y) })).filter((item) => item.targetIndex !== index).sort((a, b) => a.distance + (a.target.color === node.color ? -8 : 0) - (b.distance + (b.target.color === node.color ? -8 : 0))).slice(0, 2).map((item) => item.targetIndex); });
  return nodes;
}

function NodeShape({ node, selected, onSelect }: { node: FreeNode; selected: boolean; onSelect: () => void }) {
  const r = 0.55 + node.pressure * 0.65 + node.degradation * 0.55;
  const common = { onClick: onSelect, className: 'cursor-pointer transition-opacity hover:opacity-100', opacity: selected ? 1 : node.color === '#5A5855' ? 0.42 : 0.72 };
  if (node.shape === 'diamond') return <rect {...common} x={node.x - r} y={node.y - r} width={r * 2} height={r * 2} transform={`rotate(45 ${node.x} ${node.y})`} fill={node.color} stroke="#F2E6B8" strokeWidth={selected ? 0.28 : 0.12} />;
  if (node.shape === 'square') return <rect {...common} x={node.x - r} y={node.y - r * 0.75} width={r * 2} height={r * 1.5} rx="0.25" fill={node.color} stroke="#C8A951" strokeWidth={selected ? 0.22 : 0.1} />;
  if (node.shape === 'triangle') return <polygon {...common} points={`${node.x},${node.y - r} ${node.x + r},${node.y + r} ${node.x - r},${node.y + r}`} fill={node.color} stroke="#F18B78" strokeWidth={selected ? 0.24 : 0.1} />;
  if (node.shape === 'hex') return <polygon {...common} points={[0, 1, 2, 3, 4, 5].map((i) => `${node.x + Math.cos(Math.PI / 6 + Math.PI * 2 * i / 6) * r},${node.y + Math.sin(Math.PI / 6 + Math.PI * 2 * i / 6) * r}`).join(' ')} fill={node.color} stroke="#C8A951" strokeWidth={selected ? 0.24 : 0.1} />;
  return <circle {...common} cx={node.x} cy={node.y} r={node.shape === 'dot' ? Math.max(0.25, r * 0.45) : r} fill={node.color} stroke={node.degradation > 0.62 ? '#F18B78' : '#C8A951'} strokeWidth={selected ? 0.22 : 0.08} />;
}

export function AcpFreeNodesView({ twin, onOpenTwin }: { twin: TwinState | null; onOpenTwin?: (node?: { label?: string }) => void }) {
  const nodes = useMemo(() => buildNodes(twin), [twin]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const degraded = nodes.filter((node) => node.degradation > 0.5).length;
  const critical = nodes.filter((node) => node.degradation > 0.75).length;

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-[#060605]">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs><radialGradient id="freeGlow"><stop offset="0%" stopColor="#C8A951" stopOpacity="0.14" /><stop offset="65%" stopColor="#3B8BD4" stopOpacity="0.035" /><stop offset="100%" stopColor="#060605" stopOpacity="0" /></radialGradient></defs>
        <rect width="100" height="100" fill="#060605" />
        <rect width="100" height="100" fill="url(#freeGlow)" />
        {Array.from({ length: 180 }).map((_, i) => <circle key={i} cx={(hash(`noise-x-${i}`) % 1000) / 10} cy={(hash(`noise-y-${i}`) % 1000) / 10} r="0.05" fill={i % 7 === 0 ? '#C8A951' : '#77736B'} opacity="0.22" />)}
        {nodes.flatMap((node) => node.links.map((targetIndex) => ({ node, target: nodes[targetIndex] })).filter((edge) => edge.target)).map((edge, index) => { const bad = edge.node.degradation > 0.62 || edge.target.degradation > 0.62; return <line key={index} x1={edge.node.x} y1={edge.node.y} x2={edge.target.x} y2={edge.target.y} stroke={bad ? '#C87060' : edge.node.color === edge.target.color ? edge.node.color : '#8A7035'} strokeWidth={bad ? 0.12 : 0.07} strokeDasharray={bad ? '0.7 0.35 0.2 0.35' : edge.node.color === edge.target.color ? undefined : '0.35 0.7'} opacity={bad ? 0.36 : 0.22} />; })}
        {nodes.map((node) => <NodeShape key={node.id} node={node} selected={selectedId === node.id} onSelect={() => setSelectedId(node.id)} />)}
        {selected ? <text x={selected.x} y={Math.min(98, selected.y + 2.8)} textAnchor="middle" fontSize="1.25" fill="#F2E6B8">{selected.label.slice(0, 28)}</text> : null}
      </svg>
      <div className="pointer-events-none absolute left-3 top-3 z-20 border border-[#1e1c17] bg-[#060605]/82 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.13em] text-[#c8a951]">Nodos libres · {nodes.length} reales · {degraded} degradados · {critical} criticos</div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-lg border border-[#1e1c17] bg-[#060605]/82 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">Vista suelta: sin anclaje por cluster. Los nodos flotan y muestran conexiones por cercania, tipo, presion y degradacion.</div>
      {selected ? <div className="absolute right-4 top-4 z-30 w-72 border border-[#2e2c24] bg-[#0e0d0b]/95 p-3 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a7035]">Nodo libre · {selected.type}</div><h3 className="mt-1 text-sm leading-5 text-[#ccc8bc]">{selected.label}</h3></div><button type="button" onClick={() => setSelectedId(null)} className="font-mono text-[10px] text-[#5a5855] hover:text-[#c8a951]">x</button></div><div className="mt-3 grid grid-cols-2 gap-1 font-mono text-[8px] uppercase tracking-[0.08em]"><div className="bg-[#181614] p-2 text-[#7a7568]">degradacion<br /><span className="text-[#c8a951]">{selected.degradation.toFixed(2)}</span></div><div className="bg-[#181614] p-2 text-[#7a7568]">presion<br /><span className="text-[#c8a951]">{selected.pressure.toFixed(2)}</span></div><div className="bg-[#181614] p-2 text-[#7a7568]">forma<br /><span className="text-[#c8a951]">{selected.shape}</span></div><div className="bg-[#181614] p-2 text-[#7a7568]">color<br /><span className="text-[#c8a951]">{selected.color}</span></div></div><p className="mt-3 text-xs leading-5 text-[#8a7568]">{selected.degradation > 0.75 ? 'Critico: pide al Twin accion de cierre o mandalo al Sobre Negro.' : selected.degradation > 0.5 ? 'Friccion activa: observalo o llevalo al Cuadernillo antes de reconectar.' : 'Estable: puede moverse si dejas registro.'}</p><button type="button" onClick={() => onOpenTwin?.({ label: selected.label })} className="mt-3 border border-[#8a7035] bg-[#2e2410] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#c8a951]">Abrir Twin</button></div> : null}
    </section>
  );
}

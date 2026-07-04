'use client';

import { useMemo, useState } from 'react';
import { RootContextDrawer } from './RootContextDrawer';
import { RootHoverTooltip } from './RootHoverTooltip';
import type { RootSceneEdge, RootSceneModel, RootSceneNode } from './rootSceneTypes';

type Props = { model: RootSceneModel };

function clamp01(value: number) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function colorFor(rawValue: unknown) { const raw = `${rawValue ?? ''}`.toLowerCase(); if (/(fail|error|critical|deny|bad|missing|degraded)/.test(raw)) return '#e36a52'; if (/(hold|queued|pending|watch|partial|gated|derived|mixed|study)/.test(raw)) return '#d8b651'; if (/(ok|live|active|stable|available|approved|real|build)/.test(raw)) return '#8bd27c'; return '#d9bd70'; }
function nodeColor(node: RootSceneNode) { return colorFor(node.status ?? node.kind ?? node.dataClass); }
function edgeColor(edge: RootSceneEdge) { return colorFor(edge.kind); }
function point(angle: number, radius: number) { const radians = (angle - 90) * Math.PI / 180; return { x: 50 + Math.cos(radians) * radius, y: 50 + Math.sin(radians) * radius }; }
function sectorPath(startAngle: number, endAngle: number, radius: number) { const start = point(startAngle, radius); const end = point(endAngle, radius); const large = endAngle - startAngle <= 180 ? 0 : 1; return `M 50 50 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y} Z`; }

export function RootSceneViewport({ model }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const nodesById = useMemo(() => new Map(model.nodes.map((node) => [node.id, node])), [model.nodes]);
  const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null;
  const hoveredNode = hoveredId ? nodesById.get(hoveredId) ?? null : null;
  const half = 50 / zoom;
  const viewBox = `${50 - half} ${50 - half} ${half * 2} ${half * 2}`;
  const starPoints = useMemo(() => Array.from({ length: 54 }, (_, index) => ({ id: `s-${index}`, x: (index * 37) % 100, y: (index * 61) % 100, opacity: .08 + (index % 5) * .035 })), []);

  return (
    <section className="root-scene-viewport" aria-label={`${model.title} ROOT scene`}>
      <header className="scene-heading"><div><span>{model.subtitle}</span><b>{model.title}</b></div><div className="scene-controls" aria-label="ROOT scene zoom controls"><button type="button" onClick={() => setZoom((value) => Math.max(1, Number((value - .15).toFixed(2))))} aria-label="Zoom out">-</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.75, Number((value + .15).toFixed(2))))} aria-label="Zoom in">+</button></div></header>
      <svg viewBox={viewBox} className="scene-svg" role="img" aria-label={model.title}>
        <defs><radialGradient id="rootPremiumGlow" cx="50%" cy="48%" r="54%"><stop offset="0%" stopColor="#d8b651" stopOpacity=".14" /><stop offset="52%" stopColor="#16455f" stopOpacity=".065" /><stop offset="100%" stopColor="#000" stopOpacity="0" /></radialGradient><pattern id="rootPremiumGrid" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M 4 0 L 0 0 0 4" fill="none" stroke="#d8b651" strokeOpacity=".055" strokeWidth=".055" /></pattern></defs>
        <rect x="0" y="0" width="100" height="100" fill="#030302" onClick={() => setSelectedId(null)} /><rect x="0" y="0" width="100" height="100" fill="url(#rootPremiumGrid)" opacity=".45" pointerEvents="none" /><circle cx="50" cy="50" r="49" fill="url(#rootPremiumGlow)" pointerEvents="none" />
        {starPoints.map((star) => <circle key={star.id} cx={star.x} cy={star.y} r=".12" fill="#efe5cc" opacity={star.opacity} pointerEvents="none" />)}
        {model.sectors?.map((sector) => <path key={sector.id} d={sectorPath(sector.startAngle, sector.endAngle, sector.radius)} fill="#d8b651" opacity={.018 + clamp01(sector.weight) * .05} stroke="#d8b651" strokeOpacity={.04 + clamp01(sector.weight) * .09} strokeWidth=".08" />)}
        {model.rings.map((ring) => <g key={ring.id}><circle cx="50" cy="50" r={ring.radius} fill="none" stroke="#d8b651" strokeOpacity={.08 + clamp01(ring.weight) * .22} strokeWidth={.07 + clamp01(ring.weight) * .18} strokeDasharray={ring.weight < .24 ? '1 1.8' : undefined} />{ring.label ? <text x={50 + ring.radius + 1.15} y="50" fill="#817660" fontSize="1.35" fontFamily="monospace">{ring.label}</text> : null}</g>)}
        {model.edges.map((edge) => { const from = nodesById.get(edge.from); const to = nodesById.get(edge.to); if (!from || !to) return null; return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edgeColor(edge)} strokeOpacity={.10 + clamp01(edge.weight) * .50} strokeWidth={.07 + clamp01(edge.weight) * .22} strokeDasharray={edge.kind.toLowerCase().includes('weak') || edge.kind.toLowerCase().includes('gated') ? '1 1.6' : undefined} pointerEvents="none" />; })}
        {model.annotations.map((annotation) => <text key={annotation.id} x={annotation.x} y={annotation.y} textAnchor="middle" fill="#817660" fontSize="1.55" fontFamily="monospace" letterSpacing=".08em">{annotation.label}</text>)}
        {model.nodes.map((node) => { const active = selectedId === node.id; const hovered = hoveredId === node.id; const color = nodeColor(node); const radius = node.kind === 'core' ? 5.8 : active ? 3.8 : hovered ? 3.55 : 3.05; const showLabel = active || hovered || node.kind === 'core' || model.nodes.length <= 10; return <g key={node.id} role="button" tabIndex={0} aria-label={`${node.label}: ${node.value ?? node.status ?? node.dataClass}`} onClick={(event) => { event.stopPropagation(); setSelectedId(node.id); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(node.id); } if (event.key === 'Escape') setSelectedId(null); }} onPointerEnter={() => setHoveredId(node.id)} onPointerLeave={() => setHoveredId((current) => current === node.id ? null : current)} className="scene-node"><circle cx={node.x} cy={node.y} r={radius + 3.4} fill={color} opacity={active ? '.14' : hovered ? '.10' : '.055'} /><circle cx={node.x} cy={node.y} r={radius} fill="#050403" stroke={color} strokeOpacity=".92" strokeWidth={active ? '.56' : '.34'} />{showLabel ? <text x={node.x} y={node.y - radius - 1.8} textAnchor="middle" fill="#f1d27b" fontSize="1.55" fontFamily="monospace">{node.label}</text> : null}{node.value !== undefined ? <text x={node.x} y={node.y + .8} textAnchor="middle" fill="#efe5cc" fontSize="1.55" fontFamily="monospace">{node.value}</text> : null}</g>; })}
      </svg>
      <RootHoverTooltip node={hoveredNode} position={hoveredNode ? { x: hoveredNode.x, y: hoveredNode.y } : null} />
      <RootContextDrawer node={selectedNode} onClose={() => setSelectedId(null)} />
      <footer className="scene-readout">{model.readouts.slice(0, 6).map((readout) => <span key={readout.id} title={`${readout.meaning} Source: ${readout.source}`}>{readout.label} <b>{readout.value}</b></span>)}</footer>
      <style jsx>{`.root-scene-viewport{position:relative;min-height:100%;overflow:hidden;border:1px solid rgba(216,182,81,.16);background:radial-gradient(circle at 50% 44%,rgba(216,182,81,.09),transparent 38%),linear-gradient(180deg,rgba(10,8,5,.72),rgba(2,2,2,.96));box-shadow:inset 0 1px 0 rgba(241,210,123,.08),0 24px 70px rgba(0,0,0,.38)}.root-scene-viewport:after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at center,transparent 49%,rgba(0,0,0,.48) 100%),repeating-linear-gradient(0deg,rgba(255,255,255,.014),rgba(255,255,255,.014) 1px,transparent 1px,transparent 5px);opacity:.65}.scene-heading{position:absolute;z-index:4;top:13px;left:15px;right:15px;display:flex;align-items:start;justify-content:space-between;gap:18px;pointer-events:none}.scene-heading span{display:block;font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#817660}.scene-heading b{display:block;margin-top:6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#f1d27b;font-weight:500}.scene-controls{display:flex;align-items:center;gap:7px;pointer-events:auto;border:1px solid rgba(216,182,81,.16);background:rgba(3,3,2,.72);padding:5px}.scene-controls button{width:24px;height:22px;border:1px solid rgba(216,182,81,.22);background:transparent;color:#f1d27b;cursor:pointer}.scene-controls span{min-width:42px;text-align:center;font-size:8px;letter-spacing:.08em;color:#9f947a}.scene-svg{position:absolute;inset:0;width:100%;height:100%;z-index:1}.scene-node{cursor:pointer;outline:none}.scene-node:focus circle:nth-of-type(2){stroke-width:.78}.scene-readout{position:absolute;z-index:4;left:18px;right:18px;bottom:14px;display:flex;align-items:center;justify-content:center;gap:12px;border:1px solid rgba(216,182,81,.13);background:rgba(3,3,2,.66);padding:8px;color:#817660;font-size:8px;letter-spacing:.13em;text-transform:uppercase;overflow:hidden;backdrop-filter:blur(12px)}.scene-readout span{white-space:nowrap}.scene-readout b{color:#f1d27b;font-weight:500}@media(max-width:900px){.root-scene-viewport{min-height:620px}.scene-heading{flex-direction:column}.scene-readout{justify-content:start;overflow-x:auto}}`}</style>
    </section>
  );
}

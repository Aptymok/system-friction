'use client';

import type { LaboratoryGraphNode, LaboratoryGraphState } from '@/observatory/laboratory/resolveLaboratoryGraph';
import type { WorldSpectCategory } from '@/observatory/worldspect/worldSpectCategories';
import type { WorldSpectLensState } from '@/observatory/worldspect/applyWorldSpectLens';
import { getWorldSpectCategoryConfig } from '@/observatory/worldspect/worldSpectCategories';
import type { LaboratoryViewMode } from '@/observatory/laboratory/laboratoryViewModes';
import { laboratoryViewModes } from '@/observatory/laboratory/laboratoryViewModes';

const colorMap: Record<string, string> = {
  gold: '#C8A951',
  blue: '#6e9ac8',
  purple: '#a070cc',
  green: '#6ec88a',
  amber: '#c8a05a',
  teal: '#48aa88',
  red: '#c86e6e',
};

function polar(index: number, total: number, radius: number, center = 50) {
  const angle = (-90 + (360 / total) * index) * Math.PI / 180;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function nodePosition(node: LaboratoryGraphNode, graph: LaboratoryGraphState, viewMode: LaboratoryViewMode) {
  if (node.ring === 0) return { x: 50, y: 50 };
  const ringOne = graph.nodes.filter((item) => item.ring === 1);
  if (viewMode === 'HIERARCHY') {
    if (node.ring === 1) {
      const index = Math.max(0, ringOne.findIndex((item) => item.id === node.id));
      return { x: 18 + (64 / Math.max(1, ringOne.length - 1 || 1)) * index, y: node.weight >= 1 ? 34 : 44 };
    }
    const processes = graph.nodes.filter((item) => item.ring === 2);
    const index = Math.max(0, processes.findIndex((item) => item.id === node.id));
    return { x: 24 + (52 / Math.max(1, processes.length - 1 || 1)) * index, y: 72 };
  }
  if (viewMode === 'TEMPORAL') {
    const all = graph.nodes.filter((item) => item.ring !== 0);
    const index = Math.max(0, all.findIndex((item) => item.id === node.id));
    return { x: 10 + (80 / Math.max(1, all.length - 1 || 1)) * index, y: node.ring === 1 ? 42 : 64 };
  }
  if (viewMode === 'MESH') {
    const all = graph.nodes.filter((item) => item.ring !== 0);
    const index = Math.max(0, all.findIndex((item) => item.id === node.id));
    const cols = Math.ceil(Math.sqrt(all.length));
    return { x: 22 + (index % cols) * (56 / Math.max(1, cols - 1 || 1)), y: 24 + Math.floor(index / cols) * 16 };
  }
  if (viewMode === 'WORLD') {
    const all = graph.nodes.filter((item) => item.ring !== 0);
    const index = Math.max(0, all.findIndex((item) => item.id === node.id));
    const zones = [{ x: 18, y: 34 }, { x: 50, y: 48 }, { x: 82, y: 36 }, { x: 34, y: 72 }, { x: 70, y: 72 }];
    const zone = zones[index % zones.length];
    return { x: zone.x + ((index * 13) % 9) - 4, y: zone.y + ((index * 7) % 9) - 4 };
  }
  if (node.ring === 1) {
    const index = Math.max(0, ringOne.findIndex((item) => item.id === node.id));
    return polar(index, Math.max(1, ringOne.length), node.weight >= 1 ? 28 : 34);
  }
  const activeCluster = graph.nodes.find((item) => item.ring === 1 && item.weight === 1)?.label || 'Auditoria';
  const parentIndex = Math.max(0, ringOne.findIndex((item) => item.label === activeCluster));
  const processNodes = graph.nodes.filter((item) => item.ring === 2);
  const processIndex = Math.max(0, processNodes.findIndex((item) => item.id === node.id));
  const spread = processNodes.length > 1 ? (processIndex - (processNodes.length - 1) / 2) * 11 : 0;
  const angle = (-90 + (360 / Math.max(1, ringOne.length)) * parentIndex + spread) * Math.PI / 180;
  return { x: 50 + Math.cos(angle) * 45, y: 50 + Math.sin(angle) * 45 };
}

function shapeClass(shape: LaboratoryGraphNode['shape']) {
  if (shape === 'double-circle') return 'doubleCircle';
  if (shape === 'rounded-square') return 'roundedSquare';
  return shape;
}

export function AtlasRadialField({
  graph,
  nodeLabel,
  activeCluster,
  activeProcess,
  activeWorldSpectCategory,
  worldSpectLensState,
  viewMode,
  selectedNodeId,
  onClusterSelect,
  onProcessSelect,
  onViewModeChange,
}: {
  graph: LaboratoryGraphState;
  nodeLabel: string;
  activeCluster: string;
  activeProcess?: string | null;
  activeWorldSpectCategory: WorldSpectCategory;
  worldSpectLensState?: WorldSpectLensState;
  viewMode: LaboratoryViewMode;
  selectedNodeId?: string | null;
  onClusterSelect: (cluster: string) => void;
  onProcessSelect: (process: string) => void;
  onViewModeChange: (mode: LaboratoryViewMode) => void;
}) {
  const category = getWorldSpectCategoryConfig(activeWorldSpectCategory);
  const positions = new Map(graph.nodes.map((node) => [node.id, nodePosition(node, graph, viewMode)]));
  const clusterNodes = graph.nodes.filter((node) => node.ring === 1);
  const processNodes = graph.nodes.filter((node) => node.ring === 2);
  const prioritized = new Set(worldSpectLensState?.prioritizedNodes || []);
  const suppressed = new Set(worldSpectLensState?.suppressedNodes || []);
  return (
    <section className="atlas-radial-field" aria-label="Campo radial ATLAS">
      <svg className="atlas-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="50" cy="50" r="31" />
        <circle cx="50" cy="50" r="43" />
        <circle cx="50" cy="50" r="18" className="inner" />
        {graph.edges.map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={`${edge.dashed ? 'dashed' : ''} ${edge.status || 'LATENT'}`}
              style={{ opacity: 0.08 + (edge.strength || 0.4) * 0.28 }}
            />
          );
        })}
      </svg>
      {graph.nodes.map((node) => {
        const pos = positions.get(node.id) || { x: 50, y: 50 };
        const color = colorMap[node.color];
        const isCenter = node.ring === 0;
        const isActive = node.label === activeCluster || node.label === activeProcess || node.id === 'center' || selectedNodeId === node.id;
        const lensHit = prioritized.has(node.id) || category.prioritizedSurfaceNodes.some((item) => node.label.toLowerCase().includes(item.toLowerCase()));
        const low = suppressed.has(node.id);
        return (
          <button
            key={node.id}
            type="button"
            className={`atlas-node ${shapeClass(node.shape)} ${isCenter ? 'center' : ''} ${isActive ? 'active' : ''} ${lensHit ? 'lens' : ''} ${low ? 'suppressed' : ''}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              ['--node-color' as string]: color,
              ['--node-scale' as string]: isCenter ? 1.28 : node.ring === 2 ? 0.72 + node.weight * 0.12 : 0.76 + node.weight * 0.34,
            }}
            onClick={() => node.ring === 2 ? onProcessSelect(node.label) : onClusterSelect(node.label)}
          >
            {lensHit && !isCenter ? <i>{category.symbol}</i> : null}
            <span>{isCenter ? nodeLabel : node.label}</span>
          </button>
        );
      })}
      <div className="atlas-center-copy">
        <b>{nodeLabel}</b>
        <span>{category.symbol} {category.label}</span>
      </div>
      <div className="atlas-cluster-legend" aria-label="Leyenda de clusters">
        {clusterNodes.map((node) => (
          <button
            key={`legend-${node.id}`}
            type="button"
            className={node.label === activeCluster ? 'active' : ''}
            onClick={() => onClusterSelect(node.label)}
            style={{ ['--legend-color' as string]: colorMap[node.color] }}
          >
            <i />
            {node.label}
          </button>
        ))}
      </div>
      <div className="atlas-process-caption">
        <span>{activeCluster}</span>
        <b>{activeProcess || processNodes[0]?.label || 'selecciona proceso'}</b>
      </div>
      <div className="atlas-view-modes" aria-label="Modos de vista del laboratorio">
        {laboratoryViewModes.map((mode) => (
          <button key={mode.id} type="button" className={viewMode === mode.id ? 'active' : ''} onClick={() => onViewModeChange(mode.id)}>
            <b>{mode.symbol}</b>
            <span>{mode.label}</span>
          </button>
        ))}
      </div>
      <style jsx>{`
        .atlas-radial-field {
          position: relative;
          width: min(74vw, 50rem);
          aspect-ratio: 1;
          margin: 0 auto;
          isolation: isolate;
        }
        .atlas-edges {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        circle {
          fill: none;
          stroke: rgba(200, 169, 81, 0.09);
          stroke-width: 0.16;
        }
        circle.inner {
          stroke: rgba(200, 169, 81, 0.18);
          stroke-dasharray: 1 2;
        }
        line {
          stroke: rgba(200, 169, 81, 0.62);
          stroke-width: 0.13;
          vector-effect: non-scaling-stroke;
        }
        line.ACTIVE {
          stroke: rgba(74, 143, 168, 0.8);
          stroke-dasharray: 7 4;
        }
        line.RESONANT {
          stroke: rgba(200, 169, 81, 0.72);
          stroke-dasharray: 9 3;
        }
        line.CRITICAL {
          stroke: rgba(200, 92, 78, 0.76);
          stroke-width: 0.24;
        }
        line.DEGRADED {
          stroke: rgba(68, 68, 68, 0.46);
          stroke-dasharray: 2 10;
        }
        line.LATENT {
          stroke: rgba(72, 72, 72, 0.55);
          stroke-dasharray: 3 9;
        }
        line.dashed {
          stroke-dasharray: 2 2;
        }
        .atlas-node {
          position: absolute;
          transform: translate(-50%, -50%) scale(var(--node-scale));
          display: grid;
          place-items: center;
          width: clamp(4.2rem, 8vw, 6rem);
          height: clamp(4.2rem, 8vw, 6rem);
          border: 1px solid color-mix(in srgb, var(--node-color) 38%, transparent);
          background: rgba(8, 8, 8, 0.52);
          color: rgba(216, 212, 200, 0.72);
          font-family: "JetBrains Mono", monospace;
          font-size: 0.52rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: opacity 220ms ease, border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease, background 220ms ease;
          z-index: 2;
        }
        .atlas-node span {
          max-width: 5.2rem;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }
        .atlas-node i {
          position: absolute;
          top: 0.3rem;
          right: 0.38rem;
          color: var(--node-color);
          font-style: normal;
          font-size: 0.68rem;
        }
        .atlas-node.active,
        .atlas-node.lens {
          border-color: var(--node-color);
          box-shadow: 0 0 30px color-mix(in srgb, var(--node-color) 20%, transparent);
          color: #d8d4c8;
        }
        .atlas-node.suppressed {
          opacity: 0.32;
        }
        .center {
          width: clamp(7.2rem, 12vw, 9.8rem);
          height: clamp(7.2rem, 12vw, 9.8rem);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,169,81,0.22), rgba(30,24,8,0.3) 55%, rgba(5,5,5,0.72));
          color: #C8A951;
          animation: atlasPulse 5.8s ease-in-out infinite;
          z-index: 4;
        }
        .atlas-node:not(.center) {
          animation: nodeBreath 6.8s ease-in-out infinite;
        }
        .doubleCircle,
        .circle,
        .ring {
          border-radius: 50%;
        }
        .doubleCircle::after,
        .ring::after {
          content: '';
          position: absolute;
          inset: 0.42rem;
          border: 1px solid color-mix(in srgb, var(--node-color) 28%, transparent);
          border-radius: 50%;
        }
        .hexagon {
          clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%);
        }
        .triangle {
          clip-path: polygon(50% 4%, 96% 92%, 4% 92%);
        }
        .diamond {
          transform: translate(-50%, -50%) scale(var(--node-scale)) rotate(45deg);
        }
        .diamond span,
        .diamond i {
          transform: rotate(-45deg);
        }
        .square {
          border-radius: 2px;
        }
        .roundedSquare {
          border-radius: 0.65rem;
        }
        .star {
          clip-path: polygon(50% 0, 61% 33%, 96% 35%, 68% 56%, 78% 91%, 50% 70%, 22% 91%, 32% 56%, 4% 35%, 39% 33%);
        }
        .atlas-center-copy {
          position: absolute;
          left: 50%;
          top: 63%;
          transform: translateX(-50%);
          display: grid;
          gap: 0.25rem;
          text-align: center;
          font-family: "JetBrains Mono", monospace;
          pointer-events: none;
          z-index: 5;
        }
        .atlas-cluster-legend {
          position: absolute;
          left: 50%;
          bottom: -1.8rem;
          transform: translateX(-50%);
          display: flex;
          justify-content: center;
          gap: 0.35rem;
          width: min(42rem, 92vw);
          flex-wrap: wrap;
          z-index: 7;
        }
        .atlas-cluster-legend button {
          display: inline-flex;
          align-items: center;
          gap: 0.34rem;
          min-height: 1.8rem;
          border: 1px solid rgba(200, 169, 81, 0.09);
          background: rgba(5, 5, 5, 0.46);
          color: rgba(216, 212, 200, 0.48);
          font-family: "JetBrains Mono", monospace;
          font-size: 0.48rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0 0.55rem;
          cursor: pointer;
        }
        .atlas-cluster-legend button.active {
          color: #d8d4c8;
          border-color: color-mix(in srgb, var(--legend-color) 52%, transparent);
          background: color-mix(in srgb, var(--legend-color) 10%, transparent);
        }
        .atlas-cluster-legend i {
          width: 0.42rem;
          height: 0.42rem;
          border-radius: 50%;
          background: var(--legend-color);
          box-shadow: 0 0 12px color-mix(in srgb, var(--legend-color) 45%, transparent);
        }
        .atlas-process-caption {
          position: absolute;
          left: 50%;
          top: 4%;
          transform: translateX(-50%);
          display: grid;
          gap: 0.22rem;
          text-align: center;
          font-family: "JetBrains Mono", monospace;
          pointer-events: none;
          z-index: 8;
        }
        .atlas-view-modes {
          position: absolute;
          left: 1rem;
          top: 1rem;
          display: flex;
          gap: 0.25rem;
          z-index: 8;
          flex-wrap: wrap;
          max-width: 24rem;
        }
        .atlas-view-modes button {
          display: inline-flex;
          align-items: center;
          gap: 0.26rem;
          min-height: 1.65rem;
          border: 1px solid rgba(200, 169, 81, 0.08);
          background: rgba(8, 8, 8, 0.38);
          color: rgba(216, 212, 200, 0.34);
          font-family: "JetBrains Mono", monospace;
          font-size: 0.46rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0 0.45rem;
          cursor: pointer;
        }
        .atlas-view-modes button.active {
          color: #C8A951;
          border-color: rgba(200, 169, 81, 0.35);
          background: rgba(200, 169, 81, 0.06);
        }
        .atlas-view-modes b {
          font-weight: 500;
        }
        .atlas-process-caption span {
          color: rgba(200, 169, 81, 0.52);
          font-size: 0.48rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .atlas-process-caption b {
          color: rgba(216, 212, 200, 0.68);
          font-size: 0.62rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .atlas-center-copy b {
          color: rgba(216, 212, 200, 0.72);
          font-size: 0.54rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 500;
        }
        .atlas-center-copy span {
          color: rgba(200, 169, 81, 0.56);
          font-size: 0.5rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        @keyframes atlasPulse {
          0%, 100% { box-shadow: 0 0 34px rgba(200,169,81,0.22); }
          50% { box-shadow: 0 0 68px rgba(200,169,81,0.42); }
        }
        @keyframes nodeBreath {
          0%, 100% { filter: saturate(0.82); }
          50% { filter: saturate(1.18); }
        }
        @media (max-width: 860px) {
          .atlas-radial-field {
            width: min(112vw, 34rem);
            margin-top: 1rem;
          }
          .atlas-node {
            width: 4.1rem;
            height: 4.1rem;
            min-width: 44px;
            min-height: 44px;
            font-size: 0.45rem;
          }
          .center {
            width: 6.6rem;
            height: 6.6rem;
          }
          .atlas-center-copy {
            top: 64%;
          }
          .atlas-view-modes {
            left: 0.7rem;
            right: 0.7rem;
            top: -0.3rem;
            overflow-x: auto;
            flex-wrap: nowrap;
            max-width: none;
            scrollbar-width: none;
          }
          .atlas-view-modes::-webkit-scrollbar {
            display: none;
          }
          .atlas-view-modes button {
            min-width: max-content;
            min-height: 36px;
          }
          .atlas-cluster-legend {
            bottom: -2.7rem;
            width: 96vw;
            flex-wrap: nowrap;
            justify-content: flex-start;
            overflow-x: auto;
            padding: 0 0.7rem;
            scrollbar-width: none;
          }
          .atlas-cluster-legend::-webkit-scrollbar {
            display: none;
          }
          .atlas-cluster-legend button {
            min-width: max-content;
            min-height: 44px;
          }
        }
      `}</style>
    </section>
  );
}

'use client';

import type { LaboratoryGraphNode, LaboratoryGraphState } from '@/observatory/laboratory/resolveLaboratoryGraph';
import type { WorldSpectCategory } from '@/observatory/worldspect/worldSpectCategories';
import type { WorldSpectLensState } from '@/observatory/worldspect/applyWorldSpectLens';
import { getWorldSpectCategoryConfig } from '@/observatory/worldspect/worldSpectCategories';

const clusterOrder = ['Nodo Vivo', 'Auditoria', 'Simulacion', 'Resultado', 'Accion', 'Memoria', 'Mundo', 'Presencia', 'Ventana'];
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

function nodePosition(node: LaboratoryGraphNode, graph: LaboratoryGraphState) {
  if (node.ring === 0) return { x: 50, y: 50 };
  if (node.ring === 1) {
    const index = Math.max(0, clusterOrder.indexOf(node.label));
    return polar(index, clusterOrder.length, 31);
  }
  const activeCluster = graph.nodes.find((item) => item.ring === 1 && item.weight === 1)?.label || 'Auditoria';
  const parentIndex = Math.max(0, clusterOrder.indexOf(activeCluster));
  const processNodes = graph.nodes.filter((item) => item.ring === 2);
  const processIndex = Math.max(0, processNodes.findIndex((item) => item.id === node.id));
  const spread = processNodes.length > 1 ? (processIndex - (processNodes.length - 1) / 2) * 13 : 0;
  const angle = (-90 + (360 / clusterOrder.length) * parentIndex + spread) * Math.PI / 180;
  return { x: 50 + Math.cos(angle) * 43, y: 50 + Math.sin(angle) * 43 };
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
  onClusterSelect,
  onProcessSelect,
}: {
  graph: LaboratoryGraphState;
  nodeLabel: string;
  activeCluster: string;
  activeProcess?: string | null;
  activeWorldSpectCategory: WorldSpectCategory;
  worldSpectLensState?: WorldSpectLensState;
  onClusterSelect: (cluster: string) => void;
  onProcessSelect: (process: string) => void;
}) {
  const category = getWorldSpectCategoryConfig(activeWorldSpectCategory);
  const positions = new Map(graph.nodes.map((node) => [node.id, nodePosition(node, graph)]));
  const prioritized = new Set(worldSpectLensState?.prioritizedNodes || []);
  const suppressed = new Set(worldSpectLensState?.suppressedNodes || []);
  return (
    <section className="atlas-radial-field" aria-label="Campo radial ATLAS">
      <svg className="atlas-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="50" cy="50" r="31" />
        <circle cx="50" cy="50" r="43" />
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
              className={edge.dashed ? 'dashed' : ''}
              style={{ opacity: 0.08 + (edge.strength || 0.4) * 0.28 }}
            />
          );
        })}
      </svg>
      {graph.nodes.map((node) => {
        const pos = positions.get(node.id) || { x: 50, y: 50 };
        const color = colorMap[node.color];
        const isCenter = node.ring === 0;
        const isActive = node.label === activeCluster || node.label === activeProcess || node.id === 'center';
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
              ['--node-scale' as string]: isCenter ? 1.18 : node.ring === 2 ? 0.76 : 0.92 + node.weight * 0.16,
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
      <style jsx>{`
        .atlas-radial-field {
          position: relative;
          width: min(72vw, 46rem);
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
        line {
          stroke: rgba(200, 169, 81, 0.62);
          stroke-width: 0.18;
          vector-effect: non-scaling-stroke;
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
          border: 1px solid color-mix(in srgb, var(--node-color) 50%, transparent);
          background: rgba(12, 12, 10, 0.58);
          color: rgba(216, 212, 200, 0.72);
          font-family: "JetBrains Mono", monospace;
          font-size: 0.52rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: opacity 220ms ease, border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease;
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
          width: clamp(5.8rem, 10vw, 7.8rem);
          height: clamp(5.8rem, 10vw, 7.8rem);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,169,81,0.22), rgba(30,24,8,0.3) 55%, rgba(5,5,5,0.72));
          color: #C8A951;
          animation: atlasPulse 5.8s ease-in-out infinite;
          z-index: 4;
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
        @media (max-width: 860px) {
          .atlas-radial-field {
            width: min(112vw, 32rem);
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
            width: 5.7rem;
            height: 5.7rem;
          }
          .atlas-center-copy {
            top: 64%;
          }
        }
      `}</style>
    </section>
  );
}

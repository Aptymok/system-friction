'use client';

import { translateRootNode, type RootNodeTranslation } from '@/lib/root/rootNodeTranslator';

type RuntimeNode = {
  label?: string;
  nodeKey?: string;
  id?: string;
  nodeType?: string;
  ontologyType?: string;
  runtimeState?: string;
  pressure?: number;
  patterns?: unknown[];
  variables?: unknown[];
  layers?: unknown[];
  linkedNodes?: unknown[];
};

type TwinState = {
  ok?: boolean;
  data?: {
    seed?: {
      nodeCatalog?: unknown[];
    };
  };
};

type ClusterNode = {
  raw: RuntimeNode;
  translated: RootNodeTranslation;
};

type Cluster = {
  key: string;
  label: string;
  nodes: ClusterNode[];
  x: number;
  y: number;
  pressure: number;
  active: number;
};

const CLUSTER_LAYOUT: Record<string, { label: string; x: number; y: number }> = {
  twin: { label: 'Twin / personal', x: 50, y: 18 },
  sf: { label: 'SFI / marco', x: 24, y: 33 },
  mihm: { label: 'MIHM / lectura', x: 76, y: 35 },
  evidence: { label: 'Evidencia / docs', x: 82, y: 63 },
  governance: { label: 'Gobierno / ACP', x: 50, y: 78 },
  operational: { label: 'Operacion / campo', x: 20, y: 66 },
  unknown: { label: 'Otros nodos', x: 50, y: 50 },
};

function asNode(value: unknown): RuntimeNode | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RuntimeNode;
}

function nodeLabel(node: RuntimeNode) {
  return node.label || node.nodeKey || node.id || 'nodo sin nombre';
}

function nodeType(node: RuntimeNode) {
  return (node.nodeType || node.ontologyType || 'unknown').toLowerCase();
}

function clusterKey(node: RuntimeNode) {
  const raw = `${nodeType(node)} ${node.nodeKey || ''} ${node.label || ''}`.toLowerCase();
  if (raw.includes('twin') || raw.includes('usuario') || raw.includes('asset')) return 'twin';
  if (raw.includes('mihm') || raw.includes('metric') || raw.includes('ihg') || raw.includes('nti')) return 'mihm';
  if (raw.includes('doc') || raw.includes('evidence') || raw.includes('archivo') || raw.includes('case')) return 'evidence';
  if (raw.includes('govern') || raw.includes('acp') || raw.includes('policy') || raw.includes('root')) return 'governance';
  if (raw.includes('oper') || raw.includes('campo') || raw.includes('runtime') || raw.includes('field')) return 'operational';
  if (raw.includes('sf') || raw.includes('sfi') || raw.includes('framework') || raw.includes('modelo')) return 'sf';
  return 'unknown';
}

function signalPressure(node: RuntimeNode) {
  const explicit = typeof node.pressure === 'number' && Number.isFinite(node.pressure) ? node.pressure : null;
  if (explicit !== null) return Math.max(0, Math.min(1, explicit));
  const patternCount = Array.isArray(node.patterns) ? node.patterns.length : 0;
  const variableCount = Array.isArray(node.variables) ? node.variables.length : 0;
  const layerCount = Array.isArray(node.layers) ? node.layers.length : 0;
  return Math.min(1, 0.2 + patternCount * 0.12 + variableCount * 0.08 + layerCount * 0.06);
}

function isActiveState(state: string) {
  return ['observed', 'active', 'verified', 'stable'].includes(state);
}

function buildClusters(nodes: RuntimeNode[]): Cluster[] {
  const buckets = new Map<string, ClusterNode[]>();
  nodes.forEach((node, index) => {
    const key = clusterKey(node);
    const list = buckets.get(key) ?? [];
    list.push({ raw: node, translated: translateRootNode(node, `cluster-node-${index}`) });
    buckets.set(key, list);
  });

  return Object.entries(CLUSTER_LAYOUT).map(([key, layout]) => {
    const clusterNodes = buckets.get(key) ?? [];
    const pressure = clusterNodes.length
      ? clusterNodes.reduce((sum, node) => sum + signalPressure(node.raw), 0) / clusterNodes.length
      : 0;
    const active = clusterNodes.filter((node) => isActiveState(node.translated.state.normalizedState)).length;
    return { key, label: layout.label, nodes: clusterNodes, x: layout.x, y: layout.y, pressure, active };
  }).filter((cluster) => cluster.nodes.length > 0 || cluster.key !== 'unknown');
}

function pct(value: number, max: number) {
  if (!max) return 0;
  return Math.round((value / max) * 100);
}

export function NodeClusterSurface({ twin }: { twin: TwinState | null }) {
  const nodes = (twin?.data?.seed?.nodeCatalog ?? []).map(asNode).filter(Boolean) as RuntimeNode[];
  const clusters = buildClusters(nodes);
  const maxCluster = Math.max(1, ...clusters.map((cluster) => cluster.nodes.length));
  const totalNodes = nodes.length;
  const totalActive = nodes
    .map((node, index) => translateRootNode(node, `cluster-total-${index}`))
    .filter((node) => isActiveState(node.state.normalizedState)).length;

  return (
    <section className="relative overflow-hidden border-b border-[#1e1c17] bg-[#0a0a09]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,81,0.09),transparent_47%)]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#c8a951_1px,transparent_1px),linear-gradient(90deg,#c8a951_1px,transparent_1px)] [background-size:140px_92px]" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-h-[390px] md:min-h-[460px]">
          <svg className="h-[390px] w-full md:h-[460px]" viewBox="0 0 700 460" role="img" aria-label="Campo vivo de nodos ROOT">
            <defs>
              <radialGradient id="clusterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c8a951" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#c8a951" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx="350" cy="230" r="54" fill="url(#clusterGlow)" stroke="#c8a951" strokeOpacity="0.42" strokeWidth="1" />
            <circle cx="350" cy="230" r="7" fill="#c8a951" opacity="0.9" />
            <text x="350" y="222" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill="#c8a951" fontWeight="700">ROOT</text>
            <text x="350" y="240" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6.5" fill="#8a7035">referencia de lectura</text>

            <g stroke="#c8a951" strokeOpacity="0.24">
              {clusters.map((cluster) => (
                <line
                  key={`edge-${cluster.key}`}
                  x1="350"
                  y1="230"
                  x2={(cluster.x / 100) * 700}
                  y2={(cluster.y / 100) * 460}
                  strokeWidth={0.35 + cluster.pressure * 0.9}
                  strokeDasharray={cluster.pressure < 0.35 ? '3 7' : undefined}
                />
              ))}
            </g>

            {clusters.map((cluster) => {
              const cx = (cluster.x / 100) * 700;
              const cy = (cluster.y / 100) * 460;
              const radius = 15 + Math.sqrt(cluster.nodes.length) * 4;
              const sample = cluster.nodes.slice(0, 9);
              return (
                <g key={cluster.key}>
                  <circle cx={cx} cy={cy} r={radius + 18} fill="url(#clusterGlow)" opacity={0.6} />
                  <circle cx={cx} cy={cy} r={radius} fill="rgba(200,169,81,.055)" stroke="#c8a951" strokeOpacity={0.35 + cluster.pressure * 0.5} strokeWidth={0.7 + cluster.pressure} />
                  {sample.map((node, index) => {
                    const angle = (Math.PI * 2 * index) / Math.max(1, sample.length);
                    const dotRadius = radius + 9;
                    return (
                      <circle
                        key={`${cluster.key}-${nodeLabel(node.raw)}-${index}`}
                        cx={cx + Math.cos(angle) * dotRadius}
                        cy={cy + Math.sin(angle) * dotRadius}
                        r={2.2 + signalPressure(node.raw) * 2.2}
                        fill="#c8a951"
                        opacity={node.translated.state.severity === 'critical' ? 0.96 : node.translated.state.severity === 'warning' ? 0.62 : 0.82}
                      />
                    );
                  })}
                  <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#c8a951" fontWeight="700">{cluster.nodes.length}</text>
                  <text x={cx} y={cy + 11} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="5.7" fill="#8a7035">{cluster.label}</text>
                </g>
              );
            })}

            <rect x="20" y="436" width="300" height="1" fill="#1e1c17" />
            <rect x="20" y="436" width={Math.max(30, Math.min(300, totalNodes * 1.2))} height="1" fill="#c8a951" opacity="0.8" />
            <text x="20" y="454" fontFamily="JetBrains Mono" fontSize="7" fill="#8a7035">catalogo visible - {totalNodes || '-'} nodos - {totalActive} activos o utilizables</text>
            <text x="280" y="454" fontFamily="JetBrains Mono" fontSize="7" fill="#8a7035">cluster operativo - capa/estado/accion</text>
          </svg>
        </div>

        <aside className="border-t border-[#1e1c17] bg-[#0e0d0b]/80 p-3 lg:border-l lg:border-t-0">
          <div className="mb-3 font-mono text-[8px] uppercase tracking-[0.2em] text-[#8a7035]">Campo vivo de nodos</div>
          <div className="grid grid-cols-2 gap-1 font-mono text-[9px] lg:grid-cols-1">
            {clusters.map((cluster) => (
              <div key={cluster.key} className="border border-[#1e1c17] bg-[#131210] p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#c8a951]">{cluster.label}</span>
                  <span className="text-[#8a7035]">{cluster.nodes.length}</span>
                </div>
                <div className="mt-1 h-px bg-[#1e1c17]">
                  <div className="h-px bg-[#c8a951]" style={{ width: `${pct(cluster.nodes.length, maxCluster)}%` }} />
                </div>
                <div className="mt-1 text-[8px] uppercase tracking-[0.1em] text-[#35312a]">actividad visible {cluster.active} / {cluster.nodes.length}</div>
                <div className="mt-2 space-y-1">
                  {cluster.nodes.slice(0, 2).map(({ translated }) => (
                    <div key={translated.id} className="border-l border-[#2e2410] pl-2 text-[8px] leading-4 text-[#7a7568]">
                      <span className="text-[#c8a951]">{translated.operationalName}</span><br />
                      {translated.layerLabel} / {translated.state.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 border border-[#2e2410] bg-[#2e2410]/40 p-2 font-mono text-[8px] leading-5 text-[#8a7035]">
            La puerta dorada del Visor no es un nodo del campo. Este plano traduce nodos existentes por capa, estado e implicacion operativa sin crear evidencia nueva.
          </div>
        </aside>
      </div>
    </section>
  );
}

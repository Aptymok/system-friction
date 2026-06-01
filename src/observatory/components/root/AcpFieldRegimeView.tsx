'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
};

type TwinState = {
  data?: {
    seed?: {
      nodeCatalog?: unknown[];
      mihmRuntimeMatrix?: {
        sourceState?: string;
        ihg?: number;
        nti?: number;
        phi?: number;
        regime?: string;
      };
    };
  };
};

type FieldNode = {
  id: string;
  label: string;
  cluster: string;
  state: 'observed' | 'latent' | 'degraded' | 'resonant' | 'stable';
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  p: number;
  phase: number;
  links: number[];
};

const CLUSTERS: Record<string, { label: string; color: string; x: number; y: number }> = {
  twin: { label: 'Twin/Personal', color: '#C8A951', x: 0.5, y: 0.2 },
  sf: { label: 'SFI/Framework', color: '#E6FF00', x: 0.22, y: 0.34 },
  mihm: { label: 'MIHM/Métrica', color: '#1D9E75', x: 0.78, y: 0.34 },
  evidence: { label: 'Evidencia/Docs', color: '#7F77DD', x: 0.78, y: 0.66 },
  governance: { label: 'Gobernanza/ACP', color: '#EF9F27', x: 0.5, y: 0.78 },
  operational: { label: 'Operación/Campo', color: '#E8593C', x: 0.22, y: 0.68 },
  archive: { label: 'Archivo/Memoria', color: '#3B8BD4', x: 0.38, y: 0.52 },
  external: { label: 'Externos/Mundo', color: '#5a5855', x: 0.64, y: 0.52 },
};

const STATE_COLOR = {
  observed: '#1D9E75',
  latent: '#4a4845',
  degraded: '#E8593C',
  resonant: '#7F77DD',
  stable: '#C8A951',
};

function asNode(value: unknown): RuntimeNode | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RuntimeNode) : null;
}

function hash(input: string) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) value = Math.imul(value ^ input.charCodeAt(i), 16777619);
  return Math.abs(value >>> 0);
}

function ratio(seed: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function labelOf(node: RuntimeNode) {
  return node.label || node.nodeKey || node.id || 'nodo';
}

function rawOf(node: RuntimeNode) {
  return `${node.nodeType || node.ontologyType || ''} ${node.nodeKey || ''} ${node.label || ''}`.toLowerCase();
}

function clusterOf(node: RuntimeNode) {
  const raw = rawOf(node);
  if (raw.includes('twin') || raw.includes('usuario') || raw.includes('asset')) return 'twin';
  if (raw.includes('mihm') || raw.includes('metric') || raw.includes('ihg') || raw.includes('nti')) return 'mihm';
  if (raw.includes('doc') || raw.includes('evidence') || raw.includes('archivo') || raw.includes('case')) return 'evidence';
  if (raw.includes('govern') || raw.includes('acp') || raw.includes('policy') || raw.includes('root')) return 'governance';
  if (raw.includes('oper') || raw.includes('campo') || raw.includes('runtime') || raw.includes('field')) return 'operational';
  if (raw.includes('mem') || raw.includes('atlas') || raw.includes('cuadernillo') || raw.includes('sobre')) return 'archive';
  if (raw.includes('world') || raw.includes('extern') || raw.includes('social')) return 'external';
  if (raw.includes('sf') || raw.includes('sfi') || raw.includes('framework') || raw.includes('modelo')) return 'sf';
  return 'external';
}

function pressureOf(node: RuntimeNode) {
  if (typeof node.pressure === 'number' && Number.isFinite(node.pressure)) return Math.max(0, Math.min(1, node.pressure));
  const patterns = Array.isArray(node.patterns) ? node.patterns.length : 0;
  const variables = Array.isArray(node.variables) ? node.variables.length : 0;
  const layers = Array.isArray(node.layers) ? node.layers.length : 0;
  return Math.min(1, 0.18 + patterns * 0.13 + variables * 0.08 + layers * 0.06);
}

function stateOf(node: RuntimeNode, p: number): FieldNode['state'] {
  if (node.runtimeState === 'observed' && p > 0.72) return 'resonant';
  if (node.runtimeState === 'observed') return 'observed';
  if (p > 0.82) return 'degraded';
  if (p < 0.28) return 'latent';
  return 'stable';
}

function makeNodes(twin: TwinState | null, width: number, height: number) {
  const source = (twin?.data?.seed?.nodeCatalog ?? []).map(asNode).filter(Boolean) as RuntimeNode[];
  const nodes = source.slice(0, 180).map((node, index) => {
    const id = node.nodeKey || node.id || `node-${index}`;
    const seed = hash(`${id}:${labelOf(node)}`);
    const cluster = clusterOf(node);
    const center = CLUSTERS[cluster];
    const angle = ratio(seed, 1) * Math.PI * 2;
    const spread = 38 + ratio(seed, 2) * 62;
    const p = pressureOf(node);
    return {
      id,
      label: labelOf(node),
      cluster,
      state: stateOf(node, p),
      x: Math.max(24, Math.min(width - 24, center.x * width + Math.cos(angle) * spread)),
      y: Math.max(24, Math.min(height - 24, center.y * height + Math.sin(angle) * spread)),
      vx: (ratio(seed, 3) - 0.5) * 0.2,
      vy: (ratio(seed, 4) - 0.5) * 0.2,
      r: 2.4 + p * 5.2,
      p,
      phase: ratio(seed, 5) * Math.PI * 2,
      links: [] as number[],
    };
  });

  nodes.forEach((node, index) => {
    const seed = hash(node.id);
    node.links = nodes
      .map((target, targetIndex) => ({ target, targetIndex, distance: Math.hypot(target.x - node.x, target.y - node.y) }))
      .filter((item) => item.targetIndex !== index)
      .sort((a, b) => a.distance - b.distance + (a.target.cluster === node.cluster ? -70 : 0))
      .slice(0, 1 + Math.floor(ratio(seed, 7) * 3))
      .map((item) => item.targetIndex);
  });

  return nodes;
}

function draw(ctx: CanvasRenderingContext2D, nodes: FieldNode[], width: number, height: number, tick: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
  gradient.addColorStop(0, 'rgba(200,169,81,0.08)');
  gradient.addColorStop(0.58, 'rgba(200,169,81,0.015)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 520; i += 1) {
    const x = hash(`x-${i}-${Math.floor(tick / 9)}`) % width;
    const y = hash(`y-${i}-${Math.floor(tick / 13)}`) % height;
    ctx.fillStyle = '#8a8880';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;

  Object.values(CLUSTERS).forEach((cluster, index) => {
    const cx = cluster.x * width;
    const cy = cluster.y * height;
    ctx.beginPath();
    ctx.arc(cx, cy, 72 + Math.sin(tick * 0.012 + index) * 8, 0, Math.PI * 2);
    ctx.fillStyle = `${cluster.color}10`;
    ctx.fill();
    ctx.strokeStyle = `${cluster.color}24`;
    ctx.setLineDash([3, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  nodes.forEach((node) => {
    node.links.slice(0, 2).forEach((targetIndex) => {
      const target = nodes[targetIndex];
      if (!target) return;
      const distance = Math.hypot(target.x - node.x, target.y - node.y);
      if (distance > 210) return;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = `rgba(200,169,81,${Math.max(0.03, (1 - distance / 210) * 0.2)})`;
      ctx.lineWidth = 0.35 + node.p * 0.45;
      ctx.stroke();
    });
  });

  nodes.forEach((node, index) => {
    const cluster = CLUSTERS[node.cluster];
    const cx = cluster.x * width;
    const cy = cluster.y * height;
    const dx = cx - node.x;
    const dy = cy - node.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    node.vx += (dx / d) * (0.00045 + node.p * 0.00022);
    node.vy += (dy / d) * (0.00045 + node.p * 0.00022);
    node.vx *= 0.992;
    node.vy *= 0.992;
    node.x += node.vx;
    node.y += node.vy;

    const pulse = Math.sin(tick * 0.035 + node.phase);
    const r = node.r + (node.state === 'resonant' || node.state === 'degraded' ? pulse * 1.35 : 0);
    if (node.state === 'degraded') {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(232,89,60,0.28)';
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(node.x, node.y, Math.max(1.5, r), 0, Math.PI * 2);
    ctx.fillStyle = STATE_COLOR[node.state];
    ctx.globalAlpha = 0.55 + node.p * 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (index < 5 || node.p > 0.82) {
      ctx.fillStyle = '#e8e6e0';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.label.slice(0, 18), node.x, node.y + r + 10);
    }
  });
}

function stats(nodes: FieldNode[]) {
  return Object.entries(CLUSTERS).map(([key, cluster]) => {
    const list = nodes.filter((node) => node.cluster === key);
    const pressure = list.length ? list.reduce((sum, node) => sum + node.p, 0) / list.length : 0;
    return { key, label: cluster.label, color: cluster.color, count: list.length, pressure };
  });
}

export function AcpFieldRegimeView({ twin }: { twin: TwinState | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<FieldNode[]>([]);
  const frameRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const [size, setSize] = useState({ width: 900, height: 460 });

  const matrix = twin?.data?.seed?.mihmRuntimeMatrix;
  const nodes = useMemo(() => makeNodes(twin, size.width, size.height), [twin, size.width, size.height]);
  const clusterStats = useMemo(() => stats(nodes), [nodes]);
  const degraded = nodes.filter((node) => node.state === 'degraded').length;
  const resonant = nodes.filter((node) => node.state === 'resonant').length;
  const observed = nodes.filter((node) => node.state === 'observed' || node.state === 'resonant').length;

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(380, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      setSize({ width, height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tickRef.current += 1;
      draw(ctx, nodesRef.current, size.width, size.height, tickRef.current);
      frameRef.current = window.requestAnimationFrame(render);
    };
    frameRef.current = window.requestAnimationFrame(render);
    return () => { if (frameRef.current) window.cancelAnimationFrame(frameRef.current); };
  }, [size.width, size.height]);

  return (
    <section className="border-b border-[#1e1c17] bg-[#080808]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e1c17] bg-[#0f0f0f] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.12em]">
        <div className="text-[#c8a951]">Campo Vivo · Régimen Nodal</div>
        <div className="flex flex-wrap gap-4 text-[#4a4845]">
          <span>IHG <b className="text-[#e8593c]">{typeof matrix?.ihg === 'number' ? matrix.ihg.toFixed(3) : '—'}</b></span>
          <span>NTI <b className="text-[#c8a951]">{typeof matrix?.nti === 'number' ? matrix.nti.toFixed(3) : '—'}</b></span>
          <span>Φ <b className="text-[#1d9e75]">{typeof matrix?.phi === 'number' ? matrix.phi.toFixed(3) : '—'}</b></span>
          <span>NODOS <b className="text-[#1d9e75]">{nodes.length}</b></span>
        </div>
      </div>
      <div className="grid min-h-[460px] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_250px]">
        <aside className="border-b border-[#1e1c17] bg-[#0f0f0f] p-3 lg:border-b-0 lg:border-r">
          <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#4a4845]">Clusters nodales</div>
          <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {clusterStats.map((stat) => (
              <div key={stat.key} className="border border-[#1e1c17] bg-[#161616] p-2 font-mono text-[9px]">
                <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: stat.color }} /><span className="flex-1 text-[#8a8880]">{stat.label}</span><span className="text-[#c8a951]">{stat.count}</span></div>
                <div className="mt-1 h-[3px] bg-[#1e1e1e]"><div className="h-full" style={{ width: `${Math.round(stat.pressure * 100)}%`, background: stat.color, opacity: 0.75 }} /></div>
              </div>
            ))}
          </div>
        </aside>
        <div className="relative min-h-[460px] overflow-hidden"><canvas ref={canvasRef} className="block h-full w-full" /><div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[7px] uppercase tracking-[0.14em] text-[#4a4845]">observabilidad {nodes.length ? Math.round((observed / nodes.length) * 100) : 0}% · ruido activo</div></div>
        <aside className="border-t border-[#1e1c17] bg-[#0f0f0f] p-3 lg:border-l lg:border-t-0">
          <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#4a4845]">Régimen</div>
          <div className="space-y-1 font-mono text-[9px]">
            <div className="border border-[#1e1c17] bg-[#161616] p-2"><span className="text-[#4a4845]">source</span><br /><span className="text-[#c8a951]">{matrix?.sourceState ?? '—'}</span></div>
            <div className="border border-[#1e1c17] bg-[#161616] p-2"><span className="text-[#4a4845]">regime</span><br /><span className="text-[#c8a951]">{matrix?.regime ?? '—'}</span></div>
            <div className="border border-[#1e1c17] bg-[#161616] p-2"><span className="text-[#4a4845]">resonantes</span><br /><span className="text-[#7f77dd]">{resonant}</span></div>
            <div className="border border-[#1e1c17] bg-[#161616] p-2"><span className="text-[#4a4845]">degradados</span><br /><span className="text-[#e8593c]">{degraded}</span></div>
          </div>
          <div className="mt-3 border border-[#2e2410] bg-[#2e2410]/40 p-2 font-mono text-[8px] leading-5 text-[#c8a951]">Vista de régimen: nodos perturbados, ruido, conexiones y flujo. Posición derivada por cluster, presión y semilla estable.</div>
        </aside>
      </div>
    </section>
  );
}

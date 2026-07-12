'use client';

import { useMemo } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

type Props = { state: SfiWorldInterfaceState };

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function nodeTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes('critical') || value.includes('failed')) return 0.95;
  if (value.includes('degraded') || value.includes('thin')) return 0.78;
  if (value.includes('active') || value.includes('observed') || value.includes('alive')) return 0.62;
  return 0.42;
}

function solarX(date: Date) {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return (hour / 24) * 1200;
}

function mapPoint(node: { x: number; y: number }) {
  return { x: clamp01(node.x / 100) * 1200, y: clamp01(node.y / 100) * 600 };
}

function flowPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const middleX = (from.x + to.x) / 2;
  const lift = Math.max(18, Math.min(90, Math.abs(to.x - from.x) * 0.12));
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${middleX.toFixed(1)} ${(Math.min(from.y, to.y) - lift).toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

export function SfiLiveWorldMap({ state }: Props) {
  const generated = useMemo(() => {
    const parsed = new Date(state.generatedAt);
    return Number.isFinite(parsed.getTime()) ? parsed : new Date();
  }, [state.generatedAt]);

  const sunX = solarX(generated);
  const viscosity = clamp01(
    0.35 + nodeTone(state.systemStrain.status) * 0.28 + nodeTone(state.frictionLevel.status) * 0.22 + (state.warnings.length > 0 ? 0.15 : 0),
  );
  const densityNodes = state.nodes.slice(0, 28);
  const nodeById = new Map(densityNodes.map((node) => [node.id, node]));
  const observedConnections = state.connections
    .filter((connection) => nodeById.has(connection.from) && nodeById.has(connection.to))
    .slice(0, 30);

  return (
    <div className="sfi-live-world-map" aria-hidden="true">
      <div className="sfi-viscosity-canvas" />
      <svg className="sfi-live-world-svg" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="sfiSolarBloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0cf78" stopOpacity="0.24" />
            <stop offset="55%" stopColor="#c8a951" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sfiNightBand" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#020201" stopOpacity="0.78" />
            <stop offset="45%" stopColor="#020201" stopOpacity="0.12" />
            <stop offset="55%" stopColor="#020201" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#020201" stopOpacity="0.78" />
          </linearGradient>
          <filter id="sfiMapGlow">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="1200" height="600" fill="#020201" />
        <g className="geo-grid">
          {Array.from({ length: 13 }).map((_, index) => <line key={`v-${index}`} x1={index * 100} y1="0" x2={index * 100} y2="600" />)}
          {Array.from({ length: 7 }).map((_, index) => <line key={`h-${index}`} x1="0" y1={index * 100} x2="1200" y2={index * 100} />)}
        </g>

        <g className="continent-layer">
          <path d="M130 168 C178 112 265 105 323 149 C352 170 392 165 423 195 C391 221 367 247 372 287 C333 295 316 329 279 320 C235 309 226 266 190 254 C148 240 117 206 130 168 Z" />
          <path d="M323 322 C365 346 399 396 392 455 C386 510 340 546 304 525 C274 507 287 459 266 431 C239 394 266 344 323 322 Z" />
          <path d="M535 156 C598 108 711 104 784 150 C824 175 872 160 917 187 C886 224 834 228 808 260 C768 311 682 287 642 320 C597 357 530 323 500 274 C473 230 491 189 535 156 Z" />
          <path d="M767 319 C814 330 842 370 837 414 C831 462 782 481 748 454 C718 429 723 379 742 343 C748 332 756 325 767 319 Z" />
          <path d="M885 345 C946 322 1037 347 1071 403 C1035 439 958 444 908 421 C867 403 849 366 885 345 Z" />
        </g>

        <rect className="night-band" width="1200" height="600" />
        <circle className="solar-bloom" cx={sunX} cy="235" r="300" />

        <g className="map-flow-layer">
          {observedConnections.map((connection, index) => {
            const fromNode = nodeById.get(connection.from);
            const toNode = nodeById.get(connection.to);
            if (!fromNode || !toNode) return null;
            const path = flowPath(mapPoint(fromNode), mapPoint(toNode));
            return (
              <path
                key={`${connection.from}-${connection.to}-${index}`}
                className="map-flow"
                d={path}
                style={{
                  opacity: 0.12 + clamp01(connection.strength) * 0.36,
                  strokeWidth: 0.45 + clamp01(connection.strength) * 0.85,
                  animationDelay: `${index * -0.41}s`,
                }}
              />
            );
          })}
        </g>

        <g className="night-lights" filter="url(#sfiMapGlow)">
          {densityNodes.map((node, index) => {
            const { x, y } = mapPoint(node);
            const intensity = clamp01(node.intensity);
            return (
              <g key={`density-${node.id}`} className={`real-density real-density-${node.state}`} style={{ animationDelay: `${index * -0.22}s` }}>
                <circle className="density-shadow" cx={x} cy={y} r={14 + intensity * 28} style={{ opacity: 0.035 + intensity * 0.08 }} />
                <circle className="density-core" cx={x} cy={y} r={1.4 + intensity * 2.1} style={{ opacity: 0.18 + intensity * 0.22 }} />
              </g>
            );
          })}
        </g>

        <g className="map-node-layer">
          {densityNodes.map((node, index) => {
            const { x, y } = mapPoint(node);
            const intensity = clamp01(node.intensity);
            return (
              <g key={node.id} className={`live-map-node live-map-node-${node.state}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                <circle className="live-node-ring" r={8 + intensity * 14} style={{ animationDelay: `${index * -0.35}s` }} />
                <circle className="live-node-core" r={1.8 + intensity * 1.8} />
              </g>
            );
          })}
        </g>

        <text className="map-meta" x="34" y="552">SFI NODE DENSITY · REAL CONNECTIONS {observedConnections.length} · VISCOSITY {Math.round(viscosity * 100)}%</text>
        <text className="map-meta right" x="1166" y="552">SNAPSHOT · {generated.toISOString().slice(0, 19)}Z</text>
      </svg>
    </div>
  );
}

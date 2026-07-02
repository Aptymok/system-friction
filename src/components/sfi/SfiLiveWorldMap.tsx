'use client';

import { useMemo } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

type Props = {
  state: SfiWorldInterfaceState;
};

const NIGHT_LIGHTS = [
  [-99.13, 19.43, 0.86],
  [-102.29, 21.88, 0.46],
  [-74.0, 40.71, 0.82],
  [-118.24, 34.05, 0.72],
  [-0.12, 51.5, 0.78],
  [2.35, 48.85, 0.62],
  [13.4, 52.52, 0.54],
  [37.62, 55.75, 0.45],
  [72.87, 19.07, 0.76],
  [77.21, 28.61, 0.68],
  [116.4, 39.9, 0.8],
  [139.69, 35.68, 0.88],
  [151.21, -33.86, 0.58],
  [-46.63, -23.55, 0.7],
  [28.04, -26.2, 0.52],
] as const;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function project(lon: number, lat: number) {
  return {
    x: ((lon + 180) / 360) * 1200,
    y: ((90 - lat) / 180) * 600,
  };
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

export function SfiLiveWorldMap({ state }: Props) {
  const generated = useMemo(() => {
    const parsed = new Date(state.generatedAt);
    return Number.isFinite(parsed.getTime()) ? parsed : new Date();
  }, [state.generatedAt]);

  const sunX = solarX(generated);
  const viscosity = clamp01(
    0.35
      + nodeTone(state.systemStrain.status) * 0.28
      + nodeTone(state.frictionLevel.status) * 0.22
      + (state.warnings.length > 0 ? 0.15 : 0),
  );

  return (
    <div className="sfi-live-world-map" aria-hidden="true">
      <canvas className="sfi-viscosity-canvas" />
      <svg className="sfi-live-world-svg" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="sfiSolarBloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0cf78" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#c8a951" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sfiNightBand" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#020201" stopOpacity="0.78" />
            <stop offset="45%" stopColor="#020201" stopOpacity="0.12" />
            <stop offset="55%" stopColor="#020201" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#020201" stopOpacity="0.78" />
          </linearGradient>
          <filter id="sfiMapGlow">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="1200" height="600" fill="#020201" />
        <g className="geo-grid">
          {Array.from({ length: 13 }).map((_, index) => (
            <line key={`v-${index}`} x1={index * 100} y1="0" x2={index * 100} y2="600" />
          ))}
          {Array.from({ length: 7 }).map((_, index) => (
            <line key={`h-${index}`} x1="0" y1={index * 100} x2="1200" y2={index * 100} />
          ))}
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

        <g className="night-lights" filter="url(#sfiMapGlow)">
          {NIGHT_LIGHTS.map(([lon, lat, strength]) => {
            const point = project(lon, lat);
            return (
              <circle
                key={`${lon}-${lat}`}
                cx={point.x}
                cy={point.y}
                r={1.2 + strength * 2.4}
                style={{ opacity: 0.14 + strength * 0.34 }}
              />
            );
          })}
        </g>

        <g className="map-flow-layer">
          {state.connections.slice(0, 16).map((connection, index) => {
            const from = state.nodes.find((node) => node.id === connection.from);
            const to = state.nodes.find((node) => node.id === connection.to);
            if (!from || !to) return null;
            const x1 = clamp01(from.x / 100) * 1200;
            const y1 = clamp01(from.y / 100) * 600;
            const x2 = clamp01(to.x / 100) * 1200;
            const y2 = clamp01(to.y / 100) * 600;
            const mx = (x1 + x2) / 2;
            const my = Math.min(y1, y2) - 40 - Math.abs(x2 - x1) * 0.08;
            return (
              <path
                key={`${connection.from}-${connection.to}-${index}`}
                className="map-flow"
                d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`}
                style={{
                  opacity: 0.14 + clamp01(connection.strength) * 0.35,
                  animationDelay: `${index * -0.7}s`,
                }}
              />
            );
          })}
        </g>

        <g className="map-node-layer">
          {state.nodes.map((node, index) => {
            const x = clamp01(node.x / 100) * 1200;
            const y = clamp01(node.y / 100) * 600;
            const intensity = clamp01(node.intensity);
            return (
              <g key={node.id} className={`live-map-node live-map-node-${node.state}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                <circle className="live-node-ring" r={12 + intensity * 18} style={{ animationDelay: `${index * -0.35}s` }} />
                <circle className="live-node-core" r={2.8 + intensity * 2.4} />
              </g>
            );
          })}
        </g>

        <text className="map-meta" x="34" y="552">SOLAR CYCLE Â· HUMAN ACTIVITY LAYER Â· SFI VISCOSITY {Math.round(viscosity * 100)}%</text>
        <text className="map-meta right" x="1166" y="552">SNAPSHOT Â· {generated.toISOString().slice(0, 19)}Z</text>
      </svg>
    </div>
  );
}
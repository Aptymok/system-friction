'use client';

import { SfiLiveWorldMap } from '@/components/sfi/SfiLiveWorldMap';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

type Props = { state: SfiWorldInterfaceState };

const CONTOURS = [
  'M55 205 C145 162 238 167 330 204 C380 225 419 220 475 250',
  'M84 264 C165 236 242 253 309 292 C356 319 385 358 430 410',
  'M482 171 C576 116 702 104 810 136 C884 158 940 202 1045 214',
  'M508 236 C602 207 692 207 774 234 C842 256 904 253 998 224',
  'M620 315 C699 351 770 346 850 315 C925 288 1011 330 1106 392',
  'M44 484 C180 452 305 468 420 520 C520 566 666 548 782 510',
] as const;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function SfiTopographicNightMap({ state }: Props) {
  return (
    <div className="sfi-topographic-night-map" aria-hidden="true">
      <SfiLiveWorldMap state={state} />
      <svg className="sfi-topographic-overlay" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="sfiTopoLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff0a8" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#f0cf78" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#f0cf78" stopOpacity="0" />
          </radialGradient>
          <filter id="sfiTopoGlow"><feGaussianBlur stdDeviation="1.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g className="sfi-topo-contours">
          {CONTOURS.map((d, index) => <path key={d} d={d} style={{ animationDelay: `${index * -0.4}s` }} />)}
          {CONTOURS.map((d, index) => <path key={`thin-${d}`} d={d} className="thin" transform={`translate(0 ${index % 2 ? -16 : 16})`} />)}
        </g>
        <g className="sfi-topo-light-layer" filter="url(#sfiTopoGlow)">
          {state.nodes.slice(0, 28).map((node, index) => {
            const x = clamp01(node.x / 100) * 1200;
            const y = clamp01(node.y / 100) * 600;
            const intensity = clamp01(node.intensity);
            return (
              <g key={`topo-${node.id}`} style={{ animationDelay: `${index * -0.18}s` }}>
                <circle className="bloom" cx={x} cy={y} r={10 + intensity * 18} style={{ opacity: 0.04 + intensity * 0.08 }} />
                <circle className="core" cx={x} cy={y} r={0.9 + intensity * 1.6} style={{ opacity: 0.16 + intensity * 0.18 }} />
              </g>
            );
          })}
        </g>
      </svg>
      <style jsx global>{`
        .sfi-topographic-night-map { position:absolute; inset:0; overflow:hidden; background:#020201; }
        .sfi-topographic-night-map .map-flow { display:none !important; }
        .sfi-topographic-overlay { position:absolute; inset:0; width:100%; height:100%; opacity:.62; mix-blend-mode:screen; pointer-events:none; }
        .sfi-topo-contours path { fill:none; stroke:rgba(240,207,120,.09); stroke-width:.8; stroke-dasharray:1 8; vector-effect:non-scaling-stroke; animation:sfiTopoContour 16s ease-in-out infinite alternate; }
        .sfi-topo-contours path.thin { stroke:rgba(200,169,81,.045); stroke-width:.55; stroke-dasharray:1 12; }
        .sfi-topo-light-layer .bloom { fill:url(#sfiTopoLight); }
        .sfi-topo-light-layer .core { fill:rgba(240,207,120,.72); }
        .sfi-topo-light-layer g { animation:sfiTopoPulse 7s ease-in-out infinite alternate; }
        @keyframes sfiTopoContour { from { opacity:.24; transform:translateY(-2px); } to { opacity:.56; transform:translateY(2px); } }
        @keyframes sfiTopoPulse { from { opacity:.42; } to { opacity:.74; } }
      `}</style>
    </div>
  );
}

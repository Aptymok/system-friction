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

const LIGHTS = [
  [270, 236, 0.95], [352, 184, 0.72], [206, 224, 0.55], [448, 171, 0.5],
  [600, 128, 0.86], [608, 137, 0.68], [641, 124, 0.56], [686, 164, 0.48],
  [735, 199, 0.6], [842, 216, 0.58], [949, 170, 0.86], [988, 194, 0.72],
  [1048, 176, 0.9], [1080, 186, 0.66], [1000, 360, 0.54], [430, 378, 0.58],
] as const;

export function SfiTopographicNightMap({ state }: Props) {
  return (
    <div className="sfi-topographic-night-map" aria-hidden="true">
      <SfiLiveWorldMap state={state} />
      <svg className="sfi-topographic-overlay" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="sfiTopoLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff0a8" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#f0cf78" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f0cf78" stopOpacity="0" />
          </radialGradient>
          <filter id="sfiTopoGlow"><feGaussianBlur stdDeviation="2.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g className="sfi-topo-contours">
          {CONTOURS.map((d, index) => <path key={d} d={d} style={{ animationDelay: `${index * -0.4}s` }} />)}
          {CONTOURS.map((d, index) => <path key={`thin-${d}`} d={d} className="thin" transform={`translate(0 ${index % 2 ? -16 : 16})`} />)}
        </g>
        <g className="sfi-topo-light-layer" filter="url(#sfiTopoGlow)">
          {LIGHTS.map(([x, y, strength], index) => (
            <g key={`${x}-${y}`} style={{ animationDelay: `${index * -0.18}s` }}>
              <circle className="bloom" cx={x} cy={y} r={10 + strength * 18} style={{ opacity: 0.1 + strength * 0.18 }} />
              <circle className="core" cx={x} cy={y} r={1.2 + strength * 2.2} style={{ opacity: 0.3 + strength * 0.5 }} />
            </g>
          ))}
        </g>
      </svg>
      <style jsx global>{`
        .sfi-topographic-night-map { position:absolute; inset:0; overflow:hidden; background:#020201; }
        .sfi-topographic-night-map .sfi-live-world-map,
        .sfi-topographic-night-map .sfi-live-world-svg,
        .sfi-topographic-night-map .sfi-viscosity-canvas { position:absolute; inset:0; width:100%; height:100%; }
        .sfi-topographic-night-map .sfi-live-world-map { opacity:.9; filter:saturate(1.08) contrast(1.16) brightness(.82); transform:scale(1.015); background:radial-gradient(circle at 50% 42%, rgba(200,169,81,.11), transparent 38%), linear-gradient(180deg, rgba(2,2,1,.98), rgba(2,2,1,.78) 48%, rgba(2,2,1,.98)); }
        .sfi-topographic-night-map .sfi-viscosity-canvas { opacity:.12; background:radial-gradient(circle at 25% 30%, rgba(184,80,80,.18), transparent 28%), radial-gradient(circle at 70% 45%, rgba(200,169,81,.16), transparent 34%), repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 1px, transparent 1px 7px); animation:sfiViscosityBreath 9s ease-in-out infinite alternate; }
        .sfi-topographic-night-map .sfi-live-world-svg { opacity:.92; filter:saturate(.95) contrast(1.08); }
        .sfi-topographic-night-map .geo-grid line { stroke:rgba(200,169,81,.055); stroke-width:1; vector-effect:non-scaling-stroke; }
        .sfi-topographic-night-map .continent-layer path { fill:rgba(200,169,81,.045); stroke:rgba(200,169,81,.18); stroke-width:1; vector-effect:non-scaling-stroke; }
        .sfi-topographic-night-map .night-band { fill:url('#sfiNightBand'); opacity:.72; animation:sfiNightDrift 48s linear infinite; }
        .sfi-topographic-night-map .solar-bloom { fill:url('#sfiSolarBloom'); mix-blend-mode:screen; opacity:.72; animation:sfiSolarPulse 7s ease-in-out infinite alternate; }
        .sfi-topographic-night-map .night-lights circle { fill:rgba(240,207,120,.9); animation:sfiLightPulse 5.4s ease-in-out infinite alternate; }
        .sfi-topographic-night-map .map-flow { fill:none; stroke:rgba(240,207,120,.55); stroke-width:1; stroke-dasharray:4 12; vector-effect:non-scaling-stroke; animation:sfiFlowMove 8s linear infinite; }
        .sfi-topographic-night-map .live-node-ring { fill:none; stroke:rgba(240,207,120,.5); stroke-width:1; vector-effect:non-scaling-stroke; animation:sfiNodePulse 4.8s ease-in-out infinite; }
        .sfi-topographic-night-map .live-node-core { fill:rgba(240,207,120,.88); filter:url('#sfiMapGlow'); }
        .sfi-topographic-night-map .live-map-node-critical .live-node-ring,
        .sfi-topographic-night-map .live-map-node-degraded .live-node-ring { stroke:rgba(184,80,80,.72); }
        .sfi-topographic-night-map .live-map-node-critical .live-node-core,
        .sfi-topographic-night-map .live-map-node-degraded .live-node-core { fill:rgba(255,155,112,.9); }
        .sfi-topographic-night-map .map-meta { fill:rgba(200,169,81,.42); font-size:9px; letter-spacing:.18em; font-family:var(--sfi-font-mono),'JetBrains Mono',monospace; }
        .sfi-topographic-night-map .map-meta.right { text-anchor:end; }
        .sfi-topographic-overlay { position:absolute; inset:0; width:100%; height:100%; opacity:.92; mix-blend-mode:screen; pointer-events:none; }
        .sfi-topo-contours path { fill:none; stroke:rgba(240,207,120,.16); stroke-width:.9; stroke-dasharray:1 8; vector-effect:non-scaling-stroke; animation:sfiTopoContour 14s ease-in-out infinite alternate; }
        .sfi-topo-contours path.thin { stroke:rgba(200,169,81,.08); stroke-width:.6; stroke-dasharray:1 12; }
        .sfi-topo-light-layer .bloom { fill:url(#sfiTopoLight); }
        .sfi-topo-light-layer .core { fill:rgba(240,207,120,.9); }
        .sfi-topo-light-layer g { animation:sfiTopoPulse 4.8s ease-in-out infinite alternate; }
        @keyframes sfiTopoContour { from { opacity:.38; transform:translateY(-2px); } to { opacity:.9; transform:translateY(2px); } }
        @keyframes sfiTopoPulse { from { opacity:.62; } to { opacity:1; } }
        @keyframes sfiViscosityBreath { from { opacity:.08; transform:scale(1); } to { opacity:.19; transform:scale(1.025); } }
        @keyframes sfiNightDrift { from { transform:translateX(-120px); } to { transform:translateX(120px); } }
        @keyframes sfiSolarPulse { from { opacity:.46; transform:scale(.985); } to { opacity:.78; transform:scale(1.025); } }
        @keyframes sfiLightPulse { from { opacity:.14; } to { opacity:.58; } }
        @keyframes sfiFlowMove { to { stroke-dashoffset:-64; } }
        @keyframes sfiNodePulse { 0%,100% { opacity:.18; transform:scale(.92); } 50% { opacity:.72; transform:scale(1.08); } }
      `}</style>
    </div>
  );
}

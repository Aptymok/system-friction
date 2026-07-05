'use client';

import { SfiObservatoryHero } from '@/components/observatory/quarantine/SfiObservatoryHero';
import { SfiTopographicNightMap } from '@/components/sfi/SfiTopographicNightMap';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import type { LonLat, MapPoint } from '@/lib/sfi/observatory/solarTerminator';
import type { SfiWorldInterpretation } from '@/lib/sfi/observatory/worldInterpretation';

type Props = {
  state: SfiWorldInterfaceState;
  terminator?: MapPoint[];
  subsolar?: LonLat;
  interpretation?: SfiWorldInterpretation;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function SfiObservatoryTopographicHero(props: Props) {
  const densityNodes = props.state.nodes.slice(0, 28);

  return (
    <div className="sfi-observatory-topographic-shell">
      <div className="sfi-observatory-topographic-stage" aria-hidden="true">
        <SfiTopographicNightMap state={props.state} />
      </div>
      <div className="sfi-observatory-topographic-ui">
        <SfiObservatoryHero {...props} />
      </div>
      <svg className="sfi-real-density-field" viewBox="0 0 1200 600" aria-hidden="true">
        <defs>
          <filter id="sfiRealDensitySoft"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {densityNodes.map((node, index) => {
          const x = clamp01(node.x / 100) * 1200;
          const y = clamp01(node.y / 100) * 600;
          const intensity = clamp01(node.intensity);
          return (
            <g key={`real-density-${node.id}`} className={`real-density-node real-density-node-${node.state}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} style={{ animationDelay: `${index * -0.21}s` }}>
              <circle className="density-shadow" r={14 + intensity * 24} />
              <circle className="density-ring" r={5 + intensity * 9} />
              <circle className="density-core" r={1.3 + intensity * 1.7} />
            </g>
          );
        })}
      </svg>
      <style jsx global>{`
        .sfi-observatory-topographic-shell { position:relative; min-height:max(900px,100svh); overflow:hidden; background:#020201; isolation:isolate; }
        .sfi-observatory-topographic-stage { position:absolute; inset:0; z-index:0; pointer-events:none; opacity:.62; mix-blend-mode:screen; }
        .sfi-observatory-topographic-ui { position:relative; z-index:1; }
        .sfi-observatory-topographic-ui .sfi-observatory { background:transparent; }
        .sfi-observatory-topographic-ui .sfi-observatory > .map { opacity:.28; background:url('/sfi/world-interface/codex-operational-reference.png') center/cover no-repeat; filter:saturate(1.02) contrast(1.02) brightness(.78); }
        .sfi-observatory-topographic-ui .shade { background:linear-gradient(90deg,rgba(2,2,1,.5),transparent 22%,transparent 78%,rgba(2,2,1,.5)),linear-gradient(180deg,rgba(2,2,1,.52),transparent 16%,transparent 76%,rgba(2,2,1,.68)); }
        .sfi-observatory-topographic-ui .component-tip { display:none !important; }

        .sfi-real-density-field { position:absolute; top:90px; right:300px; bottom:150px; left:260px; width:auto; height:auto; max-width:calc(100% - 580px); min-height:360px; z-index:5; pointer-events:none; overflow:visible; }
        .real-density-node { filter:url(#sfiRealDensitySoft); animation:sfiRealDensityDrift 9s ease-in-out infinite alternate; transform-box:fill-box; transform-origin:center; }
        .real-density-node .density-shadow { fill:rgba(240,207,120,.035); stroke:rgba(240,207,120,.08); stroke-width:.7; }
        .real-density-node .density-ring { fill:none; stroke:rgba(240,207,120,.2); stroke-width:.8; }
        .real-density-node .density-core { fill:rgba(240,207,120,.42); }
        .real-density-node-critical .density-core,
        .real-density-node-degraded .density-core { fill:rgba(255,155,112,.36); }
        .real-density-node-critical .density-ring,
        .real-density-node-degraded .density-ring { stroke:rgba(184,80,80,.18); }

        .sfi-observatory-topographic-ui .conn,
        .sfi-observatory-topographic-stage .map-flow { display:none !important; }

        .sfi-observatory-topographic-ui .terminator { animation:sfiFlowMove 12s linear infinite; opacity:.26 !important; }
        .sfi-observatory-topographic-ui .density-glow { opacity:.08 !important; animation:sfiNodePulse 10s ease-in-out infinite; }
        .sfi-observatory-topographic-ui .node .halo { fill:rgba(240,207,120,.025) !important; stroke:rgba(240,207,120,.08) !important; animation:sfiNodePulse 9s ease-in-out infinite; }
        .sfi-observatory-topographic-ui .node .ring { stroke:rgba(240,207,120,.24) !important; stroke-width:.8 !important; animation:none !important; }
        .sfi-observatory-topographic-ui .node .core { fill:rgba(240,207,120,.48) !important; }
        .sfi-observatory-topographic-ui .node:hover .halo { fill:rgba(240,207,120,.06) !important; stroke:rgba(240,207,120,.16) !important; }
        .sfi-observatory-topographic-ui .node:hover .ring { stroke:rgba(240,207,120,.48) !important; stroke-width:1.1 !important; }

        .sfi-observatory-topographic-stage .solar-bloom { opacity:.18 !important; }
        .sfi-observatory-topographic-stage .night-lights circle { opacity:.24 !important; }
        .sfi-observatory-topographic-stage .live-node-ring { stroke:rgba(240,207,120,.18) !important; opacity:.24 !important; }
        .sfi-observatory-topographic-stage .live-node-core { fill:rgba(240,207,120,.36) !important; opacity:.42 !important; }
        .sfi-observatory-topographic-stage .live-map-node-critical .live-node-ring,
        .sfi-observatory-topographic-stage .live-map-node-degraded .live-node-ring { stroke:rgba(184,80,80,.2) !important; }
        .sfi-observatory-topographic-stage .sfi-topo-light-layer .bloom { opacity:.08 !important; }
        .sfi-observatory-topographic-stage .sfi-topo-light-layer .core { opacity:.26 !important; }

        .sfi-observatory-topographic-ui .rail.left-rail,
        .sfi-observatory-topographic-ui .reading { scrollbar-width:thin; scrollbar-color:transparent transparent; transition:scrollbar-color .18s ease, border-color .18s ease; }
        .sfi-observatory-topographic-ui .rail.left-rail:hover,
        .sfi-observatory-topographic-ui .rail.left-rail:focus-within,
        .sfi-observatory-topographic-ui .reading:hover,
        .sfi-observatory-topographic-ui .reading:focus-within { scrollbar-color:rgba(240,207,120,.26) transparent; }
        .sfi-observatory-topographic-ui .rail.left-rail::-webkit-scrollbar,
        .sfi-observatory-topographic-ui .reading::-webkit-scrollbar { width:3px; height:3px; }
        .sfi-observatory-topographic-ui .rail.left-rail::-webkit-scrollbar-track,
        .sfi-observatory-topographic-ui .reading::-webkit-scrollbar-track { background:transparent; }
        .sfi-observatory-topographic-ui .rail.left-rail::-webkit-scrollbar-thumb,
        .sfi-observatory-topographic-ui .reading::-webkit-scrollbar-thumb { background:transparent; border-radius:999px; }
        .sfi-observatory-topographic-ui .rail.left-rail:hover::-webkit-scrollbar-thumb,
        .sfi-observatory-topographic-ui .rail.left-rail:focus-within::-webkit-scrollbar-thumb,
        .sfi-observatory-topographic-ui .reading:hover::-webkit-scrollbar-thumb,
        .sfi-observatory-topographic-ui .reading:focus-within::-webkit-scrollbar-thumb { background:rgba(240,207,120,.22); }
        @keyframes sfiRealDensityDrift { from { opacity:.52; transform:scale(.98); } to { opacity:.9; transform:scale(1.04); } }
        @media (max-width: 980px) { .sfi-real-density-field { left:20px; right:20px; top:580px; max-width:none; } }
      `}</style>
    </div>
  );
}

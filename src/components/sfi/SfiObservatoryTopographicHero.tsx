'use client';

import { SfiObservatoryHero } from '@/components/sfi/SfiObservatoryHero';
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

export function SfiObservatoryTopographicHero(props: Props) {
  return (
    <div className="sfi-observatory-topographic-shell">
      <div className="sfi-observatory-topographic-stage" aria-hidden="true">
        <SfiTopographicNightMap state={props.state} />
      </div>
      <div className="sfi-observatory-topographic-ui">
        <SfiObservatoryHero {...props} />
      </div>
      <style jsx global>{`
        .sfi-observatory-topographic-shell { position:relative; min-height:max(900px,100svh); overflow:hidden; background:#020201; isolation:isolate; }
        .sfi-observatory-topographic-stage { position:absolute; inset:0; z-index:0; pointer-events:none; opacity:.62; mix-blend-mode:screen; }
        .sfi-observatory-topographic-ui { position:relative; z-index:1; }
        .sfi-observatory-topographic-ui .sfi-observatory { background:transparent; }
        .sfi-observatory-topographic-ui .sfi-observatory > .map { opacity:.28; background:url('/sfi/world-interface/codex-operational-reference.png') center/cover no-repeat; filter:saturate(1.02) contrast(1.02) brightness(.78); }
        .sfi-observatory-topographic-ui .shade { background:linear-gradient(90deg,rgba(2,2,1,.5),transparent 22%,transparent 78%,rgba(2,2,1,.5)),linear-gradient(180deg,rgba(2,2,1,.52),transparent 16%,transparent 76%,rgba(2,2,1,.68)); }
        .sfi-observatory-topographic-ui .component-tip { display:none !important; }

        .sfi-observatory-topographic-ui .conn,
        .sfi-observatory-topographic-stage .map-flow { display:none !important; }

        .sfi-observatory-topographic-ui .terminator { animation:sfiFlowMove 12s linear infinite; opacity:.26 !important; }
        .sfi-observatory-topographic-ui .density-glow { opacity:.13 !important; animation:sfiNodePulse 8s ease-in-out infinite; }
        .sfi-observatory-topographic-ui .node .halo { fill:rgba(240,207,120,.035) !important; stroke:rgba(240,207,120,.11) !important; animation:sfiNodePulse 7s ease-in-out infinite; }
        .sfi-observatory-topographic-ui .node .ring { stroke:rgba(240,207,120,.32) !important; stroke-width:.9 !important; animation:none !important; }
        .sfi-observatory-topographic-ui .node .core { fill:rgba(240,207,120,.62) !important; }
        .sfi-observatory-topographic-ui .node:hover .halo { fill:rgba(240,207,120,.07) !important; stroke:rgba(240,207,120,.18) !important; }
        .sfi-observatory-topographic-ui .node:hover .ring { stroke:rgba(240,207,120,.55) !important; stroke-width:1.2 !important; }

        .sfi-observatory-topographic-stage .solar-bloom { opacity:.24 !important; }
        .sfi-observatory-topographic-stage .night-lights circle { opacity:.28 !important; }
        .sfi-observatory-topographic-stage .live-node-ring { stroke:rgba(240,207,120,.22) !important; opacity:.28 !important; }
        .sfi-observatory-topographic-stage .live-node-core { fill:rgba(240,207,120,.46) !important; opacity:.5 !important; }
        .sfi-observatory-topographic-stage .live-map-node-critical .live-node-ring,
        .sfi-observatory-topographic-stage .live-map-node-degraded .live-node-ring { stroke:rgba(184,80,80,.24) !important; }
        .sfi-observatory-topographic-stage .sfi-topo-light-layer .bloom { opacity:.12 !important; }
        .sfi-observatory-topographic-stage .sfi-topo-light-layer .core { opacity:.34 !important; }

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
      `}</style>
    </div>
  );
}

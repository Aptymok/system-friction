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
        .sfi-observatory-topographic-stage { position:absolute; inset:0; z-index:0; pointer-events:none; opacity:.84; mix-blend-mode:screen; }
        .sfi-observatory-topographic-ui { position:relative; z-index:1; }
        .sfi-observatory-topographic-ui .sfi-observatory { background:transparent; }
        .sfi-observatory-topographic-ui .sfi-observatory > .map { opacity:.34; background:url('/sfi/world-interface/codex-operational-reference.png') center/cover no-repeat; filter:saturate(1.04) contrast(1.04) brightness(.82); }
        .sfi-observatory-topographic-ui .shade { background:linear-gradient(90deg,rgba(2,2,1,.5),transparent 22%,transparent 78%,rgba(2,2,1,.5)),linear-gradient(180deg,rgba(2,2,1,.52),transparent 16%,transparent 76%,rgba(2,2,1,.68)); }
        .sfi-observatory-topographic-ui .component-tip { display:none !important; }
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

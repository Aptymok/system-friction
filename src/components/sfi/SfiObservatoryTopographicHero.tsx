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
        .sfi-observatory-topographic-stage { position:absolute; inset:0; z-index:0; pointer-events:none; }
        .sfi-observatory-topographic-ui { position:relative; z-index:1; }
        .sfi-observatory-topographic-ui .sfi-observatory { background:transparent; }
        .sfi-observatory-topographic-ui .sfi-observatory > .map { opacity:0; background:none; }
      `}</style>
    </div>
  );
}

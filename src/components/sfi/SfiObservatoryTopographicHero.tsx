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
    </div>
  );
}

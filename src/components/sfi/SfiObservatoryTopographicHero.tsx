'use client';

import { SfiObservatoryHero } from '@/components/sfi/SfiObservatoryHero';
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
  return <SfiObservatoryHero {...props} />;
}

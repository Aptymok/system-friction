import type { Metadata } from 'next';
import Link from 'next/link';
import { AmvPhaseStatusPanel } from '@/components/amv/AmvPhaseStatusPanel';
import { PublicObservatoryTimelineNavigator } from '@/components/observatory/public/PublicObservatoryTimelineNavigator';
import { PublicWorldVectorObservatory } from '@/components/observatory/public/PublicWorldVectorObservatory';
import { SfiSurfaceGuide } from '@/components/sfi/SfiSurfaceGuide';
import { readPublicObservatoryState } from '@/lib/observatory/public/readPublicObservatoryState';

const PUBLIC_OBSERVATORY_DESCRIPTION =
  'Public 90-day World State synthesis: World Vector, longitudinal WorldSpect observation, dominant tensions and the Daily Reading by System Friction Institute.';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Public Observatory · WORLD STATE · System Friction Institute',
  description: PUBLIC_OBSERVATORY_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Public Observatory · WORLD STATE',
    description: PUBLIC_OBSERVATORY_DESCRIPTION,
    type: 'website',
  },
};

export default async function ObservatoryPage() {
  const state = await readPublicObservatoryState();
  return (
    <main className="min-h-screen bg-[#060605]">
      <SfiSurfaceGuide
        current="observatory"
        eyebrow="SFI · síntesis pública"
        title="Una lectura agregada del estado mundial."
        description="El Observatorio Público presenta únicamente información agregada, longitudinal y publicable. No muestra casos privados, no permite intervenir y no sustituye la exploración localizada del Campo Mundial."
      >
        <Link href="/field/map">ABRIR CAMPO MUNDIAL</Link>
      </SfiSurfaceGuide>
      <div className="bg-[#060605] px-4 pt-4">
        <AmvPhaseStatusPanel endpoint="/api/observatory/instrument-status" compact title="MADUREZ DEL INSTRUMENTO" />
      </div>
      <PublicObservatoryTimelineNavigator />
      <PublicWorldVectorObservatory state={state} />
    </main>
  );
}
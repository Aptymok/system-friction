import type { Metadata } from 'next';
import { AmvPhaseStatusPanel } from '@/components/amv/AmvPhaseStatusPanel';
import { PublicWorldVectorObservatory } from '@/components/observatory/public/PublicWorldVectorObservatory';
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
    <>
      <div className="border-b border-[#d8a94e]/20 bg-[#060605] px-4 py-3 font-mono text-[10px] tracking-[0.16em] text-[#78909c]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-[#d8a94e]">PUBLIC OBSERVATORY · WORLD STATE</strong>
            <span className="ml-3">SÍNTESIS AGREGADA, LONGITUDINAL Y PUBLICABLE</span>
          </div>
          <a
            href="/field/map"
            className="border border-[#d8a94e]/35 px-3 py-2 text-[#d8a94e] transition hover:bg-[#d8a94e]/10"
          >
            OPEN WORLD FIELD · MAPA LOCALIZADO →
          </a>
        </div>
      </div>
      <div className="bg-[#060605] px-4 pt-4">
        <AmvPhaseStatusPanel endpoint="/api/observatory/instrument-status" compact title="OBSERVATORY · INSTRUMENT MATURITY" />
      </div>
      <PublicWorldVectorObservatory state={state} />
    </>
  );
}

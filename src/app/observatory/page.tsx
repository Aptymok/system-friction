import type { Metadata } from 'next';
import { AmvPhaseStatusPanel } from '@/components/amv/AmvPhaseStatusPanel';
import { PublicWorldVectorObservatory } from '@/components/observatory/public/PublicWorldVectorObservatory';
import { readPublicObservatoryState } from '@/lib/observatory/public/readPublicObservatoryState';

const PUBLIC_OBSERVATORY_DESCRIPTION =
  'Public 90-day World Vector, longitudinal WorldSpect observation, current tensions and the Daily Reading by System Friction Institute.';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Public Observatory · World Vector · System Friction Institute',
  description: PUBLIC_OBSERVATORY_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Public Observatory · World Vector',
    description: PUBLIC_OBSERVATORY_DESCRIPTION,
    type: 'website',
  },
};

export default async function ObservatoryPage() {
  const state = await readPublicObservatoryState();
  return (
    <>
      <div className="bg-[#060605] px-4 pt-4">
        <AmvPhaseStatusPanel endpoint="/api/observatory/instrument-status" compact title="OBSERVATORY · INSTRUMENT MATURITY" />
      </div>
      <PublicWorldVectorObservatory state={state} />
    </>
  );
}

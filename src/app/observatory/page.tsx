import type { Metadata } from 'next';
import { PublicWorldVectorObservatory } from '@/components/observatory/public/PublicWorldVectorObservatory';
import { readObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldAdapter';

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
  const state = await readObservatoryGoldState();
  return <PublicWorldVectorObservatory state={state} />;
}

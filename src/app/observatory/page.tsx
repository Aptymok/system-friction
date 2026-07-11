import type { Metadata } from 'next';
import { PublicWorldVectorObservatory } from '@/components/observatory/public/PublicWorldVectorObservatory';
import { readObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldAdapter';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Public Observatory · World Vector · System Friction Institute',
  description:
    'Public World Vector, longitudinal WorldSpect observation, current tensions and the Daily Reading by System Friction Institute.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Public Observatory · World Vector',
    description: 'Longitudinal observation of the world and the Daily Reading by System Friction Institute.',
    type: 'website',
  },
};

export default async function ObservatoryPage() {
  const state = await readObservatoryGoldState();
  return <PublicWorldVectorObservatory state={state} />;
}

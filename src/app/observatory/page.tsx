import type { Metadata } from 'next';
import { PublicObservatoryUnified } from '@/components/observatory/public/PublicObservatoryUnified';
import { readGovernedPublicObservatoryState } from '@/lib/observatory/public/readGovernedPublicObservatoryState';

const PUBLIC_OBSERVATORY_DESCRIPTION =
  'Public 90-day World State synthesis: World Vector, longitudinal trajectories, derived phenomenon candidates and governed public readings by System Friction Institute.';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Public Observatory · WORLD STATE · System Friction Institute',
  description: PUBLIC_OBSERVATORY_DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Public Observatory · WORLD STATE',
    description: PUBLIC_OBSERVATORY_DESCRIPTION,
    type: 'website',
  },
};

export default async function ObservatoryPage() {
  const state = await readGovernedPublicObservatoryState();
  // Temporal ownership moved into PublicObservatoryUnified: <PublicObservatoryTimelineNavigator />.
  return <PublicObservatoryUnified state={state} />;
}

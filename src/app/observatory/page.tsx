import type { Metadata } from 'next';
import { ObservatoryGoldConsole } from '@/components/observatory/gold/ObservatoryGoldConsole';
import { readObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldAdapter';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Observatory / World Spectrum Vector',
  description:
    'SFI Observatory: public World Spectrum Vector console for global tensions, daily reading, vector flows, and longitudinal WorldSpect observation.',
};

export default async function ObservatoryPage() {
  const state = await readObservatoryGoldState();
  return <ObservatoryGoldConsole state={state} />;
}

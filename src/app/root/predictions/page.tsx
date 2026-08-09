import type { Metadata } from 'next';
import { requireRootObserverPage } from '@/lib/root/server';
import { readRootSovereignState } from '@/lib/root/sovereign/rootSovereignAdapter';
import { PredictionCasesConsole } from '@/components/root/predictions/PredictionCasesConsole';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Prediction Cases · SFI ROOT', robots: { index: false, follow: false, nocache: true } };

export default async function RootPredictionsPage() {
  await requireRootObserverPage('/root/predictions');
  const state = await readRootSovereignState();
  return <PredictionCasesConsole
    runs={state.predictions.data.runs}
    legacy={state.predictions.data.legacyEntries}
    outcomes={state.predictions.data.outcomes}
    attractors={state.amv.data.attractors}
  />;
}

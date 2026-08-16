import type { Metadata } from 'next';
import { CognitiveTwinArchaeologyPanel } from '@/components/root/cognitive-twin/CognitiveTwinArchaeologyPanel';
import { CognitiveTwinNativeSurface } from '@/components/root/surfaces/CognitiveTwinNativeSurface';
import { readCognitiveTwinState } from '@/core/cognitive-twin/readState';
import { readCognitiveTwinAncestralState } from '@/core/cognitive-twin/ancestralCapabilities';
import { readCognitiveTwinLineageHealth } from '@/core/cognitive-twin/reentry/runtime';
import { readCognitiveTwinExperimentState } from '@/core/cognitive-twin/reentry/experimentState';
import { readCognitiveTwinMutationState } from '@/core/cognitive-twin/reentry/mutationState';
import { readCognitiveTwinJournal } from '@/core/cognitive-twin/reentry/journal';
import { requireRootObserverPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'SFI Cognitive Twin · ROOT', robots: { index: false, follow: false, nocache: true } };

export default async function CognitiveTwinPage() {
  const ctx = await requireRootObserverPage('/root/cognitive-twin');
  const legacy = await readCognitiveTwinAncestralState();
  if (!ctx.isRoot) return <CognitiveTwinArchaeologyPanel legacy={legacy}/>;

  const [state, lineage, experiments, mutations, journal] = await Promise.all([
    readCognitiveTwinState(),
    readCognitiveTwinLineageHealth(),
    readCognitiveTwinExperimentState(),
    readCognitiveTwinMutationState(),
    readCognitiveTwinJournal(),
  ]);

  return <CognitiveTwinNativeSurface state={state} lineage={lineage} experiments={experiments} mutations={mutations} journal={journal}/>;
}

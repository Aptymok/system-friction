import type { Metadata } from 'next';
import { CognitiveTwinConsole } from '@/components/root/cognitive-twin/CognitiveTwinConsole';
import { CognitiveTwinIntegrationPanel } from '@/components/root/cognitive-twin/CognitiveTwinIntegrationPanel';
import { CognitiveTwinArchaeologyPanel } from '@/components/root/cognitive-twin/CognitiveTwinArchaeologyPanel';
import { readCognitiveTwinState } from '@/core/cognitive-twin/readState';
import { readCognitiveTwinAncestralState } from '@/core/cognitive-twin/ancestralCapabilities';
import { readCognitiveTwinLineageHealth } from '@/core/cognitive-twin/reentry/runtime';
import { readCognitiveTwinExperimentState } from '@/core/cognitive-twin/reentry/experimentState';
import { readCognitiveTwinMutationState } from '@/core/cognitive-twin/reentry/mutationState';
import { readCognitiveTwinJournal } from '@/core/cognitive-twin/reentry/journal';
import { requireRootObserverPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SFI Cognitive Twin · ROOT',
  robots: { index: false, follow: false, nocache: true },
};

export default async function CognitiveTwinPage() {
  const ctx=await requireRootObserverPage('/root/cognitive-twin');
  const legacy=await readCognitiveTwinAncestralState();

  if(!ctx.isRoot) return <CognitiveTwinArchaeologyPanel legacy={legacy}/>;

  const [state,lineage,experiments,mutations,journal]=await Promise.all([
    readCognitiveTwinState(),
    readCognitiveTwinLineageHealth(),
    readCognitiveTwinExperimentState(),
    readCognitiveTwinMutationState(),
    readCognitiveTwinJournal(),
  ]);

  return <>
    <CognitiveTwinIntegrationPanel integration={state.integration} />
    <CognitiveTwinConsole state={state} />
    <CognitiveTwinArchaeologyPanel legacy={legacy} lineage={lineage} experiments={experiments} mutations={mutations} journal={journal}/>
  </>;
}

import type { Metadata } from 'next';
import { CognitiveTwinConsole } from '@/components/root/cognitive-twin/CognitiveTwinConsole';
import { CognitiveTwinIntegrationPanel } from '@/components/root/cognitive-twin/CognitiveTwinIntegrationPanel';
import { readCognitiveTwinState } from '@/lib/cognitive-twin/readState';
import { requireFounderPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SFI Cognitive Twin · ROOT',
  robots: { index: false, follow: false, nocache: true },
};

export default async function CognitiveTwinPage() {
  await requireFounderPage('/root/cognitive-twin');
  const state = await readCognitiveTwinState();
  return <>
    <CognitiveTwinIntegrationPanel integration={state.integration} />
    <CognitiveTwinConsole state={state} />
  </>;
}

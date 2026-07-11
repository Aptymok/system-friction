import type { Metadata } from 'next';
import { RootGovernanceConsole } from '@/components/root/gold/RootGovernanceConsole';
import { readRootGovernanceState } from '@/lib/root/gold/rootGovernanceAdapter';
import { requireFounderPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function RootPage() {
  await requireFounderPage('/root');
  const state = await readRootGovernanceState();
  return <RootGovernanceConsole state={state} />;
}

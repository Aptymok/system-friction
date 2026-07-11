import { RootGovernanceConsole } from '@/components/root/gold/RootGovernanceConsole';
import { readRootGovernanceState } from '@/lib/root/gold/rootGovernanceAdapter';
import { requireFounderPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  await requireFounderPage('/root');
  const state = await readRootGovernanceState();
  return <RootGovernanceConsole state={state} />;
}

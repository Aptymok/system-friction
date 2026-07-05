import { RootGovernanceConsole } from '@/components/root/gold/RootGovernanceConsole';
import { readRootGovernanceState } from '@/lib/root/gold/rootGovernanceAdapter';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const state = await readRootGovernanceState();
  return <RootGovernanceConsole state={state} />;
}

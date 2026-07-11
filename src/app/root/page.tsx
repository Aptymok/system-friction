import { RootSovereignConsole } from '@/components/root/sovereign/RootSovereignConsole';
import { requireFounderPage } from '@/lib/root/server';
import { readRootSovereignState } from '@/lib/root/sovereign/rootSovereignAdapter';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  await requireFounderPage('/root');
  const state = await readRootSovereignState();
  return <RootSovereignConsole initialState={state} />;
}

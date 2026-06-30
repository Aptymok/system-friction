import FounderConsoleClient from '@/components/founder-console/FounderConsoleClient';
import AgenticRootConsole from '@/components/root/AgenticRootConsole';
import WorldVectorPanel from '@/components/world-vector/WorldVectorPanel';
import { buildAgenticRootState } from '@/lib/agents/sfiAgents';
import { buildFounderConsoleState } from '@/lib/founder-console/readModel';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';

export const dynamic = 'force-dynamic';

export default async function RootDashboardPage() {
  const [state, worldVector, agentic] = await Promise.all([
    buildFounderConsoleState(),
    buildWorldVectorOperationalState(),
    buildAgenticRootState(),
  ]);

  return (
    <>
      <WorldVectorPanel state={worldVector} />
      <AgenticRootConsole initialState={agentic} />
      <FounderConsoleClient initialState={state} surface="root" />
    </>
  );
}

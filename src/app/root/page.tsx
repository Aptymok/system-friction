import SfiRootLiveConsole from '@/components/root/SfiRootLiveConsole';
import { buildAgenticRootState } from '@/lib/agents/sfiAgents';
import { getRootHudGovernanceSnapshot } from '@/lib/root/hudGovernance';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const [worldVector, agentic, governance] = await Promise.all([
    buildWorldVectorOperationalState(),
    buildAgenticRootState(),
    getRootHudGovernanceSnapshot(),
  ]);

  return <SfiRootLiveConsole initialState={agentic} worldVector={worldVector} governance={governance} />;
}

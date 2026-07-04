import SfiRootLiveConsole from '@/components/root/SfiRootLiveConsole';
import { buildAgenticRootState } from '@/lib/agents/sfiAgents';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const [worldVector, agentic] = await Promise.all([
    buildWorldVectorOperationalState(),
    buildAgenticRootState(),
  ]);

  return <SfiRootLiveConsole initialState={agentic} worldVector={worldVector} />;
}

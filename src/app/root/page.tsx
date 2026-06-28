import FounderConsoleClient from '@/components/founder-console/FounderConsoleClient';
import WorldVectorPanel from '@/components/world-vector/WorldVectorPanel';
import { buildFounderConsoleState } from '@/lib/founder-console/readModel';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';

export const dynamic = 'force-dynamic';

export default async function RootDashboardPage() {
  const [state, worldVector] = await Promise.all([
    buildFounderConsoleState(),
    buildWorldVectorOperationalState(),
  ]);

  return (
    <>
      <WorldVectorPanel state={worldVector} />
      <FounderConsoleClient initialState={state} surface="root" />
    </>
  );
}

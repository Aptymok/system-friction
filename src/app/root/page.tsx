import FounderConsoleClient from '@/components/founder-console/FounderConsoleClient';
import { buildFounderConsoleState } from '@/lib/founder-console/readModel';

export const dynamic = 'force-dynamic';

export default async function RootDashboardPage() {
  const state = await buildFounderConsoleState();
  return <FounderConsoleClient initialState={state} surface="root" />;
}

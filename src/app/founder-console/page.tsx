import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import FounderConsoleClient from '@/components/founder-console/FounderConsoleClient';
import { buildFounderConsoleState } from '@/lib/founder-console/readModel';

export const dynamic = 'force-dynamic';

export default async function FounderConsolePage() {
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;
  const state = await buildFounderConsoleState(origin);

  if (!state.access.authenticated) {
    redirect('/login?next=%2Ffounder-console');
  }

  if (!state.access.authorized) {
    redirect('/unauthorized');
  }

  return <FounderConsoleClient initialState={state} />;
}

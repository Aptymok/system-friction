import type { Metadata } from 'next';
import { ContinuityConsole } from '@/components/root/continuity/ContinuityConsole';
import { readContinuityDashboard } from '@/lib/continuity/runtime';
import { requireFounderPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SFI Continuity Runtime',
  robots: { index: false, follow: false, nocache: true },
};

export default async function RootContinuityPage() {
  await requireFounderPage('/root/continuity');
  let dashboard;
  try {
    const observed = await readContinuityDashboard();
    dashboard = {
      ...observed,
      errors: observed.errors.filter((item): item is string => typeof item === 'string'),
    };
  } catch (error) {
    dashboard = {
      state: { mode: 'UNAVAILABLE' }, runs: [], checks: [], incidents: [], decisions: [], reports: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  return <ContinuityConsole initial={dashboard} />;
}

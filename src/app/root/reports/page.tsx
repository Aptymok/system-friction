import { requireRootObserverPage } from '@/lib/root/server';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';
import { RootReportsConsole } from '@/components/root/reports/RootReportsConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function RootReportsPage() {
  const ctx = await requireRootObserverPage('/root/reports');
  const inbox = await readRootReportInbox();
  const health = await readRootReportHealth(inbox);

  return <RootReportsConsole
    initialInbox={inbox}
    initialHealth={health}
    actorLabel={ctx.profile?.alias || ctx.user?.email || 'ROOT'}
  />;
}

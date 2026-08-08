import { requireRootObserverPage } from '@/lib/root/server';
import { RootReportsConsole } from '@/components/root/reports/RootReportsConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function RootReportsPage() {
  const ctx = await requireRootObserverPage('/root/reports');
  const reports = await ctx.service
    .from('sfi_cognitive_twin_runs')
    .select('id,task_id,status,objective,input_snapshot,output_envelope,evidence_refs,limitations,provider,model,started_at,finished_at,created_at')
    .eq('role', 'report_agent')
    .order('created_at', { ascending: false })
    .limit(100);

  return <RootReportsConsole
    initialReports={(reports.data ?? []) as Record<string, unknown>[]}
    canGenerate={ctx.isRoot}
    actorLabel={ctx.profile?.alias || ctx.user?.email || 'ROOT'}
  />;
}

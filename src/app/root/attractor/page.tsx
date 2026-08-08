import { requireRootObserverPage } from '@/lib/root/server';
import { readInstitutionalAttractor } from '@/lib/institution/institutionalAttractor';
import { AttractorFieldConsole } from '@/components/root/attractor/AttractorFieldConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function RootInstitutionalAttractorPage() {
  const ctx = await requireRootObserverPage('/root/attractor');
  const [state, experiment] = await Promise.all([
    readInstitutionalAttractor(),
    ctx.service.from('sfi_institutional_experiments').select('*').eq('experiment_key', 'SFI-INSTITUTIONAL-30D-001').maybeSingle(),
  ]);

  return (
    <AttractorFieldConsole
      state={{ ...state, warnings: [...state.warnings, ...(experiment.error ? [experiment.error.message] : [])] }}
      experiment={experiment.data ?? null}
      canEdit={ctx.isRoot}
    />
  );
}

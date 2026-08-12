import { requireRootObserverPage } from '@/lib/root/server';
import { readInstitutionalAttractor } from '@/lib/institution/institutionalAttractor';
import { AttractorFieldConsole } from '@/components/root/attractor/AttractorFieldConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function RootInstitutionalAttractorPage() {
  const ctx = await requireRootObserverPage('/root/attractor');
  const fullState = await readInstitutionalAttractor();
  const { experiment, ...state } = fullState;

  return (
    <AttractorFieldConsole
      state={state}
      experiment={experiment}
      canEdit={ctx.isRoot}
    />
  );
}

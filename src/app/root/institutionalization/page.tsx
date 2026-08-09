import { requireRootObserverPage } from '@/lib/root/server';
import { InstitutionalizationConsole } from '@/components/root/institutionalization/InstitutionalizationConsole';
import { FounderVacationConsole } from '@/components/root/institutionalization/FounderVacationConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function InstitutionalizationPage() {
  const ctx = await requireRootObserverPage('/root/institutionalization');
  const accessMode = ctx.isRoot ? 'sovereign' : 'observer';
  const actorLabel = ctx.profile?.alias || ctx.user?.email || 'ROOT';

  return <>
    <FounderVacationConsole actorLabel={actorLabel} accessMode={accessMode} />
    <InstitutionalizationConsole
      canGovern={ctx.isRoot}
      actorLabel={actorLabel}
      accessMode={accessMode}
    />
  </>;
}

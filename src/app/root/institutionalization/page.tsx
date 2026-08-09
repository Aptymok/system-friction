import { requireRootObserverPage } from '@/lib/root/server';
import { InstitutionalizationConsole } from '@/components/root/institutionalization/InstitutionalizationConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function InstitutionalizationPage() {
  const ctx = await requireRootObserverPage('/root/institutionalization');
  return <InstitutionalizationConsole
    canGovern={ctx.isRoot}
    actorLabel={ctx.profile?.alias || ctx.user?.email || 'ROOT'}
    accessMode={ctx.isRoot ? 'sovereign' : 'observer'}
  />;
}

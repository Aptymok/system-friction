import { requireFounderPage } from '@/lib/root/server';
import { readInstitutionalAttractor } from '@/lib/institution/institutionalAttractor';
import { InstitutionalAttractorConsole } from '@/components/root/attractor/InstitutionalAttractorConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function RootInstitutionalAttractorPage() {
  await requireFounderPage('/root/attractor');
  const state = await readInstitutionalAttractor();
  return <InstitutionalAttractorConsole state={state} />;
}

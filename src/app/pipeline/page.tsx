import type { Metadata } from 'next';
import { RootOperatingField } from '@/components/root/operate/RootOperatingField';
import { RootCycleAnalysisDockAuto } from '@/components/root/operate/RootCycleAnalysisDockAuto';
import { requireRootObserverPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function InstitutionalPipelinePage() {
  const ctx = await requireRootObserverPage('/pipeline');
  const role = typeof ctx.profile?.role === 'string' ? ctx.profile.role : null;
  return (
    <main className="min-h-screen bg-transparent">
      <section data-sfi-field-anchor="operating-field"><RootOperatingField actorLabel={ctx.profile?.alias || ctx.user?.email || role || 'ROOT'} /></section>
      <section data-sfi-field-anchor="cycle-analysis" className="bg-[#070806bf] px-8 pb-20 backdrop-blur-xl"><RootCycleAnalysisDockAuto /></section>
    </main>
  );
}

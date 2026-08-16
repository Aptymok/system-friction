import type { Metadata } from 'next';
import { RootOperatingField } from '@/components/root/operate/RootOperatingField';
import { RootCycleAnalysisDockAuto } from '@/components/root/operate/RootCycleAnalysisDockAuto';
import { requireRootObserverPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function InstitutionalPipelinePage() {
  const ctx = await requireRootObserverPage('/pipeline');
  const role = typeof ctx.profile?.role === 'string' ? ctx.profile.role : null;
  const actor = ctx.profile?.alias || ctx.user?.email || role || 'ROOT';
  return (
    <main className="min-h-screen bg-[#020405] text-[#dce5e3]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#17313a] bg-[#030809] px-5 py-3 font-mono text-[8px] uppercase tracking-[0.16em]">
        <div><span className="text-[#65d9e4]">SFI PIPELINE</span><span className="mx-3 text-[#2f5058]">/</span><span className="text-[#6f878a]">INSTITUTIONAL OPERATING FIELD</span></div>
        <div className="text-[#8a7698]">{actor} · OBSERVATION / GOVERNED EXECUTION BOUNDARY</div>
      </header>
      <RootOperatingField actorLabel={actor} />
      <section className="border-t border-[#17313a] bg-[#030708] px-4 pb-20 pt-4 sm:px-8">
        <div className="mb-3 flex flex-wrap justify-between gap-3 font-mono text-[7px] uppercase tracking-[0.14em] text-[#56757a]"><span>CYCLE ANALYSIS · REAL PIPELINE STATE</span><span>ANALYSIS ≠ APPROVAL · PIPELINE VIEW ≠ ROOT TRUTH</span></div>
        <RootCycleAnalysisDockAuto />
      </section>
    </main>
  );
}

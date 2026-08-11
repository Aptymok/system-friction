import type { Metadata } from 'next';
import { RootOperatingField } from '@/components/root/operate/RootOperatingField';
import { RootCycleAnalysisDockAuto } from '@/components/root/operate/RootCycleAnalysisDockAuto';
import { requireRootObserverPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index:false, follow:false, nocache:true } };

export default async function RootPage() {
  const ctx = await requireRootObserverPage('/root');
  const role = typeof ctx.profile?.role === 'string' ? ctx.profile.role : null;
  return <>
    <RootOperatingField actorLabel={ctx.profile?.alias||ctx.user?.email||role||'ROOT'} />
    <div style={{background:'#f2f0e9',padding:'0 32px 80px'}}><RootCycleAnalysisDockAuto /></div>
  </>;
}
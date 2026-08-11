import type { Metadata } from 'next';
import { RootOperatingField } from '@/components/root/operate/RootOperatingField';
import { requireRootObserverPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index:false, follow:false, nocache:true } };

export default async function RootPage() {
  const ctx = await requireRootObserverPage('/root');
  const role = typeof ctx.profile?.role === 'string' ? ctx.profile.role : null;
  return <RootOperatingField actorLabel={ctx.profile?.alias||ctx.user?.email||role||'ROOT'} />;
}

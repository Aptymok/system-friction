import type { Metadata } from 'next';
import { RootDirectorConsole } from '@/components/root/director/RootDirectorConsole';
import { requireRootObserverPage } from '@/lib/root/server';
import { readRootSovereignState } from '@/lib/root/sovereign/rootSovereignAdapter';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ROOT · SFI Direction', robots: { index: false, follow: false, nocache: true } };

export default async function RootPage() {
  const ctx = await requireRootObserverPage('/root');
  const state = await readRootSovereignState();
  const role = typeof ctx.profile?.role === 'string' ? ctx.profile.role : null;
  return <RootDirectorConsole state={state} accessMode={ctx.isRoot ? 'sovereign' : 'observer'} actorLabel={ctx.profile?.alias || ctx.user?.email || role || 'observer'} />;
}

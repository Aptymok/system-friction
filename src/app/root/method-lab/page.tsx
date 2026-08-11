import Link from 'next/link';
import { requireRootObserverPage } from '@/lib/root/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { MethodLabConsole } from '@/components/root/method-lab/MethodLabConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function MethodLabPage() {
  await requireRootObserverPage('/root/method-lab');
  const state = await readMethodLabState();
  return <>
    <MethodLabConsole state={state} />
    <Link href="/root" style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 10, border: '1px solid #4c422a', background: '#080807', color: '#c8ae69', padding: '8px 10px', font: '9px ui-monospace,monospace', textDecoration: 'none' }}>ROOT</Link>
  </>;
}

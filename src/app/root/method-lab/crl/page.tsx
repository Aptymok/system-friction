import { redirect } from 'next/navigation';
import { requireRootObserverPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function CognitiveRelationalLabPage() {
  await requireRootObserverPage('/root/method-lab/crl');
  redirect('/root/method-lab');
}

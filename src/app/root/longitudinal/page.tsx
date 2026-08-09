import type { Metadata } from 'next';
import { requireRootObserverPage } from '@/lib/root/server';
import { LongitudinalTimeObserver } from '@/components/root/longitudinal/LongitudinalTimeObserver';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Longitudinal Time Observer · SFI ROOT', robots: { index: false, follow: false, nocache: true } };

export default async function LongitudinalPage() {
  await requireRootObserverPage('/root/longitudinal');
  return <LongitudinalTimeObserver />;
}

import type { Metadata } from 'next';
import { requireFounderPage } from '@/lib/root/server';
import { FounderDecisionQueue } from '@/components/root/decisions/FounderDecisionQueue';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Founder Decision Queue · SFI ROOT', robots: { index: false, follow: false, nocache: true } };

export default async function FounderDecisionQueuePage() {
  await requireFounderPage('/root/decisions');
  return <FounderDecisionQueue />;
}

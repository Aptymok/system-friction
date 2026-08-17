import type { Metadata } from 'next';
import { RootReturnCertificates } from '@/components/root/returns/RootReturnCertificates';
import { requireFounderPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Return Certificates · ROOT',
  robots: { index: false, follow: false, nocache: true },
};

export default async function RootReturnsPage() {
  await requireFounderPage('/root/returns');
  return <main className="min-h-screen bg-transparent"><RootReturnCertificates /></main>;
}

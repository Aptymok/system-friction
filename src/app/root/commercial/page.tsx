import type { Metadata } from 'next';
import { RootCommercialWorkspace } from '@/components/root/commercial/RootCommercialWorkspace';
import { RootProspectRadar } from '@/components/root/prospect-radar/RootProspectRadar';
import { requireFounderPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Commercial Intelligence · ROOT',
  robots: { index: false, follow: false, nocache: true },
};

export default async function RootCommercialPage() {
  await requireFounderPage('/root/commercial');
  return <main className="min-h-screen bg-transparent">
    <section id="prospect-radar" data-sfi-field-anchor="prospect-radar" aria-label="Prospect Radar"><RootProspectRadar /></section>
    <section id="client-proposals" data-sfi-field-anchor="client-proposals" aria-label="Client Proposals"><RootCommercialWorkspace /></section>
  </main>;
}

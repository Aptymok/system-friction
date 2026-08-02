import type { Metadata } from 'next';

import { RootProspectRadar } from '@/components/root/prospect-radar/RootProspectRadar';
import { requireFounderPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Autonomous Prospect Radar · ROOT',
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProspectRadarPage() {
  await requireFounderPage('/root/prospect-radar');
  return <RootProspectRadar />;
}

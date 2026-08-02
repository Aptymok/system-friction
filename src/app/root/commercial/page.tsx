import type { Metadata } from 'next';

import { RootCommercialWorkspace } from '@/components/root/commercial/RootCommercialWorkspace';
import { requireFounderPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Commercial Conversion · ROOT',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function RootCommercialPage() {
  await requireFounderPage('/root/commercial');
  return <RootCommercialWorkspace />;
}

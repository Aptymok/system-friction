import { redirect } from 'next/navigation';
import { OAuthIntegrationsSurface } from '@/components/sfi/OAuthIntegrationsSurface';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'External Integrations',
  robots: { index: false, follow: false, nocache: true },
};

export default async function IntegrationsPage() {
  try {
    await requireUserProfile();
  } catch (error) {
    if (error instanceof AccessDeniedError && error.status === 401) {
      redirect('/login?next=%2Fintegrations');
    }
    redirect('/unauthorized');
  }

  return <OAuthIntegrationsSurface />;
}

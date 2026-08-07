import { requireFounderPage } from '@/lib/auth/serverPageGuards';
import { InstitutionalContractsConsole } from '@/components/root/contracts/InstitutionalContractsConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function RootContractsPage() {
  await requireFounderPage('/root/contracts');
  return <InstitutionalContractsConsole />;
}

import InstitutionAccessConsole from '@/components/sfi/InstitutionAccessConsole';
import { listInstitutionalAccounts } from '@/lib/system/access/accountAdmin';
import { requireInstitutionalAccountAdminPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function InstitutionAccessPage() {
  const context = await requireInstitutionalAccountAdminPage('/institution/access');
  const state = await listInstitutionalAccounts(context);
  return (
    <InstitutionAccessConsole
      initialAccounts={state.accounts}
      authority={state.authority}
      assignableRoles={state.assignableRoles}
    />
  );
}

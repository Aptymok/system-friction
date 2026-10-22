import { redirect } from 'next/navigation';
import { PasskeyEnrollment } from '@/components/sfi/PasskeyEnrollment';
import { getServerUserContext } from '@/lib/server/productionBackend';

export const dynamic = 'force-dynamic';
export default async function AccountSecurityPage() {
  const identity = await getServerUserContext();
  if (!identity.user) redirect('/login?next=%2Faccount%2Fsecurity');
  return <main className="sfiAuthGate" data-sfi-auth-surface="institutional-access">
    <section className="sfiAuthPanel"><header className="sfiAuthHeader"><strong>SFI. ACCESS</strong></header>
      <h1>Seguridad de tu cuenta</h1>
      <PasskeyEnrollment />
      <a href="/entry">Volver al instituto</a>
    </section>
  </main>;
}

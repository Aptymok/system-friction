import {
  inviteInstitutionalAccountAction,
  listInstitutionalAccountAccessGrants,
} from '@/lib/auth/institutionalInvitation';
import { requireFounderPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

const STATES: Record<string, string> = {
  enviada: 'Invitación enviada. La persona debe abrir el correo y definir su propia contraseña.',
  entrada_invalida: 'Revisa nombre, correo, cargo y tipo de acceso.',
  ya_activa: 'Esa cuenta ya está activa.',
  suspendida: 'Esa cuenta está suspendida. No se reactivó automáticamente.',
  registro_no_disponible: 'El registro de accesos no está disponible todavía.',
  invitacion_no_enviada: 'No se pudo enviar la invitación. No se otorgó acceso.',
  perfil_no_creado: 'La invitación no se activó porque SFI no pudo preparar el perfil de acceso.',
};

function statusText(value: string) {
  if (value === 'ACTIVE') return 'Activa';
  if (value === 'INVITED') return 'Invitación enviada';
  if (value === 'SUSPENDED') return 'Suspendida';
  if (value === 'INVITE_FAILED') return 'Invitación fallida';
  return 'Preparando invitación';
}

export default async function RootAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireFounderPage('/root/access');
  const params = await searchParams;
  const state = Array.isArray(params.state) ? params.state[0] : params.state;
  const access = await listInstitutionalAccountAccessGrants();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 80px' }}>
      <p style={{ letterSpacing: '.14em', fontSize: 12 }}>ROOT · ACCESO</p>
      <h1>Invitar una cuenta</h1>
      <p style={{ maxWidth: 760 }}>
        SFI envía un enlace personal. La persona verifica su correo y define su propia contraseña.
        Esta operación concede acceso, no autoridad soberana: nunca crea ROOT, un nombramiento institucional
        ni permiso para modificar el canon.
      </p>

      {state && STATES[state] ? (
        <p role="status" style={{ padding: 16, border: '1px solid currentColor', margin: '24px 0' }}>{STATES[state]}</p>
      ) : null}

      <form action={inviteInstitutionalAccountAction} style={{ display: 'grid', gap: 14, maxWidth: 680, marginTop: 32 }}>
        <label>
          Nombre
          <input name="displayName" required minLength={2} maxLength={120} style={{ display: 'block', width: '100%', marginTop: 6 }} />
        </label>
        <label>
          Correo
          <input name="email" type="email" required autoComplete="email" style={{ display: 'block', width: '100%', marginTop: 6 }} />
        </label>
        <label>
          Cargo o referencia humana
          <input name="title" required minLength={2} maxLength={160} placeholder="Ej. Observador institucional" style={{ display: 'block', width: '100%', marginTop: 6 }} />
        </label>
        <label>
          Tipo de acceso
          <select name="accessClass" defaultValue="INSTITUTIONAL_OBSERVER" style={{ display: 'block', width: '100%', marginTop: 6 }}>
            <option value="INSTITUTIONAL_OBSERVER">Observador — puede consultar, no ejecutar cambios institucionales</option>
            <option value="INSTITUTIONAL_OPERATOR">Operador — puede trabajar dentro de su espacio, sin autoridad soberana</option>
          </select>
        </label>
        <button type="submit" style={{ justifySelf: 'start', padding: '10px 18px' }}>ENVIAR INVITACIÓN</button>
      </form>

      <section style={{ marginTop: 56 }}>
        <h2>Accesos administrados</h2>
        {!access.available ? <p>El registro nuevo se habilitará con la siguiente migración de producción.</p> : null}
        {access.grants.length === 0 ? <p>No hay invitaciones registradas todavía.</p> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {access.grants.map((grant) => (
              <article key={grant.id} style={{ borderTop: '1px solid currentColor', paddingTop: 12 }}>
                <strong>{grant.displayName}</strong>
                <div>{grant.title} · {grant.email}</div>
                <small>{statusText(grant.status)} · {grant.accessClass === 'INSTITUTIONAL_OBSERVER' ? 'Observador' : 'Operador'}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

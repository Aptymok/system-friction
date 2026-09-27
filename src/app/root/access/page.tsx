import {
  inviteInstitutionalAccountAction,
  listInstitutionalAccountAccessGrants,
} from '@/lib/auth/institutionalInvitation';
import { requireFounderPage } from '@/lib/system/access/server';
import { InstitutionalSurfaceRail } from '@/components/sfi/InstitutionalSurfaceRail';
import './root-access.css';

export const dynamic = 'force-dynamic';

const STATES: Record<string, string> = {
  enviada: 'Invitación enviada. La persona debe abrir el correo y definir su propia contraseña.',
  entrada_invalida: 'Revisa nombre, correo, cargo y tipo de acceso.',
  ya_activa: 'Esa cuenta ya está activa.',
  suspendida: 'Esa cuenta está suspendida. No se reactivó automáticamente.',
  registro_no_disponible: 'El plano primario no permitió preparar la invitación. No se otorgó acceso nuevo.',
  invitacion_no_enviada: 'No se pudo enviar la invitación. No se otorgó acceso.',
  limite_correo: 'El proveedor de autenticación alcanzó un límite temporal de envío. No se otorgó acceso nuevo; vuelve a intentar cuando el límite se libere o configura un proveedor SMTP propio antes de reintentar.',
};

function statusText(value: string) {
  if (value === 'ACTIVE') return 'Activa';
  if (value === 'INVITED') return 'Invitación enviada';
  if (value === 'SUSPENDED') return 'Suspendida';
  if (value === 'INVITE_FAILED') return 'Invitación fallida';
  return 'Preparando invitación';
}

function deliveryDetail(error: string | null) {
  if (!error) return null;
  if (/rate limit|too many requests/i.test(error)) return 'Último reintento bloqueado temporalmente por el proveedor de correo.';
  if (error === 'profile_provision_failed' || error === 'activation_profile_provision_failed') return 'El envío o la identidad existieron, pero el perfil institucional requiere revisión.';
  return 'El último intento de entrega o preparación requiere revisión.';
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
    <main className="rootAccessShell">
      <InstitutionalSurfaceRail surface="ACCESS" state={access.available?'AVAILABLE':'DEGRADED'} detail={access.source==='NEON_CONTINUITY'?'CONTINUITY READ':'PRIMARY READ'}/>
      <header className="rootAccessHeader">
        <div><small>ROOT · IDENTITY / ACCESS</small><h1>Invite access without manufacturing authority.</h1><p>SFI envía un enlace personal. La persona verifica su correo y define su propia contraseña. El acceso habilita una superficie gobernada; no crea ROOT, soberanía ni autoridad institucional.</p></div>
        <div className="rootAccessPrinciple"><span>IDENTITY RULE</span><b>ROOT NEVER ASSIGNS OR KNOWS ANOTHER PERSON'S PASSWORD</b></div>
      </header>

      <section className="rootAccessBoundary"><b>ACCESS ≠ AUTHORITY</b><span>INVITATION ≠ ACTIVE ACCOUNT · ROLE ≠ SOVEREIGNTY · DELIVERY ≠ ACCEPTANCE</span></section>

      {state && STATES[state] ? <p role="status" className="rootAccessStatus">{STATES[state]}</p> : null}
      {access.source === 'NEON_CONTINUITY' ? <p role="status" className="rootAccessStatus continuity">Supabase primario no respondió; SFI está leyendo el registro de accesos desde continuidad Neon. Puedes revisar el estado existente. El envío de nuevas invitaciones sigue sujeto al proveedor primario.</p> : null}

      <div className="rootAccessLayout">
        <section className="rootAccessPanel">
          <div className="rootAccessSectionHead"><small>NEW ACCESS GRANT</small><h2>Invitar una cuenta</h2><p>La invitación concede acceso delimitado. Toda autoridad posterior conserva sus propios gates.</p></div>
          <form action={inviteInstitutionalAccountAction} className="rootAccessForm">
            <label>Nombre<input name="displayName" required minLength={2} maxLength={120}/></label>
            <label>Correo<input name="email" type="email" required autoComplete="email"/></label>
            <label>Cargo o referencia humana<input name="title" required minLength={2} maxLength={160} placeholder="Ej. Observador institucional"/></label>
            <label>Tipo de acceso<select name="accessClass" defaultValue="INSTITUTIONAL_OBSERVER"><option value="INSTITUTIONAL_OBSERVER">Observador — puede consultar, no ejecutar cambios institucionales</option><option value="INSTITUTIONAL_OPERATOR">Operador — puede trabajar dentro de su espacio, sin autoridad soberana</option></select></label>
            <button type="submit">ENVIAR INVITACIÓN</button>
          </form>
        </section>

        <section className="rootAccessPanel rootAccessRegistry">
          <div className="rootAccessSectionHead"><small>ACCESS REGISTRY</small><h2>Accesos administrados</h2><p>{access.available ? <>{access.grants.length} registros observados.</> : <>El registro no está disponible en el plano primario ni continuidad.</>}</p></div>
          {!access.available ? <div className="rootAccessEmpty">No se modificó ningún acceso.</div> : null}
          {access.available && access.grants.length === 0 ? <div className="rootAccessEmpty">No hay invitaciones registradas todavía.</div> : (
            <div className="rootAccessGrantList">
              {access.grants.map((grant) => {
                const detail = deliveryDetail(grant.lastInviteError);
                return <article key={grant.id} data-state={grant.status}>
                  <div><strong>{grant.displayName}</strong><span>{grant.title}</span></div>
                  <code>{grant.email}</code>
                  <small>{statusText(grant.status)} · {grant.accessClass === 'INSTITUTIONAL_OBSERVER' ? 'Observador' : 'Operador'}</small>
                  {detail ? <p>{detail}</p> : null}
                </article>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

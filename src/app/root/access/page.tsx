import {
  inviteInstitutionalAccountAction,
  listInstitutionalAccountAccessGrants,
} from '@/lib/auth/institutionalInvitation';
import { requireFounderPage } from '@/lib/system/access/server';
import { InstitutionalSurfaceRail } from '@/components/sfi/InstitutionalSurfaceRail';
import './root-access.css';

export const dynamic = 'force-dynamic';

const STATES: Record<string, string> = {
  enviada: 'Invitation sent. The person must open the email and define their own password.',
  entrada_invalida: 'Review name, email, title and access type.',
  ya_activa: 'That account is already active.',
  suspendida: 'That account is suspended. It was not reactivated automatically.',
  registro_no_disponible: 'The primary plane did not allow the invitation to be prepared. No new access was granted.',
  invitacion_no_enviada: 'The invitation could not be sent. No access was granted.',
  limite_correo: 'The authentication provider reached a temporary delivery limit. No new access was granted; retry when the limit clears or configure a dedicated SMTP provider first.',
};

function statusText(value: string) {
  if (value === 'ACTIVE') return 'Active';
  if (value === 'INVITED') return 'Invitation sent';
  if (value === 'SUSPENDED') return 'Suspended';
  if (value === 'INVITE_FAILED') return 'Invitation failed';
  return 'Preparing invitation';
}

function deliveryDetail(error: string | null) {
  if (!error) return null;
  if (/rate limit|too many requests/i.test(error)) return 'The last retry was temporarily blocked by the email provider.';
  if (error === 'profile_provision_failed' || error === 'activation_profile_provision_failed') return 'Delivery or identity existed, but the institutional profile requires review.';
  return 'The last delivery or preparation attempt requires review.';
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
      <section className="rootAccessLiveOverview" aria-label="Live governed access overview" data-sfi-instrument="ACCESS-OPERATIVE-1.0">
        <aside className="rootAccessLiveIdentity">
          <small>ACCESS / OPERATIONAL</small><h2>IDENTITY<br/>IS NOT<br/>AUTHORITY.</h2>
          <p>Invitation records are counted from the governed access registry. No identity, session, device or IP is inferred.</p>
          <strong>{access.available?'REGISTRY AVAILABLE':'REGISTRY DEGRADED'}</strong>
          <span>{access.source==='NEON_CONTINUITY'?'CONTINUITY READ':'PRIMARY READ'}</span>
        </aside>
        <div className="rootAccessLiveScope">
          <header><small>ROLES & CLEARANCE</small><b>DECLARED PERMISSIONS · NOT EXECUTION RECEIPTS</b></header>
          <div className="rootAccessRoleColumns">
            <article><span>OBSERVER</span><b>{access.available?access.grants.filter(grant=>grant.accessClass==='INSTITUTIONAL_OBSERVER').length:'—'}</b><p>Governed institutional reading. No sovereign operations.</p></article>
            <article><span>OPERATOR</span><b>{access.available?access.grants.filter(grant=>grant.accessClass==='INSTITUTIONAL_OPERATOR').length:'—'}</b><p>Scoped operations only. Role is not permission to override a gate.</p></article>
            <article><span>ROOT</span><b>FOUNDER GATE</b><p>Founder-only access to this administrative instrument.</p></article>
          </div>
          <div className="rootAccessAuthorityLine">ACCESS ≠ AUTHORITY <span>·</span> INVITATION ≠ ACTIVE SESSION <span>·</span> APPROVAL ≠ EXECUTION</div>
        </div>
        <aside className="rootAccessLiveTelemetry">
          <header><small>REGISTRY / STATE</small><b>OBSERVED RECORDS</b></header>
          <dl><div><dt>RECORDS</dt><dd>{access.available?access.grants.length:'—'}</dd></div>
            <div><dt>ACTIVE</dt><dd>{access.available?access.grants.filter(grant=>grant.status==='ACTIVE').length:'—'}</dd></div>
            <div><dt>INVITED</dt><dd>{access.available?access.grants.filter(grant=>grant.status==='INVITED').length:'—'}</dd></div>
            <div><dt>SUSPENDED</dt><dd>{access.available?access.grants.filter(grant=>grant.status==='SUSPENDED').length:'—'}</dd></div></dl>
          <p>SESSION LOCATION, DEVICE AND NETWORK TELEMETRY ARE NOT PRESENT IN THIS READER.</p>
          <a href="#root-access-admin">OPEN ACCESS MANAGEMENT ↗</a>
        </aside>
      </section>
      <header className="rootAccessHeader">
        <div><small>ROOT · IDENTITY / ACCESS</small><h1>Invite access without manufacturing authority.</h1><p>SFI sends a personal link. The person verifies their email and defines their own password. Access enables a governed surface; it does not create ROOT, sovereignty or institutional authority.</p></div>
        <div className="rootAccessPrinciple"><span>IDENTITY RULE</span><b>ROOT NEVER ASSIGNS OR KNOWS ANOTHER PERSON'S PASSWORD</b></div>
      </header>

      <section className="rootAccessBoundary"><b>ACCESS ≠ AUTHORITY</b><span>INVITATION ≠ ACTIVE ACCOUNT · ROLE ≠ SOVEREIGNTY · DELIVERY ≠ ACCEPTANCE</span></section>

      {state && STATES[state] ? <p role="status" className="rootAccessStatus">{STATES[state]}</p> : null}
      {access.source === 'NEON_CONTINUITY' ? <p role="status" className="rootAccessStatus continuity">Primary Supabase did not respond; SFI is reading the access registry from Neon continuity. Existing state remains reviewable. New invitation delivery still depends on the primary provider.</p> : null}

      <div id="root-access-admin" className="rootAccessLayout">
        <section className="rootAccessPanel">
          <div className="rootAccessSectionHead"><small>NEW ACCESS GRANT</small><h2>Invite an account</h2><p>The invitation grants bounded access. Any later authority keeps its own gates.</p></div>
          <form action={inviteInstitutionalAccountAction} className="rootAccessForm">
            <label>Name<input name="displayName" required minLength={2} maxLength={120}/></label>
            <label>Email<input name="email" type="email" required autoComplete="email"/></label>
            <label>Title or human reference<input name="title" required minLength={2} maxLength={160} placeholder="e.g. Institutional observer"/></label>
            <label>Access type<select name="accessClass" defaultValue="INSTITUTIONAL_OBSERVER"><option value="INSTITUTIONAL_OBSERVER">Observer — may read, cannot execute institutional changes</option><option value="INSTITUTIONAL_OPERATOR">Operator — may work within their space, without sovereign authority</option></select></label>
            <button type="submit">SEND INVITATION</button>
          </form>
        </section>

        <section className="rootAccessPanel rootAccessRegistry">
          <div className="rootAccessSectionHead"><small>ACCESS REGISTRY</small><h2>Managed access</h2><p>{access.available ? <>{access.grants.length} observed records.</> : <>The registry is unavailable in both the primary plane and continuity.</>}</p></div>
          {!access.available ? <div className="rootAccessEmpty">No access was modified.</div> : null}
          {access.available && access.grants.length === 0 ? <div className="rootAccessEmpty">No invitations are registered yet.</div> : (
            <div className="rootAccessGrantList">
              {access.grants.map((grant) => {
                const detail = deliveryDetail(grant.lastInviteError);
                return <article key={grant.id} data-state={grant.status}>
                  <div><strong>{grant.displayName}</strong><span>{grant.title}</span></div>
                  <code>{grant.email}</code>
                  <small>{statusText(grant.status)} · {grant.accessClass === 'INSTITUTIONAL_OBSERVER' ? 'Observer' : 'Operator'}</small>
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

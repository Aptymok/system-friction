'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  SFI_INSTITUTIONAL_DOMAIN_LABELS,
  SFI_INSTITUTIONAL_ROLE_LABELS,
  type SfiAccountAdminAuthority,
  type SfiInstitutionalDomain,
  type SfiInstitutionalRoleKey,
} from '@/lib/system/access/institutionalRoles';
import type { InstitutionalAccountView } from '@/lib/system/access/accountAdmin';

type Props = {
  initialAccounts: InstitutionalAccountView[];
  authority: SfiAccountAdminAuthority;
  assignableRoles: readonly SfiInstitutionalRoleKey[];
};

type Draft = {
  alias: string;
  institutionalRole: SfiInstitutionalRoleKey;
  domain: SfiInstitutionalDomain;
};

const DOMAIN_ENTRIES = Object.entries(SFI_INSTITUTIONAL_DOMAIN_LABELS) as [SfiInstitutionalDomain, string][];

function roleDomain(role: SfiInstitutionalRoleKey, domain: SfiInstitutionalDomain) {
  return role === 'institutional_director' ? 'institution' : domain;
}

export default function InstitutionAccessConsole({ initialAccounts, authority, assignableRoles }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const [role, setRole] = useState<SfiInstitutionalRoleKey>(assignableRoles.includes('institutional_operator') ? 'institutional_operator' : assignableRoles[0]);
  const [domain, setDomain] = useState<SfiInstitutionalDomain>('institution');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const roleOptions = useMemo(() => assignableRoles.map((value) => ({ value, label: SFI_INSTITUTIONAL_ROLE_LABELS[value] })), [assignableRoles]);

  async function reload() {
    const response = await fetch('/api/institution/access', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo actualizar el directorio.');
    setAccounts(payload.accounts);
  }

  async function invite() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/institution/access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, alias, institutionalRole: role, domain: roleDomain(role, domain) }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo crear la invitación.');
      setEmail('');
      setAlias('');
      setNotice('Invitación institucional creada. La persona define su propia credencial al aceptar.');
      await reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'La invitación falló.');
    } finally {
      setBusy(false);
    }
  }

  function draftFor(account: InstitutionalAccountView): Draft {
    return drafts[account.userId] ?? {
      alias: account.alias,
      institutionalRole: account.institutionalRole,
      domain: account.domain,
    };
  }

  function patchDraft(userId: string, current: Draft, patch: Partial<Draft>) {
    setDrafts((previous) => ({ ...previous, [userId]: { ...current, ...patch } }));
  }

  async function save(account: InstitutionalAccountView) {
    const draft = draftFor(account);
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/institution/access', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: account.userId,
          alias: draft.alias,
          institutionalRole: draft.institutionalRole,
          domain: roleDomain(draft.institutionalRole, draft.domain),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo actualizar la cuenta.');
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[account.userId];
        return next;
      });
      setNotice('Mandato institucional actualizado y auditado.');
      await reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'La actualización falló.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#070705', color: '#e6dcc6', padding: '38px 24px 80px', fontFamily: 'Georgia, serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid rgba(190,32,38,.55)', paddingBottom: 24, display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <small style={{ letterSpacing: '.24em', color: '#b6a98e' }}>SYSTEM FRICTION INSTITUTE · IDENTITY / AUTHORITY</small>
            <h1 style={{ margin: '10px 0 6px', fontSize: 'clamp(34px,5vw,64px)', fontWeight: 400 }}>ACCESO INSTITUCIONAL</h1>
            <p style={{ margin: 0, maxWidth: 800, color: '#a99d86', lineHeight: 1.6 }}>Cuentas, mandatos y límites. La administración de identidad no concede CANON, soberanía ni acceso a espacios personales ajenos.</p>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <Link href="/institution" style={{ color: '#d1b47b', textDecoration: 'none' }}>INSTITUCIÓN</Link>
            <Link href="/field" style={{ color: '#d1b47b', textDecoration: 'none' }}>FIELD</Link>
          </div>
        </header>

        <section style={{ marginTop: 28, border: '1px solid rgba(209,180,123,.22)', padding: 20 }}>
          <small style={{ color: '#d4a246', letterSpacing: '.18em' }}>TU CEILING</small>
          <p style={{ marginBottom: 0, lineHeight: 1.65 }}>
            {authority === 'founder'
              ? 'FOUNDER / ROOT · Puede nombrar Dirección Institucional y roles subordinados. ROOT no se crea desde esta consola.'
              : 'DIRECCIÓN INSTITUCIONAL · Puede crear y administrar roles subordinados, incluidos Directores de Dominio. No puede editar ROOT, otro Director Institucional ni su propia autoridad.'}
          </p>
        </section>

        <section style={{ marginTop: 28 }}>
          <small style={{ color: '#d4a246', letterSpacing: '.18em' }}>NUEVA CUENTA / INVITACIÓN</small>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10, marginTop: 12 }}>
            <input aria-label="Nombre" placeholder="Nombre institucional" value={alias} onChange={(event) => setAlias(event.target.value)} style={inputStyle} />
            <input aria-label="Correo" placeholder="correo@dominio" value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
            <select aria-label="Rol" value={role} onChange={(event) => setRole(event.target.value as SfiInstitutionalRoleKey)} style={inputStyle}>
              {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="Dominio" value={roleDomain(role, domain)} disabled={role === 'institutional_director'} onChange={(event) => setDomain(event.target.value as SfiInstitutionalDomain)} style={inputStyle}>
              {DOMAIN_ENTRIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button disabled={busy || !email || !alias} onClick={invite} style={buttonStyle}>INVITAR</button>
          </div>
          <p style={{ color: '#8f8676', fontSize: 12, lineHeight: 1.55 }}>SFI envía una invitación. Ningún administrador conoce ni establece la contraseña final del usuario.</p>
          {notice && <p role="status" style={{ borderLeft: '2px solid #c5212b', paddingLeft: 12, color: '#d8c7a5' }}>{notice}</p>}
        </section>

        <section style={{ marginTop: 42 }}>
          <small style={{ color: '#d4a246', letterSpacing: '.18em' }}>DIRECTORIO INSTITUCIONAL</small>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {accounts.map((account) => {
              const draft = draftFor(account);
              return (
                <article key={account.userId} style={{ borderTop: '1px solid rgba(209,180,123,.22)', padding: '18px 0', display: 'grid', gridTemplateColumns: 'minmax(190px,1.2fr) minmax(180px,1fr) minmax(170px,1fr) minmax(150px,.8fr) auto', gap: 10, alignItems: 'center' }}>
                  <div>
                    <input disabled={!account.editable} value={draft.alias} onChange={(event) => patchDraft(account.userId, draft, { alias: event.target.value })} style={inputStyle} />
                    <small style={{ display: 'block', marginTop: 6, color: '#827a6c' }}>{account.email ?? 'correo reservado'} · {account.status}</small>
                  </div>
                  <select disabled={!account.editable} value={draft.institutionalRole} onChange={(event) => patchDraft(account.userId, draft, { institutionalRole: event.target.value as SfiInstitutionalRoleKey })} style={inputStyle}>
                    {account.editable ? roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : <option value={account.institutionalRole}>{SFI_INSTITUTIONAL_ROLE_LABELS[account.institutionalRole]}</option>}
                  </select>
                  <select disabled={!account.editable || draft.institutionalRole === 'institutional_director'} value={roleDomain(draft.institutionalRole, draft.domain)} onChange={(event) => patchDraft(account.userId, draft, { domain: event.target.value as SfiInstitutionalDomain })} style={inputStyle}>
                    {DOMAIN_ENTRIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <div><small style={{ color: '#877b65' }}>{account.displayTitle}</small></div>
                  <button disabled={busy || !account.editable} onClick={() => save(account)} style={buttonStyle}>{account.editable ? 'GUARDAR' : 'SELLADO'}</button>
                </article>
              );
            })}
          </div>
        </section>

        <footer style={{ marginTop: 46, borderTop: '1px solid rgba(209,180,123,.18)', paddingTop: 18, color: '#776f63', fontSize: 12, lineHeight: 1.6 }}>
          PERSONAL no hereda autoridad de INSTITUTIONAL. SHARED_LAB exige promoción deliberada. Todas las altas y modificaciones de mandato se registran en <code>sfi_audit_events</code>.
        </footer>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#0d0d0a',
  color: '#e6dcc6',
  border: '1px solid rgba(209,180,123,.28)',
  padding: '11px 12px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
};

const buttonStyle: React.CSSProperties = {
  background: '#15110d',
  color: '#e7c98b',
  border: '1px solid rgba(197,33,43,.65)',
  padding: '11px 14px',
  cursor: 'pointer',
  letterSpacing: '.1em',
  fontSize: 11,
};

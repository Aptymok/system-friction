'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';
import { resetPasswordAction } from '@/lib/auth/actions';

type ActivationResponse = {
  ok?: boolean;
  activated?: boolean;
  passwordAccepted?: boolean;
  message?: string;
};

type GateState = 'VERIFYING' | 'VERIFIED' | 'ACTION_REQUIRED' | 'ACTIVE';

function readableResetError(error?: string) {
  if (!error) return '';
  const normalized = error.toLowerCase();
  if (normalized.includes('invalid') || normalized.includes('token') || normalized.includes('expired')) {
    return 'The link is invalid or has expired. Request a new one.';
  }
  if (normalized.includes('entrada_invalida')) {
    return 'Use a valid password, confirm it matches and open this page from the link received by email.';
  }
  return 'The password could not be updated. Request a new link.';
}

function AccessRail({ state }: { state: GateState }) {
  const identityVerified = state === 'VERIFIED' || state === 'ACTIVE';
  const accessActive = state === 'ACTIVE';
  return (
    <ol className="sfiAuthRail" aria-label="Activation sequence">
      <li data-state="complete">
        <span>01</span>
        <strong>INVITATION</strong>
        <small>Grant emitido</small>
      </li>
      <li data-state={identityVerified ? 'complete' : state === 'ACTION_REQUIRED' ? 'blocked' : 'current'}>
        <span>02</span>
        <strong>IDENTITY</strong>
        <small>{identityVerified ? 'Verified' : state === 'ACTION_REQUIRED' ? 'Review required' : 'Verifying'}</small>
      </li>
      <li data-state={accessActive ? 'complete' : identityVerified ? 'current' : 'pending'}>
        <span>03</span>
        <strong>ACCESS</strong>
        <small>{accessActive ? 'Activo' : identityVerified ? 'Por activar' : 'Pendiente'}</small>
      </li>
    </ol>
  );
}

function AuthFrame({
  eyebrow,
  title,
  lead,
  state,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  state: GateState;
  children: ReactNode;
}) {
  return (
    <main className="sfiAuthGate" data-sfi-auth-surface="institutional-access">
      <div className="sfiAuthField" aria-hidden="true" />
      <div className="sfiAuthShell">
        <section className="sfiAuthPanel">
          <header className="sfiAuthHeader">
            <div className="sfiAuthBrand">
              <span className="sfiAuthSigil">SFI.</span>
              <span>SYSTEM FRICTION INSTITUTE</span>
            </div>
            <code>ACCESS / IDENTITY</code>
          </header>

          <div className="sfiAuthIntro">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{lead}</p>
          </div>

          <AccessRail state={state} />
          {children}

          <footer className="sfiAuthFooter">
            <span>OBSERVATION</span>
            <span>EVIDENCE</span>
            <span>INFERENCE</span>
            <span>AUTHORITY</span>
            <span>EXECUTION</span>
            <span>RETURN</span>
          </footer>
        </section>

        <aside className="sfiAuthBoundary">
          <div>
            <span>AUTHORITY BOUNDARY</span>
            <h2>ACCESS ≠ AUTHORITY</h2>
            <p>
              This confirmation enables an account within its assigned limits.
              It grants no ROOT, sovereign authority, institutional appointment or canonical promotion.
            </p>
          </div>
          <dl>
            <div>
              <dt>IDENTITY</dt>
              <dd>Verified by the authentication provider.</dd>
            </div>
            <div>
              <dt>CREDENTIAL</dt>
              <dd>Defined only by the invited person.</dd>
            </div>
            <div>
              <dt>AUTHORITY</dt>
              <dd>Permanece separada y gobernada por SFI.</dd>
            </div>
          </dl>
          <small>systemfriction.org · institutional access surface</small>
        </aside>
      </div>
    </main>
  );
}

function ContinuityRecovery({
  token,
  error,
}: {
  token?: string;
  error?: string;
}) {
  const readable = readableResetError(error);
  const state: GateState = token ? 'VERIFIED' : readable ? 'ACTION_REQUIRED' : 'VERIFYING';

  return (
    <AuthFrame
      eyebrow="IDENTITY RECOVERY"
      title="Restablecer credencial"
      lead={token
        ? 'Identidad verificada mediante enlace seguro. Define una nueva credencial para recuperar continuidad.'
        : 'Open this surface from the recovery link sent to your email.'}
      state={state}
    >
      <form action={resetPasswordAction} className="sfiAuthForm">
        <input type="hidden" name="token" value={token || ''} />
        <label>
          <span>NEW PASSWORD</span>
          <input name="password" type="password" autoComplete="new-password" minLength={12} required disabled={!token} />
        </label>
        <label>
          <span>CONFIRM PASSWORD</span>
          <input name="confirmation" type="password" autoComplete="new-password" minLength={12} required disabled={!token} />
        </label>
        <button disabled={!token}>SAVE CREDENTIAL</button>
        {readable ? <div className="sfiAuthMessage" role="alert">{readable}</div> : null}
        {!token ? <a className="sfiAuthLink" href="/forgot">Solicitar un enlace nuevo</a> : null}
        <p className="sfiAuthPrivacy">
          SFI never needs to send you a temporary password or know the password you choose.
        </p>
      </form>
    </AuthFrame>
  );
}

export function PasswordResetSurface({
  mode,
  token,
  error,
}: {
  mode: 'invite' | 'recovery';
  token?: string;
  error?: string;
}) {
  const inviteMode = mode === 'invite';
  const sb = useMemo(() => createBrowserSupabaseClient(), []);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);
  const [attention, setAttention] = useState(false);
  const [message, setMessage] = useState('Verifying el enlace seguro…');

  useEffect(() => {
    if (!inviteMode) return;
    if (!sb) {
      setAttention(true);
      setMessage('The invitation activation service is unavailable.');
      return;
    }
    let active = true;
    const check = async () => {
      const { data } = await sb.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
        setAttention(false);
        setMessage('Email verified. Define your credential to complete access.');
      } else {
        setAttention(true);
        setMessage('The link did not create a valid session. It may have expired or already been used.');
      }
    };
    void check();
    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (!active || !session) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setReady(true);
        setAttention(false);
        setMessage('Email verified. Define your credential to complete access.');
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [inviteMode, sb]);

  if (!inviteMode) {
    return <ContinuityRecovery token={token} error={error} />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sb || !ready || busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirmation = String(form.get('confirmation') || '');

    if (password.length < 12) {
      setAttention(true);
      setMessage('Use a password of at least 12 characters.');
      return;
    }
    if (password !== confirmation) {
      setAttention(true);
      setMessage('The two passwords do not match.');
      return;
    }

    setBusy(true);
    setAttention(false);
    const updated = await sb.auth.updateUser({ password });
    if (updated.error) {
      setAttention(true);
      setMessage('The password could not be updated. Request a new link.');
      setBusy(false);
      return;
    }

    let activation: Response;
    try {
      activation = await fetch('/api/account/activate', { method: 'POST', credentials: 'same-origin' });
    } catch {
      setAttention(true);
      setMessage('The password was saved, but SFI could not confirm institutional access. Request review before continuing.');
      setBusy(false);
      return;
    }

    let activationBody: ActivationResponse = {};
    try {
      activationBody = await activation.json() as ActivationResponse;
    } catch {
      activationBody = {};
    }

    if (!activation.ok || activationBody.ok !== true || activationBody.activated !== true) {
      setAttention(true);
      setMessage(
        activationBody.message
          ? `${activationBody.message} The password is already saved; you do not need to define it again.`
          : 'The password was saved, but SFI did not confirm institutional access. Request review before continuing.',
      );
      setBusy(false);
      return;
    }

    setActivated(true);
    setMessage('Identidad verificada y acceso institucional activado.');
    window.location.href = '/entry';
  };

  const state: GateState = activated
    ? 'ACTIVE'
    : attention
      ? 'ACTION_REQUIRED'
      : ready
        ? 'VERIFIED'
        : 'VERIFYING';

  return (
    <AuthFrame
      eyebrow="INSTITUTIONAL INVITATION"
      title="Confirmar acceso"
      lead="You received an access grant to System Friction Institute. Verify your identity and define your own credential to complete activation."
      state={state}
    >
      <form onSubmit={submit} className="sfiAuthForm">
        <div className="sfiAuthStatus" data-state={state.toLowerCase()} aria-live="polite">
          <span>{state.replace('_', ' ')}</span>
          <p>{message}</p>
        </div>

        <label>
          <span>NEW PASSWORD</span>
          <input name="password" type="password" autoComplete="new-password" minLength={12} required disabled={!ready || busy} />
        </label>
        <label>
          <span>CONFIRM PASSWORD</span>
          <input name="confirmation" type="password" autoComplete="new-password" minLength={12} required disabled={!ready || busy} />
        </label>

        <button disabled={!ready || busy}>
          {busy ? 'ACTIVANDO…' : 'CONFIRMAR Y ACTIVAR'}
        </button>

        <p className="sfiAuthPrivacy">
          Your password remains private. SFI does not generate it, know it or share it.
        </p>
      </form>
    </AuthFrame>
  );
}

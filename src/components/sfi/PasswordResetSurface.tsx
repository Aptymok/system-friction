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
    return 'El enlace no es válido o ya expiró. Solicita uno nuevo.';
  }
  if (normalized.includes('entrada_invalida')) {
    return 'Usa una contraseña válida, confirma que coincida y abre esta página desde el enlace recibido por correo.';
  }
  return 'No fue posible actualizar la contraseña. Solicita un enlace nuevo.';
}

function AccessRail({ state }: { state: GateState }) {
  const identityVerified = state === 'VERIFIED' || state === 'ACTIVE';
  const accessActive = state === 'ACTIVE';
  return (
    <ol className="sfiAuthRail" aria-label="Secuencia de activación">
      <li data-state="complete">
        <span>01</span>
        <strong>INVITATION</strong>
        <small>Grant emitido</small>
      </li>
      <li data-state={identityVerified ? 'complete' : state === 'ACTION_REQUIRED' ? 'blocked' : 'current'}>
        <span>02</span>
        <strong>IDENTITY</strong>
        <small>{identityVerified ? 'Verificada' : state === 'ACTION_REQUIRED' ? 'Revisión requerida' : 'Verificando'}</small>
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
              Esta confirmación habilita una cuenta dentro de los límites asignados.
              No concede ROOT, autoridad soberana, nombramiento institucional ni promoción canónica.
            </p>
          </div>
          <dl>
            <div>
              <dt>IDENTITY</dt>
              <dd>Verificada por el proveedor de autenticación.</dd>
            </div>
            <div>
              <dt>CREDENTIAL</dt>
              <dd>Definida únicamente por la persona invitada.</dd>
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
        : 'Abre esta superficie desde el enlace de recuperación enviado a tu correo.'}
      state={state}
    >
      <form action={resetPasswordAction} className="sfiAuthForm">
        <input type="hidden" name="token" value={token || ''} />
        <label>
          <span>NUEVA CONTRASEÑA</span>
          <input name="password" type="password" autoComplete="new-password" minLength={12} required disabled={!token} />
        </label>
        <label>
          <span>CONFIRMAR CONTRASEÑA</span>
          <input name="confirmation" type="password" autoComplete="new-password" minLength={12} required disabled={!token} />
        </label>
        <button disabled={!token}>GUARDAR CREDENCIAL</button>
        {readable ? <div className="sfiAuthMessage" role="alert">{readable}</div> : null}
        {!token ? <a className="sfiAuthLink" href="/forgot">Solicitar un enlace nuevo</a> : null}
        <p className="sfiAuthPrivacy">
          SFI nunca necesita enviarte una contraseña temporal ni conocer la contraseña que elijas.
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
  const [message, setMessage] = useState('Verificando el enlace seguro…');

  useEffect(() => {
    if (!inviteMode) return;
    if (!sb) {
      setAttention(true);
      setMessage('El servicio de activación de invitaciones no está disponible.');
      return;
    }
    let active = true;
    const check = async () => {
      const { data } = await sb.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
        setAttention(false);
        setMessage('Correo verificado. Define tu credencial para completar el acceso.');
      } else {
        setAttention(true);
        setMessage('El enlace no creó una sesión válida. Puede haber expirado o ya haber sido utilizado.');
      }
    };
    void check();
    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (!active || !session) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setReady(true);
        setAttention(false);
        setMessage('Correo verificado. Define tu credencial para completar el acceso.');
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
      setMessage('Usa una contraseña de al menos 12 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setAttention(true);
      setMessage('Las dos contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    setAttention(false);
    const updated = await sb.auth.updateUser({ password });
    if (updated.error) {
      setAttention(true);
      setMessage('No fue posible actualizar la contraseña. Solicita un enlace nuevo.');
      setBusy(false);
      return;
    }

    let activation: Response;
    try {
      activation = await fetch('/api/account/activate', { method: 'POST', credentials: 'same-origin' });
    } catch {
      setAttention(true);
      setMessage('La contraseña quedó guardada, pero SFI no pudo confirmar el acceso institucional. Solicita revisión antes de continuar.');
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
          ? `${activationBody.message} La contraseña ya quedó guardada; no necesitas volver a definirla.`
          : 'La contraseña quedó guardada, pero SFI no confirmó el acceso institucional. Solicita revisión antes de continuar.',
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
      lead="Has recibido un grant de acceso a System Friction Institute. Verifica la identidad y define tu propia credencial para completar la activación."
      state={state}
    >
      <form onSubmit={submit} className="sfiAuthForm">
        <div className="sfiAuthStatus" data-state={state.toLowerCase()} aria-live="polite">
          <span>{state.replace('_', ' ')}</span>
          <p>{message}</p>
        </div>

        <label>
          <span>NUEVA CONTRASEÑA</span>
          <input name="password" type="password" autoComplete="new-password" minLength={12} required disabled={!ready || busy} />
        </label>
        <label>
          <span>CONFIRMAR CONTRASEÑA</span>
          <input name="confirmation" type="password" autoComplete="new-password" minLength={12} required disabled={!ready || busy} />
        </label>

        <button disabled={!ready || busy}>
          {busy ? 'ACTIVANDO…' : 'CONFIRMAR Y ACTIVAR'}
        </button>

        <p className="sfiAuthPrivacy">
          Tu contraseña permanece privada. SFI no la genera, no la conoce y no la comparte.
        </p>
      </form>
    </AuthFrame>
  );
}

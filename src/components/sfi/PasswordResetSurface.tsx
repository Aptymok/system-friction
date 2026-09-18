'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';
import { resetPasswordAction } from '@/lib/auth/actions';

type ActivationResponse = {
  ok?: boolean;
  activated?: boolean;
  passwordAccepted?: boolean;
  message?: string;
};

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

function ContinuityRecovery({
  token,
  error,
}: {
  token?: string;
  error?: string;
}) {
  const readable = readableResetError(error);
  return (
    <main className="login">
      <form action={resetPasswordAction}>
        <div className="sigil">SFI.</div>
        <h1>Nueva contraseña</h1>
        <p>
          {token
            ? 'Identidad verificada mediante enlace seguro. Define una contraseña para la capa de continuidad.'
            : 'Abre esta página desde el enlace de recuperación enviado a tu correo.'}
        </p>
        <input type="hidden" name="token" value={token || ''} />
        <input name="password" type="password" placeholder="nueva contraseña" autoComplete="new-password" minLength={12} required disabled={!token} />
        <input name="confirmation" type="password" placeholder="repite la contraseña" autoComplete="new-password" minLength={12} required disabled={!token} />
        <button disabled={!token}>GUARDAR CONTRASEÑA</button>
        {readable ? <small>{readable}</small> : null}
        {!token ? <small><a href="/forgot">Solicitar un enlace nuevo</a></small> : null}
        <small>SFI nunca necesita enviarte una contraseña temporal ni conocer la contraseña que elijas.</small>
      </form>
    </main>
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
  const [message, setMessage] = useState('Verificando el enlace seguro…');

  useEffect(() => {
    if (!inviteMode) return;
    if (!sb) {
      setMessage('El servicio de activación de invitaciones no está disponible.');
      return;
    }
    let active = true;
    const check = async () => {
      const { data } = await sb.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
        setMessage('Correo verificado. Define tu contraseña para activar el acceso.');
      } else {
        setMessage('El enlace no ha creado una sesión válida. Puede haber expirado o ya haber sido utilizado.');
      }
    };
    void check();
    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (!active || !session) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setReady(true);
        setMessage('Correo verificado. Define tu contraseña para activar el acceso.');
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
    if (password.length < 12) return setMessage('Usa una contraseña de al menos 12 caracteres.');
    if (password !== confirmation) return setMessage('Las dos contraseñas no coinciden.');

    setBusy(true);
    const updated = await sb.auth.updateUser({ password });
    if (updated.error) {
      setMessage('No fue posible actualizar la contraseña. Solicita un enlace nuevo.');
      setBusy(false);
      return;
    }

    let activation: Response;
    try {
      activation = await fetch('/api/account/activate', { method: 'POST', credentials: 'same-origin' });
    } catch {
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
      setMessage(
        activationBody.message
          ? `${activationBody.message} La contraseña ya quedó guardada; no necesitas volver a definirla.`
          : 'La contraseña quedó guardada, pero SFI no confirmó el acceso institucional. Solicita revisión antes de continuar.',
      );
      setBusy(false);
      return;
    }

    window.location.href = '/entry';
  };

  return (
    <main className="login">
      <form onSubmit={submit}>
        <div className="sigil">SFI.</div>
        <h1>Activar acceso</h1>
        <p>{message}</p>
        <input name="password" type="password" placeholder="nueva contraseña" autoComplete="new-password" minLength={12} required disabled={!ready || busy} />
        <input name="confirmation" type="password" placeholder="repite la contraseña" autoComplete="new-password" minLength={12} required disabled={!ready || busy} />
        <button disabled={!ready || busy}>{busy ? 'GUARDANDO…' : 'ACTIVAR CUENTA'}</button>
        <small>SFI nunca necesita enviarte una contraseña temporal ni conocer la contraseña que elijas.</small>
      </form>
    </main>
  );
}

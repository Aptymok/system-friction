'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

export function PasswordResetSurface({ mode }: { mode: 'invite' | 'recovery' }) {
  const sb = useMemo(() => createBrowserSupabaseClient(), []);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Verificando el enlace seguro…');

  useEffect(() => {
    if (!sb) {
      setMessage('El servicio de acceso no está disponible.');
      return;
    }
    let active = true;
    const check = async () => {
      const { data } = await sb.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
        setMessage(mode === 'invite'
          ? 'Correo verificado. Define tu contraseña para activar el acceso.'
          : 'Identidad verificada. Define una nueva contraseña.');
      } else {
        setMessage('El enlace no ha creado una sesión válida. Puede haber expirado o ya haber sido utilizado.');
      }
    };
    void check();
    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (!active || !session) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setReady(true);
        setMessage(mode === 'invite'
          ? 'Correo verificado. Define tu contraseña para activar el acceso.'
          : 'Identidad verificada. Define una nueva contraseña.');
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [mode, sb]);

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
    await fetch('/api/account/activate', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
    window.location.href = '/entry';
  };

  return (
    <main className="login">
      <form onSubmit={submit}>
        <div className="sigil">SFI.</div>
        <h1>{mode === 'invite' ? 'Activar acceso' : 'Nueva contraseña'}</h1>
        <p>{message}</p>
        <input name="password" type="password" placeholder="nueva contraseña" autoComplete="new-password" minLength={12} required disabled={!ready || busy} />
        <input name="confirmation" type="password" placeholder="repite la contraseña" autoComplete="new-password" minLength={12} required disabled={!ready || busy} />
        <button disabled={!ready || busy}>{busy ? 'GUARDANDO…' : mode === 'invite' ? 'ACTIVAR CUENTA' : 'GUARDAR CONTRASEÑA'}</button>
        <small>SFI nunca necesita enviarte una contraseña temporal ni conocer la contraseña que elijas.</small>
      </form>
    </main>
  );
}

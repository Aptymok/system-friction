'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

function requestedNextPath() {
  const candidate = new URLSearchParams(window.location.search).get('next') || '';
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '';
}

function postLoginPath() {
  const next = requestedNextPath();
  return next ? `/entry?next=${encodeURIComponent(next)}` : '/entry';
}

function readableAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('timeout') ||
    normalized.includes('deadline') ||
    normalized.includes('temporarily unavailable') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('context canceled')
  ) {
    return 'El servicio de acceso tardó demasiado. No significa que tu cuenta o contraseña sean incorrectas. Reintenta en unos segundos.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'El correo o la contraseña no coinciden con una cuenta registrada.';
  }
  return message;
}

export function LoginSurface() {
  const sb = useMemo(() => createBrowserSupabaseClient(), []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!sb) return setError('Supabase no configurado');

    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      const { error: signInError } = await sb.auth.signInWithPassword({
        email: String(form.get('email') || ''),
        password: String(form.get('password') || ''),
      });

      if (signInError) {
        setError(readableAuthError(signInError.message));
        setBusy(false);
        return;
      }

      window.location.href = postLoginPath();
    } catch (cause) {
      setError(readableAuthError(cause instanceof Error ? cause.message : 'No fue posible verificar el acceso.'));
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form onSubmit={submit}>
        <div className="sigil">SFI.</div>
        <h1>Acceso al instituto</h1>
        <p>Acceso institucional mediante correo y contraseña. Esta superficie no usa Google, Apple ni otro inicio de sesión social.</p>
        <input name="email" type="email" placeholder="correo" autoComplete="username" required />
        <input name="password" type="password" placeholder="contraseña" autoComplete="current-password" required />
        <button disabled={busy}>{busy ? 'VERIFICANDO…' : 'ENTRAR'}</button>
        {error && <small>{error}</small>}
        <small>
          Juan Antonio Marín Liera · Founder — acceso ROOT soberano. Edwing Peredo Guadarrama · Director de Dominio — SFI Studio — acceso institucional a Studio y observación ROOT; las acciones soberanas permanecen reservadas al Founder.
        </small>
        <small><a href="/field">FIELD es público y no requiere iniciar sesión.</a></small>
      </form>
    </main>
  );
}

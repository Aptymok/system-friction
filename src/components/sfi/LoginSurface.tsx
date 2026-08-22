'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

function safeNextPath() {
  const candidate = new URLSearchParams(window.location.search).get('next') || '';
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/root';
}

export function LoginSurface() {
  const sb = useMemo(() => createBrowserSupabaseClient(), []);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sb) return setError('Supabase no configurado');
    const form = new FormData(event.currentTarget);
    const { error: signInError } = await sb.auth.signInWithPassword({
      email: String(form.get('email') || ''),
      password: String(form.get('password') || ''),
    });
    if (signInError) setError(signInError.message);
    else window.location.href = safeNextPath();
  };

  return (
    <main className="login">
      <form onSubmit={submit}>
        <div className="sigil">SFI.</div>
        <h1>Acceso al instituto</h1>
        <p>Observación, evidencia, decisión y retorno.</p>
        <input name="email" type="email" placeholder="correo" required />
        <input name="password" type="password" placeholder="contraseña" required />
        <button>ENTRAR</button>
        {error && <small>{error}</small>}
      </form>
    </main>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';
import './AlternativeSignIn.css';

type SocialProvider = 'google' | 'apple' | 'facebook';

export function AlternativeSignIn() {
  const [email,setEmail] = useState('');
  const [busy,setBusy] = useState('');
  const [message,setMessage] = useState('');
  const callback = () => `${window.location.origin}/auth/callback`;

  async function social(provider: SocialProvider) {
    const client = createBrowserSupabaseClient();
    if (!client) { setMessage('El servicio de identidad no está disponible.'); return; }
    setBusy(provider); setMessage('');
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider, options: { redirectTo: callback() },
      });
      if (error) throw error;
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
      setBusy('');
    }
  }

  async function magic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = createBrowserSupabaseClient();
    if (!client) { setMessage('Servicio de identidad no disponible.'); return; }
    setBusy('magic'); setMessage('');
    try {
      const { error } = await client.auth.signInWithOtp({
        email:email.trim().toLowerCase(),
        options:{shouldCreateUser:false,emailRedirectTo:callback()},
      });
      if (error) throw error;
      setMessage('Si la cuenta existe, recibirás un enlace de inicio de sesión de un solo uso.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo enviar el correo.');
    } finally { setBusy(''); }
  }

  async function passkey() {
    const client = createBrowserSupabaseClient();
    if (!client) { setMessage('Servicio de identidad no disponible.'); return; }
    setBusy('passkey'); setMessage('');
    try {
      const { data, error } = await client.auth.signInWithPasskey();
      if (error) throw error;
      if (!data.session) throw new Error('El dispositivo no confirmó una sesión.');
      window.location.assign('/entry');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo utilizar la clave de acceso.');
      setBusy('');
    }
  }

  return <section className="sfiAlternateAuth" aria-label="Otras formas de ingresar">
    <p>OTRAS FORMAS DE INGRESAR</p>
    <div className="sfiAlternateAuthProviders">
      <button disabled={Boolean(busy)} type="button" onClick={() => social('google')}>Google</button>
      <button disabled={Boolean(busy)} type="button" onClick={() => social('apple')}>Apple</button>
      <button disabled={Boolean(busy)} type="button" onClick={() => social('facebook')}>Facebook</button>
      <button disabled={Boolean(busy)} type="button" onClick={passkey}>Rostro / dispositivo</button>
    </div>
    <form onSubmit={magic} className="sfiAlternateAuthMagic">
      <label htmlFor="sfi-magic-email">Recibir un enlace de acceso único</label>
      <div className="sfiAlternateAuthEmail">
        <input id="sfi-magic-email" type="email" autoComplete="email" value={email}
          placeholder="correo@ejemplo.com" required onChange={event => setEmail(event.target.value)}/>
        <button type="submit" disabled={Boolean(busy)}>{busy==='magic'?'Enviando…':'Enviar enlace'}</button>
      </div>
    </form>
    {message ? <p role="status" className="authMessage">{message}</p> : null}
    <a href="/account/security">Activar o administrar rostro / huella del dispositivo</a>
  </section>;
}

'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

type Credential = { id:string; friendly_name?:string; created_at?:string };

export function PasskeyEnrollment() {
  const [passkeys,setPasskeys] = useState<Credential[]>([]);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function list() {
    const client = createBrowserSupabaseClient();
    if (!client) return;
    const session = await client.auth.getUser();
    if (!session.data.user) { setMessage('Primero ingresa con tu cuenta de SFI.'); return; }
    const response = await client.auth.passkey.list();
    if (response.error) { setMessage(response.error.message); return; }
    setPasskeys(response.data || []);
  }
  useEffect(() => { void list(); }, []);
  async function enroll() {
    const client = createBrowserSupabaseClient();
    if (!client) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await client.auth.registerPasskey();
      if (error) throw error;
      setMessage('Clave de acceso registrada en tu dispositivo.');
      await list();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo registrar el dispositivo.');
    } finally { setBusy(false); }
  }
  async function remove(id:string) {
    const client = createBrowserSupabaseClient();
    if (!client || busy || !window.confirm('¿Eliminar la clave de acceso de este dispositivo?')) return;
    setBusy(true);
    const result = await client.auth.passkey.delete({passkeyId:id});
    if (result.error) setMessage(result.error.message);
    else {setMessage('Clave de acceso eliminada.'); await list();}
    setBusy(false);
  }
  return <section>
    <p>Tu rostro, huella o PIN desbloquea una clave privada en tu dispositivo. SFI no recibe datos biométricos.</p>
    <button onClick={enroll} disabled={busy} type="button">{busy?'Verificando…':'ACTIVAR ROSTRO / HUELLA'}</button>
    {message ? <p role="status">{message}</p> : null}
    <div>{passkeys.map(k => <article key={k.id}>
      <span>{k.friendly_name || 'Dispositivo registrado'}</span>
      <button onClick={() => remove(k.id)} disabled={busy} type="button">Eliminar dispositivo</button>
    </article>)}</div>
  </section>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

/**
 * Handles PKCE, implicit tokens, email OTP, and social callbacks.
 * Server-side grant/identity matching is the only route to institutional activation.
 */
export function AuthCallbackSurface() {
  const [message,setMessage]=useState('Verificando tu identidad…');
  const started=useRef(false);
  useEffect(()=>{
    if(started.current)return;
    started.current=true;
    let live=true;
    const finish=async()=>{
      const client=createBrowserSupabaseClient();
      if(!client)throw new Error('Servicio de identidad no disponible.');
      const query=new URLSearchParams(window.location.search);
      const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
      const code=query.get('code');
      const authError=query.get('error_description')||hash.get('error_description');
      if(authError)throw new Error(authError);
      let session=(await client.auth.getSession()).data.session;
      if(code){
        const exchanged=await client.auth.exchangeCodeForSession(code);
        if(exchanged.data.session)session=exchanged.data.session;
        else if(!session)throw exchanged.error??new Error('No fue posible confirmar el código de acceso.');
      } else if(hash.get('access_token')&&hash.get('refresh_token')){
        const accessToken=hash.get('access_token')!;
        if(!session || session.access_token!==accessToken){
          const exchanged=await client.auth.setSession({
            access_token:accessToken,refresh_token:hash.get('refresh_token')!,
          });
          if(exchanged.error)throw exchanged.error;
          session=exchanged.data.session;
        }
      }
      window.history.replaceState(window.history.state,'','/auth/callback');
      if(!live)return;
      if(!session)throw new Error('El enlace expiró o no creó una sesión.');

      const check=await fetch('/api/account/invitation-session',{
        credentials:'same-origin',cache:'no-store',
      });
      const eligibility=check.ok?await check.json() as {eligible?:boolean;status?:string}:null;
      if(!live)return;
      if(eligibility?.eligible && eligibility.status==='ACTIVE'){
        window.location.replace('/entry');return;
      }
      if(eligibility?.eligible && eligibility.status==='INVITED'){
        const activated=await fetch('/api/account/activate',{
          method:'POST',credentials:'same-origin',cache:'no-store',
        });
        const response=activated.ok?await activated.json() as {ok?:boolean;activated?:boolean}:null;
        if(response?.ok&&response.activated){
          window.location.replace('/entry');return;
        }
        throw new Error('La identidad se verificó, pero la activación institucional necesita revisión.');
      }
      window.location.replace('/entry');
    };
    void finish().catch(cause=>{
      if(live)setMessage(cause instanceof Error?cause.message:'No se pudo completar el inicio de sesión.');
    });
    return ()=>{live=false;};
  },[]);
  return <main className="sfiAuthGate" data-sfi-auth-surface="institutional-access">
    <section className="sfiAuthPanel"><header className="sfiAuthHeader"><strong>SFI. ACCESS</strong></header>
      <h1>Confirmación de identidad</h1>
      <p role="status">{message}</p>
      <a href="/login">Volver a ingresar</a> · <a href="/forgot">Solicitar otro enlace</a>
    </section>
  </main>;
}

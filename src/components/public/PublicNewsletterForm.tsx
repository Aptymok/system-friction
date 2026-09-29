'use client';

import { useState, type FormEvent } from 'react';

export function PublicNewsletterForm(){
  const [state,setState]=useState<'idle'|'sending'|'ok'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setState('sending');setMessage('');
    const form=new FormData(event.currentTarget);
    const payload={
      email:String(form.get('email')||'').trim(),
      consent:form.get('consent')==='on',
      source:'PUBLIC_FOOTER',
    };
    try{
      const response=await fetch('/api/public/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.ok) throw new Error(data?.error||'Subscription could not be recorded.');
      setState('ok');setMessage('Subscription recorded.');
      event.currentTarget.reset();
    }catch(error){
      setState('error');setMessage(error instanceof Error?error.message:'Subscription could not be recorded.');
    }
  }
  return <form className="sfiNewsletter" onSubmit={submit}>
    <label><span>NEWSLETTER</span><input name="email" type="email" autoComplete="email" required placeholder="Email address"/></label>
    <label className="sfiNewsletterConsent"><input name="consent" type="checkbox" required/><span>The subscriber agrees to receive SFI publication and institutional updates.</span></label>
    <button type="submit" disabled={state==='sending'}>{state==='sending'?'RECORDING…':'SUBSCRIBE'}</button>
    {message?<small data-state={state}>{message}</small>:null}
  </form>;
}

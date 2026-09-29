'use client';

import { useState, type FormEvent } from 'react';

export function PublicContactForm(){
  const [state,setState]=useState<'idle'|'sending'|'ok'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setState('sending');setMessage('');
    const form=new FormData(event.currentTarget);
    const payload={
      name:String(form.get('name')||'').trim(),
      email:String(form.get('email')||'').trim(),
      organization:String(form.get('organization')||'').trim(),
      subject:String(form.get('subject')||'').trim(),
      message:String(form.get('message')||'').trim(),
      consent:form.get('consent')==='on',
      source:'PUBLIC_CONTACT',
    };
    try{
      const response=await fetch('/api/public/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.ok) throw new Error(data?.error||'The message could not be recorded.');
      setState('ok');setMessage('The message was recorded. SFI may reply using the supplied email address.');
      event.currentTarget.reset();
    }catch(error){
      setState('error');setMessage(error instanceof Error?error.message:'The message could not be recorded.');
    }
  }
  return <form className="sfiContactForm" onSubmit={submit}>
    <div className="sfiContactGrid">
      <label><span>NAME</span><input name="name" maxLength={160} required/></label>
      <label><span>EMAIL</span><input name="email" type="email" autoComplete="email" maxLength={320} required/></label>
      <label><span>ORGANIZATION</span><input name="organization" maxLength={200}/></label>
      <label><span>SUBJECT</span><input name="subject" maxLength={240} required/></label>
    </div>
    <label><span>MESSAGE</span><textarea name="message" rows={8} maxLength={6000} required/></label>
    <label className="sfiContactConsent"><input name="consent" type="checkbox" required/><span>The sender agrees that SFI may store this submission and use the supplied email address to reply.</span></label>
    <button type="submit" disabled={state==='sending'}>{state==='sending'?'RECORDING…':'SEND MESSAGE'}</button>
    {message?<p className="sfiFormMessage" data-state={state}>{message}</p>:null}
  </form>;
}

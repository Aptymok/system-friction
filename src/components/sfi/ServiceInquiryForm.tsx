'use client';
import { useMemo, useState, type FormEvent } from 'react';
import { SFI_PUBLIC_SERVICES, SFI_PUBLIC_INQUIRY_EMAIL } from '@/lib/public/sfiServiceCatalog';

export function ServiceInquiryForm({initialSlug}:{initialSlug:string}){
 const [slug,setSlug]=useState(initialSlug);
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [organization,setOrganization]=useState('');
 const [question,setQuestion]=useState('');
 const [copied,setCopied]=useState(false);
 const [prepared,setPrepared]=useState(false);
 const service=SFI_PUBLIC_SERVICES.find(s=>s.slug===slug);
 const message=useMemo(()=>[
   'INITIAL ASSESSMENT INQUIRY — SFI',
   '',
   'Service of interest: '+(service?.title??'Help choosing a service'),
   'Name: '+name.trim(),
   'Reply email: '+email.trim(),
   'Organization (optional): '+(organization.trim()||'Not provided'),
   '',
   'Situation and question to investigate:',
   question.trim(),
   '',
   'I am requesting a preliminary scope review only. This inquiry is not a contract, includes no confidential attachments and authorizes no material actions.',
 ].join('\n'),[service,name,email,organization,question]);
 const subject='SFI services inquiry — '+(service?.title??'Evaluación inicial');
 const mailto='mailto:'+SFI_PUBLIC_INQUIRY_EMAIL+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);
 function prepare(event:FormEvent<HTMLFormElement>){event.preventDefault();setCopied(false);setPrepared(true);}
 async function copy(){
  try {await navigator.clipboard.writeText(message);setCopied(true);}
  catch {setCopied(false);}
 }
 return <div className="sfiServicesInquiry">
   <form onSubmit={prepare} aria-label="Preparar una solicitud sin crear cuenta">
     <label>Interested service
       <select value={slug} onChange={e=>{setSlug(e.target.value);setPrepared(false);}}>
        <option value="">I need help choosing</option>
        {SFI_PUBLIC_SERVICES.map(s=><option key={s.canonicalId} value={s.slug}>{s.title}</option>)}
       </select>
     </label>
     <div className="sfiServicesFormPair"><label>Your name
       <input required autoComplete="name" maxLength={120} value={name} onChange={e=>{setName(e.target.value);setPrepared(false);}} placeholder="How should we address you?"/>
      </label><label>Reply email
       <input required type="email" autoComplete="email" maxLength={200} value={email} onChange={e=>{setEmail(e.target.value);setPrepared(false);}} placeholder="tu@organizacion.com"/>
      </label></div>
     <label>Organization <span>(opcional)</span>
       <input autoComplete="organization" maxLength={180} value={organization} onChange={e=>{setOrganization(e.target.value);setPrepared(false);}} placeholder="Company, institution or project"/>
     </label>
     <label>What do you need to understand or resolve?
       <textarea required rows={5} minLength={15} maxLength={850} value={question} onChange={e=>{setQuestion(e.target.value);setPrepared(false);}} placeholder="Describe what happened and which answer would help. Do not include confidential information."/>
     </label>
     <p className="sfiServicesPrivacy">This form does not send or store information on SFI servers. It prepares an email you can review and send from your own application. Do not include passwords, medical records or confidential files. Read our <a href="/privacy">privacy notice</a>.</p>
     <button className="sfiServicesButton" type="submit">Prepare your inquiry ↗</button>
   </form>
   {prepared&&<div className="sfiServicesPrepared" role="status">
     <h2>Your inquiry is ready.</h2>
     <p><strong>It has not been sent.</strong> Open your email application, review the message and choose Send. If no email application opens, copy the text instead.</p>
     <div className="sfiServicesButtons"><a className="sfiServicesButton" href={mailto}>Open email application ↗</a><button type="button" className="sfiServicesSecondaryButton" onClick={()=>void copy()}>{copied?'Text copied ✓':'Copy message'}</button></div>
     <details><summary>Review prepared message</summary><textarea readOnly value={message} rows={12} aria-label="Prepared inquiry text"/></details>
     <p className="sfiServicesCaption">Recipient: {SFI_PUBLIC_INQUIRY_EMAIL}. No case or charge has been created.</p>
   </div>}
 </div>;
}
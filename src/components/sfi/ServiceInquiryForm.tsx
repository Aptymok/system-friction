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
   'SOLICITUD INICIAL DE EVALUACIÓN — SFI',
   '',
   'Servicio de interés: '+(service?.title??'Ayuda para elegir un servicio'),
   'Nombre: '+name.trim(),
   'Correo de respuesta: '+email.trim(),
   'Organización (opcional): '+(organization.trim()||'No indicada'),
   '',
   'Situación y pregunta que queremos resolver:',
   question.trim(),
   '',
   'Solicito únicamente una revisión preliminar del alcance. Esta solicitud no es una contratación, no adjunta datos confidenciales y no autoriza acciones materiales.',
 ].join('\n'),[service,name,email,organization,question]);
 const subject='Consulta de servicios SFI — '+(service?.title??'Evaluación inicial');
 const mailto='mailto:'+SFI_PUBLIC_INQUIRY_EMAIL+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);
 function prepare(event:FormEvent<HTMLFormElement>){event.preventDefault();setCopied(false);setPrepared(true);}
 async function copy(){
  try {await navigator.clipboard.writeText(message);setCopied(true);}
  catch {setCopied(false);}
 }
 return <div className="sfiServicesInquiry">
   <form onSubmit={prepare} aria-label="Preparar una solicitud sin crear cuenta">
     <label>Servicio de interés
       <select value={slug} onChange={e=>{setSlug(e.target.value);setPrepared(false);}}>
        <option value="">Necesito orientación para elegir</option>
        {SFI_PUBLIC_SERVICES.map(s=><option key={s.canonicalId} value={s.slug}>{s.title}</option>)}
       </select>
     </label>
     <div className="sfiServicesFormPair"><label>Tu nombre
       <input required autoComplete="name" maxLength={120} value={name} onChange={e=>{setName(e.target.value);setPrepared(false);}} placeholder="¿Cómo podemos dirigirnos a ti?"/>
      </label><label>Correo de respuesta
       <input required type="email" autoComplete="email" maxLength={200} value={email} onChange={e=>{setEmail(e.target.value);setPrepared(false);}} placeholder="tu@organizacion.com"/>
      </label></div>
     <label>Organización <span>(opcional)</span>
       <input autoComplete="organization" maxLength={180} value={organization} onChange={e=>{setOrganization(e.target.value);setPrepared(false);}} placeholder="Empresa, institución o proyecto"/>
     </label>
     <label>¿Qué situación necesitas entender o resolver?
       <textarea required rows={5} minLength={15} maxLength={850} value={question} onChange={e=>{setQuestion(e.target.value);setPrepared(false);}} placeholder="Describe el problema, qué ocurrió y qué resultado te ayudaría. No incluyas información confidencial."/>
     </label>
     <p className="sfiServicesPrivacy">Este formulario no almacena ni envía información a nuestros servidores. Prepara un correo que podrás revisar y enviar desde tu aplicación. No compartas contraseñas, expedientes médicos ni documentos reservados en esta consulta inicial. Consulta nuestro <a href="/privacy">aviso de privacidad</a>.</p>
     <button className="sfiServicesButton" type="submit">Preparar solicitud ↗</button>
   </form>
   {prepared&&<div className="sfiServicesPrepared" role="status">
     <h2>Tu solicitud está preparada.</h2>
     <p><strong>Aún no se ha enviado.</strong> Abre tu correo, revisa el mensaje y pulsa Enviar para que SFI lo reciba. Si tu dispositivo no abre una aplicación de correo, copia el texto.</p>
     <div className="sfiServicesButtons"><a className="sfiServicesButton" href={mailto}>Abrir correo para enviar ↗</a><button type="button" className="sfiServicesSecondaryButton" onClick={()=>void copy()}>{copied?'Texto copiado ✓':'Copiar texto'}</button></div>
     <details><summary>Revisar texto preparado</summary><textarea readOnly value={message} rows={12} aria-label="Texto de la solicitud preparada"/></details>
     <p className="sfiServicesCaption">Destinatario: {SFI_PUBLIC_INQUIRY_EMAIL}. No se ha generado un caso ni un cobro.</p>
   </div>}
 </div>;
}
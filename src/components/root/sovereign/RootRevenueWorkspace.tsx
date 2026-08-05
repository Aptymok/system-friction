'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import './root-revenue-workspace.css';

type JsonRow = Record<string, unknown>;
type Workspace = { schemaReady:boolean; warnings:string[]; clients:JsonRow[]; opportunities:JsonRow[]; proposals:JsonRow[]; sourceProposals:JsonRow[]; counts:{clients:number;openOpportunities:number;draftProposals:number;activeProposals:number;acceptedProposals:number} };
type Analysis = { ifnorm?: { entity_name?:string; person_or_role?:string; sector?:string; detected_pain?:string; public_signal?:string; recommended_offer?:string; recommended_action?:string; suggested_human_message?:string; p_response?:number; p_meeting?:number; p_paid_diagnostic?:number; evidence?:string[]; status?:string }; warnings?:string[] };
type SignalDraft = { company:string; website:string; sector:string; role:string; contactName:string; contactEmail:string; source:string; signal:string; notes:string; estimatedValue:string };

const EMPTY: SignalDraft = { company:'', website:'', sector:'', role:'', contactName:'', contactEmail:'', source:'', signal:'', notes:'', estimatedValue:'35000' };

function text(value:unknown,fallback='—'){ return typeof value==='string'&&value.trim()?value.trim():fallback; }
function number(value:unknown){ const parsed=typeof value==='number'?value:Number(value); return Number.isFinite(parsed)?parsed:0; }
function primaryContact(row:JsonRow){ const value=row.primary_contact; return value&&typeof value==='object'?value as JsonRow:{}; }
function money(value:unknown,currency='MXN'){ const amount=number(value); return amount?new Intl.NumberFormat('es-MX',{style:'currency',currency,maximumFractionDigits:0}).format(amount):'Sin estimación'; }
async function request(intent:string,payload:JsonRow={}){ const response=await fetch('/api/root/commercial',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({intent,payload})}); const body=await response.json().catch(()=>null); if(!response.ok||!body?.ok) throw new Error(body?.details??body?.error??`HTTP ${response.status}`); return body.data; }

export function RootRevenueWorkspace(){
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [draft,setDraft]=useState<SignalDraft>(EMPTY);
  const [analysis,setAnalysis]=useState<Analysis|null>(null);
  const [composerOpen,setComposerOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  const load=useCallback(async()=>{ setLoading(true); try{ const response=await fetch('/api/root/commercial',{cache:'no-store',credentials:'include'}); const body=await response.json().catch(()=>null); if(!response.ok||!body?.ok) throw new Error(body?.error??`HTTP ${response.status}`); setWorkspace(body.data); setMessage(null);}catch(error){setMessage(error instanceof Error?error.message:'commercial_workspace_load_failed');}finally{setLoading(false);} },[]);
  useEffect(()=>{void load();},[load]);

  const clients=workspace?.clients??[];
  const opportunities=workspace?.opportunities??[];
  const proposals=workspace?.proposals??[];
  const clientById=useMemo(()=>new Map(clients.map(client=>[String(client.id),client])),[clients]);
  const selected=opportunities.find(row=>String(row.id)===selectedId)??opportunities[0]??null;
  const selectedClient=selected?clientById.get(String(selected.client_id))??null:null;
  const selectedProposal=selected?proposals.find(row=>String(row.opportunity_id)===String(selected.id))??null:null;

  function update<K extends keyof SignalDraft>(key:K,value:SignalDraft[K]){ setDraft(current=>({...current,[key]:value})); setAnalysis(null); }

  async function analyze(){
    if(!draft.company.trim()||!draft.signal.trim()){ setMessage('Sólo necesito dos cosas para comenzar: la empresa y qué observaste.'); return; }
    setLoading(true); setMessage(null);
    try{ const result=await request('analyze_signal',{entityName:draft.company,personOrRole:draft.role,sector:draft.sector,publicSignal:draft.signal,source:draft.source||'observación directa en ROOT',notes:draft.notes}) as Analysis; setAnalysis(result); }
    catch(error){setMessage(error instanceof Error?error.message:'signal_analysis_failed');}
    finally{setLoading(false);}
  }

  async function persist(){
    if(!analysis?.ifnorm||!draft.company)return;
    setLoading(true); setMessage(null);
    try{
      let client=clients.find(row=>text(row.name,'').toLowerCase()===draft.company.trim().toLowerCase());
      if(!client){ client=await request('create_client',{name:draft.company,legalName:draft.company,sector:draft.sector,website:draft.website,contactName:draft.contactName,contactRole:draft.role||analysis.ifnorm.person_or_role,contactEmail:draft.contactEmail,source:draft.source||'root_signal_analysis',notes:draft.notes}) as JsonRow; }
      const opportunity=await request('create_opportunity',{clientId:String(client.id),title:`${analysis.ifnorm.recommended_offer??'SFI-DR01'} · ${draft.company}`,problemStatement:analysis.ifnorm.detected_pain??draft.signal,recommendedOffer:analysis.ifnorm.recommended_offer??'SFI-DR01',estimatedValue:Number(draft.estimatedValue||35000),probability:analysis.ifnorm.p_paid_diagnostic??0.2,nextAction:analysis.ifnorm.recommended_action??'Revisar evidencia y aprobar contacto.'}) as JsonRow;
      setDraft(EMPTY); setAnalysis(null); setComposerOpen(false); setSelectedId(String(opportunity.id)); setMessage('Oportunidad guardada. Ya forma parte del campo comercial.'); await load();
    }catch(error){setMessage(error instanceof Error?error.message:'commercial_persistence_failed');}
    finally{setLoading(false);}
  }

  async function openMail(){
    if(!selected||!selectedClient)return;
    setLoading(true); setMessage(null);
    try{
      const contact=primaryContact(selectedClient);
      const draftMail=await request('mail_draft',{recipient:text(contact.email,''),company:text(selectedClient.name),role:text(contact.role,'Dirección de Operaciones'),pain:text(selected.problem_statement),offer:text(selected.recommended_offer,'SFI-DR01'),message:selectedProposal?`${text(contact.name,text(contact.role,'Equipo responsable'))}:\n\nAdjunto la propuesta ${text(selectedProposal.proposal_number)}: ${text(selectedProposal.title)}.\n\n${text(selectedProposal.diagnosis)}\n\nAlcance: ${text(selectedProposal.service_scope)}\n\nJuan Antonio Marín Liera\nFounder · System Friction Institute`:undefined}) as {mailto?:string;requiresRecipient?:boolean};
      if(draftMail.requiresRecipient){setMessage('Todavía no hay un correo público o autorizado. Puedes conservar la oportunidad y añadirlo después.');return;}
      if(draftMail.mailto)window.location.href=draftMail.mailto;
    }catch(error){setMessage(error instanceof Error?error.message:'mail_draft_failed');}
    finally{setLoading(false);}
  }

  return <section className="rrw-root" aria-label="Conversión económica ROOT">
    <header className="rrw-header"><div><span>ROOT · CONVERSIÓN ECONÓMICA</span><h2>Observa algo. ROOT organiza lo demás.</h2><p>No necesitas saber llenar un CRM. Escribe qué empresa viste y qué ocurrió; los agentes propondrán dolor, rol, oferta y siguiente acción antes de guardar.</p></div><button type="button" onClick={()=>setComposerOpen(value=>!value)}>{composerOpen?'CERRAR OBSERVACIÓN':'REGISTRAR ALGO QUE VI'}</button></header>
    {message?<div className="rrw-message">{message}</div>:null}
    {workspace?.warnings?.length?<div className="rrw-warning">{workspace.warnings.join(' · ')}</div>:null}
    <div className="rrw-metrics"><article><span>EMPRESAS</span><strong>{workspace?.counts.clients??0}</strong></article><article><span>OPORTUNIDADES ABIERTAS</span><strong>{workspace?.counts.openOpportunities??0}</strong></article><article><span>PROPUESTAS EN PREPARACIÓN</span><strong>{workspace?.counts.draftProposals??0}</strong></article><article><span>PROPUESTAS ACTIVAS</span><strong>{workspace?.counts.activeProposals??0}</strong></article><article><span>CONVERSIONES</span><strong>{workspace?.counts.acceptedProposals??0}</strong></article></div>

    {composerOpen?<section className="rrw-composer guided">
      <div className="rrw-form">
        <div className="rrw-step wide"><b>1</b><div><strong>¿En qué empresa ocurrió?</strong><p>Escribe el nombre con el que la conoces. El nombre legal, sector y sitio pueden completarse después.</p></div></div>
        <label className="wide essential">EMPRESA<input autoFocus value={draft.company} onChange={e=>update('company',e.target.value)} placeholder="Ejemplo: Kavak, FEMSA, una clínica local…" /></label>
        <div className="rrw-step wide"><b>2</b><div><strong>¿Qué viste o qué está pasando?</strong><p>Descríbelo como se lo contarías a alguien. No necesitas diagnosticarlo ni usar lenguaje SFI.</p></div></div>
        <label className="wide essential">OBSERVACIÓN<textarea value={draft.signal} onChange={e=>update('signal',e.target.value)} placeholder="Ejemplo: el pago fue autorizado hace más de 40 días, pero cada seguimiento termina en otra promesa y nadie identifica la causa ni ejecuta el pago." /></label>
        <div className="rrw-step wide"><b>3</b><div><strong>¿Dónde lo viste?</strong><p>Pega una URL, escribe “experiencia directa”, “correo recibido”, “reporte anual” o la procedencia que tengas.</p></div></div>
        <label className="wide">PROCEDENCIA<input value={draft.source} onChange={e=>update('source',e.target.value)} placeholder="URL, experiencia directa, conversación, documento…" /></label>

        <details className="rrw-advanced wide"><summary>SÉ MÁS DATOS · COMPLETAR OPCIONALMENTE</summary><div>
          <label>SITIO OFICIAL<input value={draft.website} onChange={e=>update('website',e.target.value)} placeholder="https://..." /></label>
          <label>SECTOR<input value={draft.sector} onChange={e=>update('sector',e.target.value)} placeholder="Movilidad, seguros, logística…" /></label>
          <label>ROL QUE PODRÍA RESOLVERLO<input value={draft.role} onChange={e=>update('role',e.target.value)} placeholder="Operaciones, CX, Pagos, Riesgo…" /></label>
          <label>PERSONA CONOCIDA<input value={draft.contactName} onChange={e=>update('contactName',e.target.value)} placeholder="Sólo si es pública o autorizada" /></label>
          <label>CORREO AUTORIZADO<input type="email" value={draft.contactEmail} onChange={e=>update('contactEmail',e.target.value)} placeholder="Puede quedar vacío" /></label>
          <label>VALOR ESTIMADO MXN<input inputMode="numeric" value={draft.estimatedValue} onChange={e=>update('estimatedValue',e.target.value)} /></label>
          <label className="wide">ALGO QUE ROOT NO DEBE ASUMIR<textarea value={draft.notes} onChange={e=>update('notes',e.target.value)} placeholder="Ejemplo: no afirmar fraude; el caso individual no representa toda la empresa." /></label>
        </div></details>
        <div className="rrw-form-actions wide"><span>{draft.company&&draft.signal?'ROOT YA PUEDE ANALIZAR':'FALTA EMPRESA Y OBSERVACIÓN'}</span><button type="button" onClick={()=>void analyze()} disabled={loading||!draft.company.trim()||!draft.signal.trim()}>{loading?'ANALIZANDO':'INTERPRETAR CON SFI'}</button></div>
      </div>
      <aside className="rrw-analysis"><span>LO QUE ROOT ENTENDIÓ</span>{analysis?.ifnorm?<><h3>{analysis.ifnorm.entity_name}</h3><p>{analysis.ifnorm.detected_pain}</p><dl><div><dt>Quién podría atenderlo</dt><dd>{analysis.ifnorm.person_or_role}</dd></div><div><dt>Qué ofrecer</dt><dd>{analysis.ifnorm.recommended_offer}</dd></div><div><dt>Probabilidad de respuesta</dt><dd>{Math.round(number(analysis.ifnorm.p_response)*100)}%</dd></div><div><dt>Probabilidad de reunión</dt><dd>{Math.round(number(analysis.ifnorm.p_meeting)*100)}%</dd></div><div><dt>Probabilidad de pago</dt><dd>{Math.round(number(analysis.ifnorm.p_paid_diagnostic)*100)}%</dd></div><div><dt>Evidencia encontrada</dt><dd>{analysis.ifnorm.evidence?.length??0}</dd></div></dl><p className="rrw-review-note">Revísalo. Si no representa lo que viste, modifica tu observación y vuelve a interpretar. Guardar no envía nada.</p><button type="button" onClick={()=>void persist()} disabled={loading||analysis.ifnorm.status==='manual_evidence_required'}>GUARDAR EN EL CAMPO COMERCIAL</button></>:<div className="rrw-analysis-empty"><strong>Aquí aparecerá una traducción legible.</strong><p>ROOT propondrá dolor, rol, oferta y probabilidades. Tú sólo decides si representa correctamente lo observado.</p></div>}</aside>
    </section>:null}

    <div className="rrw-field"><nav className="rrw-stream" aria-label="Pipeline comercial"><header><span>PIPELINE</span><b>{opportunities.length}</b></header>{opportunities.map(opportunity=>{const client=clientById.get(String(opportunity.client_id));return <button type="button" key={String(opportunity.id)} className={String(opportunity.id)===String(selected?.id)?'active':''} onClick={()=>setSelectedId(String(opportunity.id))}><span>{text(opportunity.stage)}</span><strong>{text(client?.name,text(opportunity.title))}</strong><p>{text(opportunity.problem_statement)}</p><small>{text(opportunity.recommended_offer)} · {money(opportunity.estimated_value,text(opportunity.currency,'MXN'))}</small></button>;})}{!opportunities.length?<div className="rrw-empty">Todavía no hay oportunidades guardadas. Pulsa “Registrar algo que vi”.</div>:null}</nav>
      <article className="rrw-focus">{selected&&selectedClient?<><header><div><span>{text(selected.stage)}</span><h3>{text(selectedClient.name)}</h3></div><b>{money(selected.estimated_value,text(selected.currency,'MXN'))}</b></header><section className="rrw-pain"><span>DOLOR OBSERVABLE</span><p>{text(selected.problem_statement)}</p></section><div className="rrw-grid"><section><span>EMPRESA</span><strong>{text(selectedClient.legal_name,text(selectedClient.name))}</strong><p>{text(selectedClient.sector,'Sector pendiente')} · {text(selectedClient.website,'Sitio pendiente')}</p></section><section><span>CONTACTO</span><strong>{text(primaryContact(selectedClient).name,text(primaryContact(selectedClient).role,'Rol pendiente'))}</strong><p>{text(primaryContact(selectedClient).email,'Correo pendiente')}</p></section><section><span>OFERTA</span><strong>{text(selected.recommended_offer,'SFI-DR01')}</strong><p>Probabilidad actual: {Math.round(number(selected.probability)*100)}%</p></section><section><span>SIGUIENTE ACCIÓN</span><strong>{text(selected.next_action,'Revisar evidencia')}</strong><p>{text(selected.next_action_at,'Sin fecha asignada')}</p></section></div>{selectedProposal?<section className="rrw-proposal"><span>PROPUESTA</span><h4>{text(selectedProposal.proposal_number)} · {text(selectedProposal.title)}</h4><p>{text(selectedProposal.diagnosis)}</p><small>{text(selectedProposal.status)} · {money(selectedProposal.price_amount,text(selectedProposal.currency,'MXN'))}</small></section>:<section className="rrw-proposal missing"><span>PROPUESTA</span><p>Todavía no existe propuesta comercial. La oportunidad permanece visible y no se disfraza como cierre.</p></section>}<div className="rrw-actions"><button type="button" onClick={()=>void openMail()} disabled={loading}>ABRIR BORRADOR EN MAIL</button><button type="button" onClick={()=>void load()} disabled={loading}>{loading?'ACTUALIZANDO':'ACTUALIZAR CAMPO'}</button></div></>:<div className="rrw-empty focus">Selecciona una oportunidad. Su expediente aparecerá aquí.</div>}</article>
    </div>
  </section>;
}

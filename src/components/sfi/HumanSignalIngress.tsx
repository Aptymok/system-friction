'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SessionControls } from './SessionControls';

const shell = { minHeight:'100dvh', background:'#050505', color:'#f0eee9', padding:'24px', fontFamily:'Inter,system-ui,sans-serif' } as const;
const card = { maxWidth:900, margin:'0 auto 18px', border:'1px solid rgba(255,255,255,.12)', padding:'22px', background:'#0b0b0b' } as const;
const field = { display:'grid', gap:7, marginBottom:14 } as const;
const inputStyle = { width:'100%', boxSizing:'border-box' as const, background:'#080808', color:'#f0eee9', border:'1px solid rgba(255,255,255,.15)', padding:'11px 12px' };
const buttonStyle = { border:'1px solid rgba(222,183,119,.55)', background:'#21180e', color:'#e7c283', padding:'10px 14px', cursor:'pointer' } as const;

type CycleStatus = { cycleId:string; state:string|null; eventCount:number; evidenceCount:number; cognitiveRunCount:number; returnCount:number };

async function json(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `SIGNAL_REQUEST_FAILED:${response.status}`);
  return payload;
}

export function HumanSignalIngress() {
  const auth = useAuthState();
  const router = useRouter();
  const search = useSearchParams();
  const cycleId = search.get('cycle');
  const [kind,setKind] = useState('text');
  const [name,setName] = useState('');
  const [sourceUrl,setSourceUrl] = useState('');
  const [content,setContent] = useState('');
  const [question,setQuestion] = useState('');
  const [objective,setObjective] = useState('');
  const [status,setStatus] = useState<CycleStatus|null>(null);
  const [evidence,setEvidence] = useState('');
  const [evidenceUrl,setEvidenceUrl] = useState('');
  const [outcome,setOutcome] = useState('');
  const [error,setError] = useState<string|null>(null);
  const [busy,setBusy] = useState(false);

  async function refresh(id = cycleId) {
    if (!id || auth.status !== 'authenticated') return;
    try {
      const payload = await json(await fetch(`/api/signal?cycleId=${encodeURIComponent(id)}`, { cache:'no-store' }));
      setStatus(payload.cycle);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SIGNAL_STATUS_FAILED');
    }
  }

  useEffect(() => { void refresh(); }, [cycleId, auth.status]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const payload = await json(await fetch('/api/signal', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ operation:'intake', input:{ signal:{ kind, name:name.trim()||undefined, sourceUrl:sourceUrl.trim()||undefined, content:content||undefined, observedAt:new Date().toISOString() }, question:question.trim()||undefined, objective:objective.trim()||undefined } }),
      }));
      router.replace(`/signal/new?cycle=${encodeURIComponent(payload.cycleId)}`);
      setStatus(payload.cycle);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'SIGNAL_CREATE_FAILED'); }
    finally { setBusy(false); }
  }

  async function op(body: Record<string,unknown>) {
    if (!cycleId || busy) return;
    setBusy(true); setError(null);
    try {
      const payload = await json(await fetch('/api/signal', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...body, cycleId }) }));
      setStatus(payload.cycle);
      return payload;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'SIGNAL_OPERATION_FAILED'); }
    finally { setBusy(false); }
  }

  if (auth.status !== 'authenticated') return <main style={shell}><section style={card}><h1>NEW SIGNAL</h1><p>Authentication is required.</p><SessionControls/></section></main>;

  return <main style={shell}>
    <header style={{maxWidth:900,margin:'0 auto 18px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
      <div><Link href="/root" style={{color:'#e2bd79',textDecoration:'none'}}>SFI</Link> · <strong>NEW SIGNAL</strong></div><SessionControls/>
    </header>

    {!cycleId && <form style={card} onSubmit={create}>
      <div style={{fontSize:11,letterSpacing:'.14em',color:'#d8b36f',marginBottom:10}}>HUMAN INGRESS · SFI-UNIVERSAL-SIGNAL-1.1</div>
      <h1 style={{fontFamily:'Georgia,serif',fontWeight:400}}>Persist first. Analyze later.</h1>
      <label style={field}><span>Kind</span><select style={inputStyle} value={kind} onChange={e=>setKind(e.target.value)}>{['text','url','web_page','image','audio','video','document','dataset','json','csv','conversation','api_response','unknown'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label style={field}><span>Name</span><input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} /></label>
      <label style={field}><span>URL · optional</span><input style={inputStyle} value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} /></label>
      <label style={field}><span>Material / text</span><textarea style={{...inputStyle,minHeight:130}} value={content} onChange={e=>setContent(e.target.value)} /></label>
      <label style={field}><span>Question · optional</span><textarea style={{...inputStyle,minHeight:80}} value={question} onChange={e=>setQuestion(e.target.value)} /></label>
      <label style={field}><span>Objective · optional</span><textarea style={{...inputStyle,minHeight:80}} value={objective} onChange={e=>setObjective(e.target.value)} /></label>
      {error&&<p style={{color:'#e5a0a0'}}>{error}</p>}
      <button style={buttonStyle} disabled={busy || (!content.trim()&&!sourceUrl.trim())}>{busy?'PERSISTING…':'OPEN SIGNAL CYCLE'}</button>
    </form>}

    {cycleId && <>
      <section style={card}>
        <div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><small>CYCLE</small><div style={{fontFamily:'monospace'}}>{cycleId}</div></div><button style={buttonStyle} onClick={()=>void refresh()} disabled={busy}>REFRESH</button></div>
        <p>State: <strong>{status?.state ?? 'READING'}</strong> · events {status?.eventCount ?? 0} · evidence {status?.evidenceCount ?? 0} · runs {status?.cognitiveRunCount ?? 0} · returns {status?.returnCount ?? 0}</p>
        <p style={{color:'#98948d'}}>Closing this page does not close the cycle. Reopen this URL to reconstruct the same cycle ID.</p>
      </section>

      <section style={card}>
        <h2>Add declared evidence candidate</h2>
        <label style={field}><span>Evidence text</span><textarea style={{...inputStyle,minHeight:100}} value={evidence} onChange={e=>setEvidence(e.target.value)} /></label>
        <label style={field}><span>Evidence URL · optional</span><input style={inputStyle} value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)} /></label>
        <button style={buttonStyle} disabled={busy||(!evidence.trim()&&!evidenceUrl.trim())} onClick={async()=>{await op({operation:'evidence',signal:{kind:evidenceUrl?'url':'text',sourceUrl:evidenceUrl.trim()||undefined,content:evidence||undefined,name:'Human evidence candidate'}});setEvidence('');setEvidenceUrl('')}}>ADD EVIDENCE</button>
      </section>

      <section style={card}>
        <h2>Analysis</h2>
        <p>Runs the existing Universal Cognitive Cycle over this persisted cycle. No new runtime is created.</p>
        <button style={buttonStyle} disabled={busy} onClick={()=>void op({operation:'run'})}>{busy?'WORKING…':'RUN ANALYSIS'}</button>
      </section>

      <section style={card}>
        <h2>RETURN</h2>
        <textarea style={{...inputStyle,minHeight:100}} value={outcome} onChange={e=>setOutcome(e.target.value)} placeholder="Observed outcome / return" />
        <div style={{marginTop:12}}><button style={buttonStyle} disabled={busy||!outcome.trim()} onClick={async()=>{await op({operation:'return',outcome});setOutcome('')}}>RECORD RETURN</button></div>
      </section>
      {error&&<section style={card}><p style={{color:'#e5a0a0'}}>{error}</p></section>}
    </>}
  </main>;
}

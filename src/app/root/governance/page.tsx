import Link from 'next/link';
import { readGovernanceHealth } from '@/lib/governance/readGovernanceHealth';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export default async function RootGovernancePage() {
  const gate = await requireRootActor('governance.page.read');
  if (!gate.ok) return <main style={{padding:24,background:'#050504',color:'#c8c0ad',minHeight:'100vh'}}>ROOT REQUIRED</main>;
  const health = await readGovernanceHealth();
  const counts = health.proposalLifecycle.counts;
  return <main style={{minHeight:'100vh',background:'#050504',color:'#c8c0ad',padding:26,fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace'}}>
    <header style={{display:'flex',justifyContent:'space-between',gap:20,borderBottom:'1px solid rgba(200,169,81,.15)',paddingBottom:18}}><div><span style={{fontSize:8,color:'#8f7a4b'}}>SFI · ROOT / ACP</span><h1 style={{font:'400 30px Georgia,serif',color:'#e2cf9b',margin:'6px 0'}}>GOVERNANCE CONTROL</h1><p style={{font:'13px/1.6 Georgia,serif',color:'#837b6d',maxWidth:900}}>Una autoridad, una máquina de estados. Aprobar diseño no ejecuta; realizar no promueve a canon; conflictos bloquean promoción hasta resolución.</p></div><nav style={{display:'flex',gap:8,alignItems:'flex-start'}}><Link href="/root/decisions" style={{color:'#c6ad69'}}>DECISION INBOX</Link><Link href="/root" style={{color:'#c6ad69'}}>ROOT</Link></nav></header>
    <section style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginTop:16}}>
      <Card label="ACP" value={health.runtime.status.toUpperCase()} detail={health.runtime.blindMode?'BLIND MODE':'AUTHORITY PRESENT'} />
      <Card label="PENDING" value={String(health.sovereignInbox.proposals+health.sovereignInbox.ctDecisions+health.sovereignInbox.reports)} detail="SOVEREIGN INBOX" />
      <Card label="CONFLICTED" value={String(counts.conflicted)} detail="BLOCKS PROMOTION" />
      <Card label="PROMOTION RECEIPTS" value={String(health.receipts.promotions)} detail="AUDITABLE EVENTS" />
    </section>
    <section style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:12,marginTop:14}}>
      <article style={panel}><h2 style={h2}>ACTION PROPOSAL LIFECYCLE</h2>{health.proposalLifecycle.states.map(({state,meaning})=><div key={state} style={{display:'grid',gridTemplateColumns:'170px 70px 1fr',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}><b style={{color:'#bda35c'}}>{state.toUpperCase()}</b><strong>{counts[state]}</strong><span style={{color:'#827a6d',font:'11px/1.4 Georgia,serif'}}>{meaning}</span></div>)}{health.proposalLifecycle.legacyApproved?<p style={{color:'#c18c70'}}>LEGACY `approved`: {health.proposalLifecycle.legacyApproved}. Se normaliza en lectura a DESIGN_APPROVED; ninguna escritura nueva debe producirlo.</p>:null}</article>
      <article style={panel}><h2 style={h2}>CRL PERSISTENCE</h2><strong style={{color:'#c18c70'}}>{health.crl.persistenceDecision}</strong><p style={{color:'#8d8476',font:'12px/1.6 Georgia,serif'}}>{health.crl.boundary}</p><ul>{health.crl.options.map(option=><li key={option} style={{margin:'8px 0',color:'#a99a76'}}>{option}</li>)}</ul><p style={{color:'#716a60',font:'10px/1.5 Georgia,serif'}}>Debe resolverse mediante ROOT/ACP antes de tratar las tablas específicas de CRL como persistencia institucional aprobada.</p></article>
    </section>
    {health.warnings.length?<section style={{...panel,marginTop:12,borderColor:'rgba(173,104,77,.35)'}}><h2 style={h2}>WARNINGS</h2>{health.warnings.map(item=><div key={item} style={{color:'#c18c70',fontSize:9,marginTop:6}}>{item}</div>)}</section>:null}
  </main>;
}

function Card({label,value,detail}:{label:string;value:string;detail:string}) { return <article style={panel}><span style={{fontSize:7,color:'#6d624b'}}>{label}</span><strong style={{display:'block',fontSize:22,color:'#d0b76f',marginTop:6}}>{value}</strong><small style={{color:'#625d54'}}>{detail}</small></article>; }
const panel: React.CSSProperties = {border:'1px solid rgba(200,169,81,.1)',background:'#080807',padding:14};
const h2: React.CSSProperties = {font:'400 16px Georgia,serif',color:'#cfbb89',margin:'0 0 12px'};

import Link from 'next/link';
import { requireRootActor } from '@/lib/root/server';
import { evaluateTotalProof } from '@/lib/root/closure/totalProof';
import { TotalProofControl } from '@/components/root/closure/TotalProofControl';

export const dynamic='force-dynamic';

export default async function RootTotalProofPage(){
  const gate=await requireRootActor('root.total-proof.page');
  if(!gate.ok)return <main style={{padding:24,background:'#050504',color:'#c8c0ad',minHeight:'100vh'}}>ROOT REQUIRED</main>;
  const proof=await evaluateTotalProof();
  return <main style={{minHeight:'100vh',background:'#050504',color:'#c8c0ad',padding:26,fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace'}}>
    <header style={{display:'flex',justifyContent:'space-between',gap:20,borderBottom:'1px solid rgba(200,169,81,.15)',paddingBottom:18}}><div><span style={{fontSize:8,color:'#8f7a4b'}}>SFI · INSTITUTIONAL CLOSURE</span><h1 style={{font:'400 30px Georgia,serif',color:'#e2cf9b',margin:'6px 0'}}>TOTAL PROOF</h1><p style={{font:'13px/1.6 Georgia,serif',color:'#837b6d',maxWidth:930}}>Prueba del circuito existente. No crea datos para pasar. STRUCTURAL prueba aparato; LIVE exige observación/acción real; LONGITUDINAL exige retorno y outcome observados.</p></div><nav style={{display:'flex',gap:10,alignItems:'flex-start'}}><Link href="/root/readiness" style={{color:'#c6ad69'}}>READINESS</Link><Link href="/root/development" style={{color:'#c6ad69'}}>DEVELOPMENT</Link><Link href="/root" style={{color:'#c6ad69'}}>ROOT</Link></nav></header>
    <section style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,marginTop:16}}><Card label="STRUCTURAL" pass={proof.structuralPass}/><Card label="LIVE" pass={proof.livePass}/><Card label="LONGITUDINAL" pass={proof.longitudinalPass}/></section>
    <section style={{display:'grid',gap:8,marginTop:16}}>{proof.stages.map(stage=><article key={stage.id} style={{border:'1px solid rgba(200,169,81,.1)',background:'#080807',padding:14,display:'grid',gridTemplateColumns:'150px 80px 1fr',gap:14}}><strong style={{color:'#cfbb89'}}>{stage.id}</strong><b style={{color:stage.pass?'#7fad83':'#c18c70'}}>{stage.pass?'PASS':'OPEN'}</b><div><div style={{fontSize:8,color:'#817969'}}>EVIDENCE · {stage.evidence.join(' · ')||'—'}</div>{stage.missing.length?<div style={{marginTop:7,fontSize:8,color:'#c18c70'}}>MISSING · {stage.missing.join(' · ')}</div>:null}</div></article>)}</section>
    <section style={{marginTop:14,borderLeft:'2px solid #8f7340',padding:'10px 13px',background:'rgba(200,169,81,.04)'}}><strong style={{fontSize:8,color:'#a4884e'}}>TRUTH BOUNDARY</strong><p style={{color:'#8f8677',font:'11px/1.6 Georgia,serif'}}>{proof.truthBoundary}</p></section>
    {proof.externalGates.length?<section style={{marginTop:14}}><h2 style={{font:'400 16px Georgia,serif',color:'#cfbb89'}}>EXTERNAL GATES</h2>{proof.externalGates.map(gate=><div key={gate} style={{fontSize:8,color:'#8f8677',marginTop:6}}>{gate}</div>)}</section>:null}
    <TotalProofControl/>
  </main>;
}
function Card({label,pass}:{label:string;pass:boolean}){return <article style={{border:'1px solid rgba(200,169,81,.1)',background:'#080807',padding:14}}><span style={{fontSize:7,color:'#645b47'}}>{label}</span><strong style={{display:'block',fontSize:22,color:pass?'#7fad83':'#c18c70',marginTop:5}}>{pass?'PASS':'OPEN'}</strong></article>}

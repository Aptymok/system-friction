import Link from 'next/link';
import { requireRootActor } from '@/lib/root/server';
import { SFI_DEVELOPMENT_REGISTRY, summarizeSfiDevelopmentRegistry } from '@/lib/institutional/developmentRegistry';

export const dynamic = 'force-dynamic';

export default async function RootDevelopmentPage() {
  const gate = await requireRootActor('development.registry.read');
  if (!gate.ok) return <main style={{padding:24,background:'#050504',color:'#c8c0ad',minHeight:'100vh'}}>ROOT REQUIRED</main>;
  const summary = summarizeSfiDevelopmentRegistry();
  const ordered = [...SFI_DEVELOPMENT_REGISTRY].sort((a,b)=>b.maturityEstimate-a.maturityEstimate || a.name.localeCompare(b.name,'es'));
  return <main style={{minHeight:'100vh',background:'#050504',color:'#c8c0ad',padding:26,fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace'}}>
    <header style={{display:'flex',justifyContent:'space-between',gap:20,borderBottom:'1px solid rgba(200,169,81,.15)',paddingBottom:18}}>
      <div><span style={{fontSize:8,color:'#8f7a4b'}}>SFI · ROOT · DEVELOPMENT CONTROL</span><h1 style={{font:'400 30px Georgia,serif',color:'#e2cf9b',margin:'6px 0'}}>METHODS / PRODUCTS / PROGRAMS REGISTRY</h1><p style={{font:'13px/1.6 Georgia,serif',color:'#837b6d',maxWidth:960}}>Registro maestro de desarrollo. El porcentaje es una estimación de madurez para planificación; no es probabilidad de verdad, validación científica ni autorización de producto.</p></div>
      <nav style={{display:'flex',gap:10,alignItems:'flex-start'}}><Link href="/root/readiness" style={{color:'#c6ad69'}}>READINESS</Link><Link href="/root/governance" style={{color:'#c6ad69'}}>GOVERNANCE</Link><Link href="/root" style={{color:'#c6ad69'}}>ROOT</Link></nav>
    </header>
    <section style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginTop:16}}><Card label="TOTAL" value={String(summary.total)} /><Card label="PRODUCTS" value={String(summary.byClass.PRODUCT)} /><Card label="LAB ONLY" value={String(summary.byClass.LAB_ONLY)} /><Card label="ABSORBED / ARCHIVED" value={String((summary.byClass.ABSORBED??0)+(summary.byClass.ARCHIVED??0))} /></section>
    <section style={{marginTop:16,display:'grid',gap:8}}>{ordered.map(item=><article key={item.id} style={{border:'1px solid rgba(200,169,81,.1)',background:'#080807',padding:14,display:'grid',gridTemplateColumns:'minmax(230px,.8fr) minmax(320px,1.4fr) 100px',gap:16}}><div><span style={{fontSize:7,color:'#806d42'}}>{item.classification} · {item.state}</span><h2 style={{font:'400 17px Georgia,serif',color:'#cfbb89',margin:'6px 0'}}>{item.name}</h2><strong style={{color:'#bda35c',fontSize:9}}>{item.product}</strong></div><div><p style={{margin:'0 0 7px',color:'#948a78',font:'11px/1.5 Georgia,serif'}}>{item.purpose}</p><div style={{fontSize:8,color:'#71695d'}}>IMPLEMENTATION · {item.implementation}</div><div style={{marginTop:7,fontSize:8,color:'#aa8d50'}}>NEXT GATE · {item.nextGate}</div>{item.absorbedInto?.length?<div style={{marginTop:7,fontSize:8,color:'#6f675b'}}>ABSORBED INTO · {item.absorbedInto.join(' · ')}</div>:null}</div><div style={{textAlign:'right'}}><span style={{fontSize:7,color:'#625b4c'}}>MATURITY EST.</span><strong style={{display:'block',fontSize:24,color:'#d0b76f',marginTop:4}}>{item.maturityEstimate}%</strong></div></article>)}</section>
  </main>;
}
function Card({label,value}:{label:string;value:string}){return <article style={{border:'1px solid rgba(200,169,81,.1)',background:'#080807',padding:13}}><span style={{fontSize:7,color:'#645b47'}}>{label}</span><strong style={{display:'block',fontSize:22,color:'#d0b76f',marginTop:5}}>{value}</strong></article>}

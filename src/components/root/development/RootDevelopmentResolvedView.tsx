import Link from 'next/link';
import { SFI_RESOLVED_DEVELOPMENT_REGISTRY } from '@/lib/institutional/resolvedDevelopmentRegistry';

export function RootDevelopmentResolvedView(){
  const platform=SFI_RESOLVED_DEVELOPMENT_REGISTRY.filter(item=>['PRODUCT','INFRASTRUCTURE'].includes(item.classification));
  const research=SFI_RESOLVED_DEVELOPMENT_REGISTRY.filter(item=>['PROGRAM','LAB_ONLY'].includes(item.classification));
  const history=SFI_RESOLVED_DEVELOPMENT_REGISTRY.filter(item=>['ABSORBED','ARCHIVED'].includes(item.classification));
  const blocking=platform.filter(item=>['IN_DEVELOPMENT','GATED'].includes(item.state));
  return <main style={page}>
    <header style={header}><div><span style={eyebrow}>SFI · ROOT · DEVELOPMENT CONTROL</span><h1 style={h1}>DESARROLLO ≠ VALIDACIÓN</h1><p style={lead}>Estado resuelto contra implementación ejecutable. Investigación, calibración, publicación y replicación permanecen visibles, pero ya no se cuentan como código faltante.</p></div><nav style={nav}><Link href="/root" style={link}>OPERAR</Link><Link href="/root/readiness" style={link}>READINESS</Link><Link href="/root/overview" style={link}>VISTA TÉCNICA</Link></nav></header>
    <section style={summary}><Stat label="PLATAFORMA" value={`${platform.length-blocking.length}/${platform.length}`} note="productos + infraestructura cableados"/><Stat label="CONSTRUCCIÓN PENDIENTE" value={String(blocking.length)} note="único número que bloquea desarrollo"/><Stat label="INVESTIGACIÓN" value={String(research.length)} note="no bloquea software"/><Stat label="GENEALOGÍA" value={String(history.length)} note="absorbido / archivado"/></section>
    <Group title="A · CONSTRUCCIÓN NÚCLEO PENDIENTE" description="Sólo faltantes ejecutables reales.">{blocking.length?blocking.map(item=><Entry key={item.id} item={item} tone="build"/>):<div style={empty}>0 frentes núcleo de construcción pendientes.</div>}</Group>
    <Group title="B · PLATAFORMA IMPLEMENTADA" description="Puede requerir casos y validación sin volver a ser desarrollo faltante.">{platform.filter(item=>!blocking.includes(item)).map(item=><Entry key={item.id} item={item} tone="ready"/>)}</Group>
    <Group title="C · INVESTIGACIÓN / LABORATORIO" description="Hipótesis, programas y benchmarks; fuera del denominador de cierre de plataforma.">{research.map(item=><Entry key={item.id} item={item} tone="research"/>)}</Group>
    <Group title="D · ABSORBIDO / ARCHIVADO" description="Su cierre correcto es genealogía, no llevarlos artificialmente a 100%.">{history.map(item=><Entry key={item.id} item={item} tone="history"/>)}</Group>
  </main>
}
function Group({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <section style={{marginTop:32}}><header style={{borderBottom:'1px solid #d7d1c4',paddingBottom:10}}><h2 style={{font:'400 23px Georgia,serif',margin:'0 0 5px'}}>{title}</h2><p style={{margin:0,color:'#777166',font:'13px/1.5 Georgia,serif'}}>{description}</p></header><div style={{display:'grid',gap:8,marginTop:10}}>{children}</div></section>}
function Entry({item,tone}:{item:any;tone:'build'|'ready'|'research'|'history'}){const color=tone==='build'?'#8b4f3f':tone==='ready'?'#4e7057':tone==='research'?'#8c6e2c':'#777166';return <article style={entry}><div><span style={{fontSize:9,letterSpacing:'.1em',color}}>{item.classification} · {item.state}</span><h3 style={{font:'400 18px Georgia,serif',margin:'7px 0 4px'}}>{item.name}</h3><b style={{fontSize:10,color:'#8a712f'}}>{item.product}</b></div><div><p style={{margin:'0 0 8px',font:'13px/1.5 Georgia,serif',color:'#5e5a52'}}>{item.purpose}</p><p style={small}><b>IMPLEMENTADO · </b>{item.implementation}</p><p style={{...small,color:'#8a712f'}}><b>SIGUIENTE UMBRAL · </b>{item.nextGate}</p></div></article>}
function Stat({label,value,note}:{label:string;value:string;note:string}){return <article style={stat}><span style={eyebrow}>{label}</span><strong style={{display:'block',font:'400 32px Georgia,serif',margin:'6px 0'}}>{value}</strong><small style={{color:'#777166'}}>{note}</small></article>}
const page={minHeight:'100vh',background:'#f2f0e9',color:'#24231f',padding:28,fontFamily:'Inter,ui-sans-serif,system-ui,sans-serif'} as const;
const header={display:'flex',justifyContent:'space-between',gap:30,borderBottom:'1px solid #cfc8ba',paddingBottom:20} as const;
const nav={display:'flex',gap:14,flexWrap:'wrap' as const} as const;
const eyebrow={fontSize:9,color:'#8a712f',letterSpacing:'.14em'} as const;
const h1={font:'400 38px Georgia,serif',margin:'7px 0'} as const;
const lead={font:'15px/1.55 Georgia,serif',color:'#777166',maxWidth:900,margin:0} as const;
const summary={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginTop:18} as const;
const stat={border:'1px solid #d7d1c4',background:'#fbfaf6',padding:16} as const;
const entry={display:'grid',gridTemplateColumns:'minmax(220px,.8fr) minmax(320px,1.5fr)',gap:24,border:'1px solid #d7d1c4',background:'#fbfaf6',padding:16} as const;
const small={fontSize:10,lineHeight:1.5,color:'#777166',margin:'6px 0'} as const;
const empty={border:'1px solid #c9d7c8',background:'#eef4ed',padding:18,color:'#4e7057'} as const;
const link={color:'#725c27',fontSize:10,letterSpacing:'.08em'} as const;

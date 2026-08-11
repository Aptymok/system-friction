import Link from 'next/link';
import { requireRootActor } from '@/lib/root/server';
import { SFI_DEVELOPMENT_REGISTRY } from '@/lib/institutional/developmentRegistry';

export const dynamic = 'force-dynamic';

export default async function RootDevelopmentPage() {
  const gate = await requireRootActor('development.registry.read');
  if (!gate.ok) return <main style={{padding:24}}>ROOT REQUIRED</main>;

  const platform = SFI_DEVELOPMENT_REGISTRY.filter(item=>['PRODUCT','INFRASTRUCTURE'].includes(item.classification));
  const research = SFI_DEVELOPMENT_REGISTRY.filter(item=>['PROGRAM','LAB_ONLY'].includes(item.classification));
  const history = SFI_DEVELOPMENT_REGISTRY.filter(item=>['ABSORBED','ARCHIVED'].includes(item.classification));
  const activeDevelopment = platform.filter(item=>['IN_DEVELOPMENT','GATED'].includes(item.state));
  const platformImplemented = platform.length-activeDevelopment.length;

  return <main style={page}>
    <header style={header}>
      <div><span style={eyebrow}>SFI · ROOT · DEVELOPMENT CONTROL</span><h1 style={h1}>DESARROLLO ≠ VALIDACIÓN</h1><p style={lead}>Esta vista ya no usa porcentajes editoriales como si fueran avance de software. Separa lo que falta construir de lo que necesita evidencia científica y de lo que ya fue absorbido o archivado.</p></div>
      <nav style={{display:'flex',gap:14,flexWrap:'wrap'}}><Link href="/root" style={link}>OPERAR</Link><Link href="/root/readiness" style={link}>READINESS</Link><Link href="/root/overview" style={link}>VISTA TÉCNICA</Link></nav>
    </header>

    <section style={summaryGrid}>
      <Card label="PLATAFORMA" value={`${platformImplemented}/${platform.length}`} note="sin trabajo de construcción explícito" />
      <Card label="DESARROLLO ACTIVO" value={String(activeDevelopment.length)} note="sí bloquea cierre de plataforma" />
      <Card label="INVESTIGACIÓN" value={String(research.length)} note="no bloquea cierre de software" />
      <Card label="GENEALOGÍA" value={String(history.length)} note="absorbido / archivado; fuera del denominador" />
    </section>

    <Section title="A · LO QUE SÍ FALTA CONSTRUIR" description="Sólo productos o infraestructura cuyo propio registro todavía declara desarrollo o compuerta pendiente.">
      {activeDevelopment.length?activeDevelopment.map(item=><Item key={item.id} item={item} mode="build"/>):<Empty text="No hay desarrollo núcleo pendiente en el registro."/>}
    </Section>

    <Section title="B · PLATAFORMA IMPLEMENTADA" description="Puede seguir necesitando casos, calibración o validación; eso no significa que falte código de plataforma.">
      {platform.filter(item=>!activeDevelopment.includes(item)).map(item=><Item key={item.id} item={item} mode="implemented"/>)}
    </Section>

    <Section title="C · INVESTIGACIÓN / LABORATORIO" description="Aquí puede existir software completo mientras la hipótesis siga experimental. No entra en el porcentaje de cierre de plataforma.">
      {research.map(item=><Item key={item.id} item={item} mode="research"/>)}
    </Section>

    <Section title="D · ABSORBIDO / ARCHIVADO" description="No se desarrolla hasta 100%. Su cierre correcto consiste en conservar genealogía y evitar que vuelva a operar como sistema paralelo.">
      {history.map(item=><Item key={item.id} item={item} mode="history"/>)}
    </Section>
  </main>;
}

function Section({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <section style={{marginTop:34}}><header style={{borderBottom:'1px solid #d7d1c4',paddingBottom:12}}><h2 style={{font:'400 24px Georgia,serif',margin:'0 0 6px'}}>{title}</h2><p style={{margin:0,color:'#777166',font:'13px/1.5 Georgia,serif'}}>{description}</p></header><div style={{display:'grid',gap:8,marginTop:10}}>{children}</div></section>}
function Item({item,mode}:{item:any;mode:'build'|'implemented'|'research'|'history'}){const tone=mode==='build'?'#8b4f3f':mode==='implemented'?'#4e7057':mode==='research'?'#8c6e2c':'#777166';return <article style={{display:'grid',gridTemplateColumns:'minmax(220px,.8fr) minmax(320px,1.5fr)',gap:24,border:'1px solid #d7d1c4',background:'#fbfaf6',padding:16}}><div><span style={{fontSize:9,letterSpacing:'.1em',color:tone}}>{item.classification} · {item.state}</span><h3 style={{font:'400 18px Georgia,serif',margin:'7px 0 4px'}}>{item.name}</h3><b style={{fontSize:10,color:'#8a712f'}}>{item.product}</b></div><div><p style={{margin:'0 0 8px',font:'13px/1.5 Georgia,serif',color:'#5e5a52'}}>{item.purpose}</p><div style={{fontSize:10,lineHeight:1.5,color:'#777166'}}><b>IMPLEMENTADO · </b>{item.implementation}</div><div style={{fontSize:10,lineHeight:1.5,color:mode==='build'?'#8b4f3f':'#8a712f',marginTop:6}}><b>SIGUIENTE UMBRAL · </b>{item.nextGate}</div>{item.absorbedInto?.length?<div style={{fontSize:10,color:'#777166',marginTop:6}}>ABSORBIDO EN · {item.absorbedInto.join(' · ')}</div>:null}</div></article>}
function Card({label,value,note}:{label:string;value:string;note:string}){return <article style={{border:'1px solid #d7d1c4',background:'#fbfaf6',padding:16}}><span style={{fontSize:9,letterSpacing:'.12em',color:'#8a712f'}}>{label}</span><strong style={{display:'block',font:'400 34px Georgia,serif',margin:'6px 0'}}>{value}</strong><small style={{color:'#777166'}}>{note}</small></article>}
function Empty({text}:{text:string}){return <div style={{border:'1px dashed #c8c1b3',padding:20,color:'#777166'}}>{text}</div>}
const page={minHeight:'100vh',background:'#f2f0e9',color:'#24231f',padding:28,fontFamily:'Inter,ui-sans-serif,system-ui,sans-serif'} as const;
const header={display:'flex',justifyContent:'space-between',gap:30,borderBottom:'1px solid #cfc8ba',paddingBottom:20} as const;
const eyebrow={fontSize:9,color:'#8a712f',letterSpacing:'.15em'} as const;
const h1={font:'400 38px Georgia,serif',margin:'7px 0'} as const;
const lead={font:'15px/1.55 Georgia,serif',color:'#777166',maxWidth:900,margin:0} as const;
const summaryGrid={display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginTop:18} as const;
const link={color:'#725c27',fontSize:10,letterSpacing:'.08em'} as const;

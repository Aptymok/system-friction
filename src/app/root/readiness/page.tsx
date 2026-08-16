import Link from 'next/link';
import { RootDevelopmentResolvedView } from '@/components/root/development/RootDevelopmentResolvedView';
import { ContinuityConsole } from '@/components/root/continuity/ContinuityConsole';
import { InstitutionalContractsConsole } from '@/components/root/contracts/InstitutionalContractsConsole';
import { TotalProofControl } from '@/components/root/closure/TotalProofControl';
import { readContinuityDashboard } from '@/lib/continuity/runtime';
import { readInstitutionalReadiness } from '@/lib/root/closure/readInstitutionalReadiness';
import { evaluateTotalProof } from '@/lib/root/closure/totalProof';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic='force-dynamic';

async function readContinuitySafe(){
  try {
    const observed=await readContinuityDashboard();
    return {...observed,errors:observed.errors.filter((item):item is string=>typeof item==='string')};
  } catch(error) {
    return {state:{mode:'UNAVAILABLE'},runs:[],checks:[],incidents:[],decisions:[],reports:[],errors:[error instanceof Error?error.message:String(error)]};
  }
}

export default async function RootReadinessPage(){
  const gate=await requireRootViewer('root.readiness.page');
  if(!gate.ok)return <main style={{padding:24}}>ROOT VIEWER REQUIRED</main>;

  const model=await readInstitutionalReadiness();
  const isRoot=gate.ctx.isRoot;
  const [proof,continuity]=isRoot?await Promise.all([evaluateTotalProof(),readContinuitySafe()]):[null,null];
  const operational=model.modules.filter(m=>m.state==='OPERATIONAL').length;
  const ready=model.modules.filter(m=>m.state==='READY').length;
  const degraded=model.modules.filter(m=>m.state==='DEGRADED').length;
  const gated=model.modules.filter(m=>m.state==='GATED').length;

  return <main style={page}>
    <header style={header}><div><span style={eyebrow}>SFI · READINESS · CIERRE TÉCNICO</span><h1 style={h1}>¿Puede operar SFI?</h1><p style={lead}>Un solo dueño para cierre de plataforma, continuidad, contratos y prueba total. <b>READY</b> significa que el órgano existe y puede empezar limpio; <b>OPERATIONAL</b> significa que además tiene ejecución observada. Sólo DEGRADED/GATED bloquea cierre de runtime.</p></div><nav style={{display:'flex',gap:14,flexWrap:'wrap'}}><Link href="/root" style={link}>ROOT</Link></nav></header>

    <section style={summary}>
      <Card label="ESTRUCTURA" value={model.structuralComplete?'COMPLETA':'INCOMPLETA'} tone={model.structuralComplete?'ok':'bad'}/>
      <Card label="RUNTIME" value={model.runtimeOperational?'OPERABLE':'BLOQUEADO'} tone={model.runtimeOperational?'ok':'bad'}/>
      <Card label="OPERANDO" value={String(operational)} tone="ok"/>
      <Card label="LISTO · VACÍO" value={String(ready)} tone="neutral"/>
      <Card label="DEGRADADO" value={String(degraded)} tone={degraded?'warn':'neutral'}/>
      <Card label="GATED" value={String(gated)} tone={gated?'bad':'neutral'}/>
    </section>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:10,marginTop:18}}>
      {model.modules.map(module=><article key={module.id} style={{...moduleCard,borderTop:`3px solid ${tone(module.state)}`}}><header style={{display:'flex',justifyContent:'space-between',gap:18}}><div><span style={eyebrow}>{module.id.replaceAll('_',' ')}</span><h2 style={{font:'400 20px Georgia,serif',margin:'5px 0'}}>{module.label}</h2></div><b style={{fontSize:10,color:tone(module.state)}}>{module.state}</b></header><p style={{font:'12px/1.5 Georgia,serif',color:'#716c63'}}>{module.observed?'Tiene actividad real observada.':'Está vacío o todavía no tiene corrida calificante.'}</p>{module.blockers.length?<div style={blockerBox}><b>QUÉ LO BLOQUEA</b>{module.blockers.map(blocker=><p key={blocker}>{human(blocker)}</p>)}</div>:<div style={cleanBox}>SIN BLOQUEADOR INTERNO</div>}{module.nextAction?<p style={{font:'11px/1.5 Georgia,serif',color:'#795f24'}}><b>SIGUIENTE · </b>{module.nextAction}</p>:null}<details style={{marginTop:10}}><summary style={{fontSize:9,color:'#795f24',cursor:'pointer'}}>DETALLE TÉCNICO</summary><pre style={{whiteSpace:'pre-wrap',fontSize:8,color:'#777166',overflow:'auto'}}>{JSON.stringify({evidence:module.evidence,externalGates:module.externalGates??[]},null,2)}</pre></details></article>)}
    </section>

    <section style={{marginTop:18,border:'1px solid #d6d0c3',background:'#fbfaf6',padding:18}}><h2 style={{font:'400 20px Georgia,serif',margin:'0 0 8px'}}>Límite del 100% de desarrollo</h2><p style={{font:'13px/1.6 Georgia,serif',color:'#716c63',margin:0}}>SFI puede llegar a <b>100% de desarrollo de plataforma</b> con investigación todavía abierta. La validación científica permanece separada: {model.definition.scientificBoundary}</p>{model.blockers.length?<p style={{fontSize:11,color:'#8a4e3e'}}><b>{model.blockers.length} BLOQUEADORES INTERNOS REALES</b> — deben quedar en cero antes de declarar el runtime operable.</p>:<p style={{fontSize:11,color:'#4e7057'}}><b>0 BLOQUEADORES INTERNOS</b> — el runtime puede estar operativo incluso con tablas limpias y vacías.</p>}</section>

    {isRoot&&proof&&continuity?<section style={{marginTop:26,display:'grid',gap:10}}>
      <details style={closureDetails}><summary style={closureSummary}>DESARROLLO · REGISTRO RESUELTO</summary><RootDevelopmentResolvedView/></details>
      <details style={closureDetails}><summary style={closureSummary}>CONTINUIDAD · ESTADO Y CONTROL</summary><ContinuityConsole initial={continuity}/></details>
      <details style={closureDetails}><summary style={closureSummary}>CONTRATOS · ANCLAS DE RUNTIME</summary><InstitutionalContractsConsole/></details>
      <details style={closureDetails}><summary style={closureSummary}>TOTAL PROOF · PRUEBA DEL CIRCUITO</summary><section style={proofPanel}><div style={proofGrid}><ProofCard label="STRUCTURAL" pass={proof.structuralPass}/><ProofCard label="LIVE" pass={proof.livePass}/><ProofCard label="LONGITUDINAL" pass={proof.longitudinalPass}/></div><div style={{display:'grid',gap:8,marginTop:14}}>{proof.stages.map(stage=><article key={stage.id} style={proofStage}><strong>{stage.id}</strong><b style={{color:stage.pass?'#7fad83':'#c18c70'}}>{stage.pass?'PASS':'OPEN'}</b><div><div>EVIDENCE · {stage.evidence.join(' · ')||'—'}</div>{stage.missing.length?<div style={{color:'#c18c70',marginTop:5}}>MISSING · {stage.missing.join(' · ')}</div>:null}</div></article>)}</div><p style={{color:'#8f8677',font:'11px/1.6 Georgia,serif'}}><b>TRUTH BOUNDARY · </b>{proof.truthBoundary}</p>{proof.externalGates.length?<div style={{fontSize:9,color:'#8f8677'}}>EXTERNAL GATES · {proof.externalGates.join(' · ')}</div>:null}<TotalProofControl/></section></details>
    </section>:<section style={{marginTop:20,border:'1px solid #d6d0c3',padding:14,color:'#777166',fontSize:10}}>Las capas de continuidad, contratos, desarrollo resuelto y Total Proof requieren autoridad ROOT. La lectura de readiness permanece observable sin exponer controles constitutivos.</section>}
  </main>;
}

function human(value:string){return value.replaceAll('_',' ').replaceAll(':',' · ')}
function tone(state:string){return state==='OPERATIONAL'?'#4e7057':state==='READY'?'#867646':state==='DEGRADED'?'#a2663e':'#8a4e3e'}
function Card({label,value,tone:kind}:{label:string;value:string;tone:'ok'|'warn'|'bad'|'neutral'}){const color=kind==='ok'?'#4e7057':kind==='warn'?'#a2663e':kind==='bad'?'#8a4e3e':'#777166';return <article style={{border:'1px solid #d6d0c3',background:'#fbfaf6',padding:14}}><span style={{fontSize:8,letterSpacing:'.12em',color:'#8a712f'}}>{label}</span><strong style={{display:'block',font:'400 20px Georgia,serif',color,marginTop:6}}>{value}</strong></article>}
function ProofCard({label,pass}:{label:string;pass:boolean}){return <article style={{border:'1px solid rgba(200,169,81,.1)',background:'#080807',padding:14}}><span style={{fontSize:7,color:'#645b47'}}>{label}</span><strong style={{display:'block',fontSize:22,color:pass?'#7fad83':'#c18c70',marginTop:5}}>{pass?'PASS':'OPEN'}</strong></article>}
const page={minHeight:'100vh',background:'#f2f0e9',color:'#24231f',padding:28,fontFamily:'Inter,ui-sans-serif,system-ui,sans-serif'} as const;
const header={display:'flex',justifyContent:'space-between',gap:30,borderBottom:'1px solid #cfc8ba',paddingBottom:20} as const;
const eyebrow={fontSize:9,color:'#8a712f',letterSpacing:'.14em',textTransform:'uppercase' as const} as const;
const h1={font:'400 42px Georgia,serif',margin:'7px 0'} as const;
const lead={font:'15px/1.55 Georgia,serif',color:'#716c63',maxWidth:920,margin:0} as const;
const summary={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8,marginTop:18} as const;
const moduleCard={border:'1px solid #d6d0c3',background:'#fbfaf6',padding:16,minHeight:220} as const;
const blockerBox={border:'1px solid #d7b6a7',background:'#f6e9e3',padding:'10px 12px',fontSize:9,color:'#7d4739'} as const;
const cleanBox={border:'1px solid #c9d7c8',background:'#eef4ed',padding:'10px 12px',fontSize:9,color:'#4e7057'} as const;
const link={color:'#725c27',fontSize:10,letterSpacing:'.08em'} as const;
const closureDetails={border:'1px solid #cfc8ba',background:'#fbfaf6'} as const;
const closureSummary={cursor:'pointer',padding:'13px 15px',fontSize:10,letterSpacing:'.1em',color:'#725c27'} as const;
const proofPanel={background:'#050504',color:'#c8c0ad',padding:18,fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace'} as const;
const proofGrid={display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8} as const;
const proofStage={border:'1px solid rgba(200,169,81,.1)',background:'#080807',padding:12,display:'grid',gridTemplateColumns:'150px 70px 1fr',gap:12,fontSize:9} as const;

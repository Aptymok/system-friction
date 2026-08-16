import { CognitiveTwinExperimentControls } from './CognitiveTwinExperimentControls';

type Props = {
  legacy: any;
  lineage?: any;
  experiments?: any;
  mutations?: any;
  journal?: any;
};

export function CognitiveTwinArchaeologyPanel({ legacy, lineage, experiments, mutations, journal }: Props) {
  const lineageSummary=(legacy.lineage??{}) as Record<string,unknown>;
  const mutationSummary=(legacy.mutations??{}) as Record<string,unknown>;
  const founderDetails=Boolean(lineage&&experiments&&mutations&&journal);

  return <section style={shell}>
    <header style={header}>
      <div><span style={eyebrow}>COGNITIVE TWIN · ARCHAEOLOGICAL CONTINUITY</span><h2 style={title}>Memoria longitudinal de SFI</h2><p style={lead}>El Twin arqueológico no se conserva como producto paralelo. Sus funciones viven dentro del Cognitive Twin actual: memoria, timeline, lineage, journal, snapshots, forks, mutación gobernada y metaobservación.</p></div>
      <div style={statusBadge}><small>TRANSPORTE LEGACY</small><strong>{legacy.softwareComplete?'COMPLETO':'INCOMPLETO'}</strong><span>{legacy.missingCapabilities.length?`${legacy.missingCapabilities.length} capacidad(es) faltantes`:'0 funciones retenidas faltantes'}</span></div>
    </header>

    <section style={metrics}>
      <Metric label="TIMELINE" value={legacy.timeline.events.length} note="eventos recuperados"/>
      <Metric label="RUNS OBSERVADOS" value={legacy.operatingMode.total} note="distribución operativa"/>
      <Metric label="LINEAGE" value={String(lineageSummary.chainIntegrity??'—')} note="provenance CT-A01"/>
      <Metric label="MUTACIÓN" value={String(mutationSummary.available??false)==='true'?'DISPONIBLE':'SIN ESTADO'} note="siempre gobernada"/>
    </section>

    <section style={flowGrid}>
      <Flow label="MUNDO" value="Observatory" note="contexto externo con procedencia"/>
      <Flow label="EXPERIENCIA" value="Evidence · Studio · Method Lab · Field" note="observado, derivado y simulado permanecen separados"/>
      <article style={core}><span>COGNITIVE TWIN</span><strong>MEMORIA + METAOBSERVACIÓN</strong><small>aparato persistente; el modelo es sustrato reemplazable</small></article>
      <Flow label="SUJETO" value="CT-A01" note="lineage · journal · snapshots · forks"/>
      <Flow label="AUTORIDAD" value="ROOT / ACP" note="aprendizaje no amplía permisos"/>
    </section>
    <div style={flowLine}>OBSERVAR → RECORDAR → CONTRASTAR → APRENDER → DELIBERAR → GOBERNAR → VOLVER A OBSERVAR</div>

    <details style={details} open><summary style={summary}>ARQUITECTURA RECUPERADA · {legacy.capabilities.length} CAPACIDADES</summary><div style={capabilityGrid}>{legacy.capabilities.map((capability:any,index:number)=><article key={capability.id} style={{...card,borderColor:capability.status==='MISSING'?'#9d6552':'#353128'}}><span style={eyebrow}>{String(index+1).padStart(2,'0')} · {capability.status}</span><h3 style={subheading}>{human(capability.id)}</h3><p style={muted}>{capability.boundary}</p><details><summary style={innerSummary}>DÓNDE VIVE AHORA</summary>{capability.currentImplementation.map((item:string)=><code key={item} style={code}>{item}</code>)}</details></article>)}</div></details>

    <details style={details}><summary style={summary}>METAOBSERVADOR · ÓRGANOS OBSERVABLES</summary><div style={organGrid}>{legacy.metaObservation.organs.map((organ:any)=><article key={organ.id} style={card}><span style={eyebrow}>{human(organ.id)}</span><strong style={{display:'block',fontSize:17,margin:'7px 0',color:tone(organ.state)}}>{organ.state}</strong><small style={muted}>{organ.observed?'CON EJECUCIÓN':'LISTO / SIN EJECUCIÓN'}</small>{organ.blockers?.length?<p style={{...muted,color:'#c18c70'}}>{organ.blockers.length} bloqueo(s)</p>:null}</article>)}</div></details>

    <details style={details}><summary style={summary}>TIMELINE INSTITUCIONAL · ÚLTIMOS EVENTOS</summary><div style={{display:'grid',gap:7}}>{legacy.timeline.events.slice(-18).reverse().map((event:any)=><article key={`${event.kind}-${event.id}`} style={timelineRow}><time>{new Date(event.at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'})}</time><b>{event.kind}</b><span>{event.source}</span><p>{event.summary??'Sin resumen persistido'}</p><small>{event.evidenceRefs.length} evidencia(s)</small></article>)}{!legacy.timeline.events.length?<div style={empty}>LISTO · VACÍO. El primer ciclo integrado iniciará la nueva biografía institucional.</div>:null}</div></details>

    {founderDetails?<>
      <details style={details}><summary style={summary}>CT-A01 · LINEAGE, SNAPSHOTS, FORKS Y MUTACIÓN</summary><section style={darkPanel}><div style={lineageGrid}><MetricDark label="SUBJECT" value={lineage.subjectId}/><MetricDark label="LINEAGE" value={lineage.lineageId}/><MetricDark label="GENESIS" value={lineage.genesisPresent?'PRESENT':'MISSING'}/><MetricDark label="CHAIN INTEGRITY" value={lineage.chainIntegrity}/><MetricDark label="SEALED EPOCHS" value={lineage.eventCount}/><MetricDark label="MATERIAL EPOCHS" value={lineage.materialEventCount}/><MetricDark label="PROSPECTIVE VALIDATION" value={lineage.prospectiveValidation}/><MetricDark label="INDIVIDUATION DEMONSTRATED" value={lineage.individuationDemonstrated?'TRUE':'FALSE'}/><MetricDark label="SNAPSHOTS" value={experiments.snapshots.length}/><MetricDark label="REGISTERED FORKS" value={experiments.forks.length}/><MetricDark label="UNRESOLVED MUTATIONS" value={mutations.available?mutations.unresolved:'DEGRADED'}/></div><div style={{marginTop:18}}><span style={eyebrow}>HEAD HASH</span><code style={{...code,overflowWrap:'anywhere'}}>{lineage.headHash??'NO DEVELOPMENTAL HEAD YET'}</code></div><CognitiveTwinExperimentControls snapshots={experiments.snapshots}/>{experiments.forks.length?<div style={{marginTop:20}}><span style={eyebrow}>REGISTERED FORKS</span>{experiments.forks.slice(0,20).map((fork:any,index:number)=><article key={String(fork.taskId??fork.forkHash??fork.childSubjectId??index)} style={darkRow}><strong>{fork.childSubjectId??'UNKNOWN CHILD'}</strong><small>{fork.executionState??'UNKNOWN'} · parent {fork.parentSnapshotHash??'—'}</small></article>)}</div>:null}{mutations.proposals.length?<div style={{marginTop:20}}><span style={eyebrow}>SUBJECT MUTATION PROPOSALS</span>{mutations.proposals.slice(0,20).map((row:any)=><article key={String(row.id)} style={darkRow}><strong>{String(row.decision_id??'UNKNOWN')}</strong><small>{String(row.status??'UNKNOWN')} · {String(row.general_rule??'—')}</small></article>)}</div>:null}<div style={{marginTop:20}}><span style={eyebrow}>LIMITATIONS</span><ul style={{color:'#9e9682',lineHeight:1.7}}>{lineage.limitations.map((item:string)=><li key={item}>{item}</li>)}{mutations.warning?<li>{mutations.warning}</li>:null}</ul></div></section></details>

      <details style={details}><summary style={summary}>CT-A01 · JOURNAL · {journal.entries.length} ENTRIES</summary><section style={darkPanel}><p style={{color:'#9e9682',lineHeight:1.6}}>Resumen auditable de epochs de desarrollo. WITHHOLD no oculta entradas a ROOT. No se persiste private chain-of-thought y un self-report computacional no constituye evidencia de experiencia fenomenal.</p><div style={{fontSize:10,color:'#8d7b4d'}}>{journal.visibilityRule}</div><div style={{display:'grid',gap:10,marginTop:16}}>{journal.entries.length===0?<div style={darkRow}>No developmental epoch has been observed in storage yet.</div>:null}{journal.entries.map((entry:any)=><article key={entry.eventHash} style={darkRow}><div style={{display:'flex',gap:10,flexWrap:'wrap',fontSize:9,color:'#8d7b4d'}}><span>{entry.epochKey}</span><span>{entry.trigger}</span><span>{entry.disposition}</span><span>{entry.materialDevelopment?'MATERIAL':'NON-MATERIAL'}</span></div><p style={{color:'#e2d8bd',lineHeight:1.55}}>{entry.selfReport}</p><p style={{color:'#9e9682',lineHeight:1.5}}>{entry.dispositionReason}</p><div style={{fontSize:9,color:'#8d7b4d'}}>SALIENCE {entry.salience.total.toFixed(3)} · MUTATION {entry.mutation.status} · {entry.createdAt}</div><details style={{marginTop:10}}><summary style={innerSummary}>PROVENANCE</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',color:'#8f8774',fontSize:9}}>{JSON.stringify({eventHash:entry.eventHash,parentEventHash:entry.parentEventHash,observedContext:entry.observedContext,whatWouldChangeDecision:entry.whatWouldChangeDecision,evidenceRefs:entry.evidenceRefs},null,2)}</pre></details></article>)}</div></section></details>
    </>:null}

    <footer style={{marginTop:16,paddingTop:12,borderTop:'1px solid #d4cec1',font:'11px/1.5 Georgia,serif',color:'#777166'}}>{legacy.boundary}</footer>
  </section>;
}

function human(value:string){return value.replaceAll('_',' ').toUpperCase()}
function tone(state:string){return state==='OPERATIONAL'?'#4e7057':state==='READY'?'#8b7839':'#a15f49'}
function Metric({label,value,note}:{label:string;value:string|number;note:string}){return <article style={metric}><span style={eyebrow}>{label}</span><strong style={{display:'block',font:'400 22px Georgia,serif',margin:'6px 0'}}>{value}</strong><small style={muted}>{note}</small></article>}
function MetricDark({label,value}:{label:string;value:any}){return <article style={darkMetric}><span style={eyebrow}>{label}</span><strong style={{display:'block',marginTop:7,color:'#e8dfc5',overflowWrap:'anywhere'}}>{value??'—'}</strong></article>}
function Flow({label,value,note}:{label:string;value:string;note:string}){return <article style={flowCard}><span style={eyebrow}>{label}</span><strong style={{display:'block',font:'400 17px Georgia,serif',margin:'6px 0'}}>{value}</strong><small style={muted}>{note}</small></article>}
const shell={background:'#f2f0e9',color:'#24231f',padding:'26px 28px 56px',fontFamily:'Inter,ui-sans-serif,system-ui,sans-serif'} as const;
const header={display:'flex',justifyContent:'space-between',gap:24,borderTop:'1px solid #d4cec1',borderBottom:'1px solid #d4cec1',padding:'22px 0'} as const;
const eyebrow={fontSize:9,color:'#8b712d',letterSpacing:'.14em'} as const;
const title={font:'400 34px Georgia,serif',margin:'7px 0'} as const;
const lead={font:'14px/1.55 Georgia,serif',color:'#716c63',maxWidth:880,margin:0} as const;
const muted={fontSize:9,color:'#777166',lineHeight:1.45} as const;
const statusBadge={border:'1px solid #d4cec1',background:'#fbfaf6',padding:14,minWidth:210,display:'grid',gap:5,alignContent:'start'} as const;
const metrics={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8,marginTop:16} as const;
const metric={border:'1px solid #d4cec1',background:'#fbfaf6',padding:14} as const;
const flowGrid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginTop:16} as const;
const flowCard={border:'1px solid #d4cec1',background:'#fbfaf6',padding:14} as const;
const core={border:'1px solid #282620',background:'#282620',color:'#f4f0e4',padding:18,textAlign:'center' as const,display:'grid',gap:7} as const;
const flowLine={margin:'8px 0 16px',border:'1px dashed #c8c1b3',padding:10,textAlign:'center' as const,fontSize:8,letterSpacing:'.11em',color:'#8e887d'} as const;
const details={border:'1px solid #d4cec1',background:'#fbfaf6',marginTop:9} as const;
const summary={cursor:'pointer',padding:'12px 14px',fontSize:9,letterSpacing:'.11em',color:'#725c27'} as const;
const innerSummary={cursor:'pointer',fontSize:8,color:'#8b712d'} as const;
const capabilityGrid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:7,padding:12} as const;
const organGrid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:7,padding:12} as const;
const card={border:'1px solid #ded8cc',background:'#fffefa',padding:12} as const;
const subheading={font:'400 16px Georgia,serif',margin:'7px 0'} as const;
const code={display:'block',fontSize:8,color:'#777166',marginTop:5,whiteSpace:'normal' as const} as const;
const timelineRow={display:'grid',gridTemplateColumns:'150px 90px 140px minmax(200px,1fr) auto',gap:9,alignItems:'center',padding:'9px 12px',borderTop:'1px solid #e0dbd0',fontSize:9} as const;
const empty={border:'1px dashed #c8c1b3',background:'#eef4ed',color:'#4e7057',padding:16,fontSize:10} as const;
const darkPanel={background:'#070706',color:'#d8d0ba',padding:16,fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace'} as const;
const lineageGrid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:8} as const;
const darkMetric={border:'1px solid rgba(191,160,78,.24)',padding:12,minHeight:62} as const;
const darkRow={border:'1px solid rgba(191,160,78,.2)',padding:12,display:'grid',gap:6,marginTop:8,color:'#c9bea0'} as const;

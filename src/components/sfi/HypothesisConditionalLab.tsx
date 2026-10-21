'use client';

import { useState } from 'react';
import type { HypothesisConditionalReadModel, HypothesisConditionalBranch } from '@/lib/world-observatory/hypothesisConditionalBranches';
import './HypothesisConditionalLab.css';

type Props={model:HypothesisConditionalReadModel;context:'TIMELINE'|'METHOD_LAB'};
const utc=(at:string)=>new Intl.DateTimeFormat('es-MX',{
  timeZone:'UTC',year:'numeric',month:'short',day:'2-digit',
  hour:'2-digit',minute:'2-digit',hour12:false,
}).format(new Date(at))+' UTC';
const symbol=(branch:HypothesisConditionalBranch)=>{
  if(branch.operator==='PRESENCE')return 'PRESENCIA';
  if(branch.operator==='ABSENCE')return 'AUSENCIA';
  return branch.operator+' '+(branch.threshold===null?'INDETERMINADO':branch.threshold)+' '+(branch.unit??'');
};

export function HypothesisConditionalLab({model,context}:Props){
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [branchView,setBranchView]=useState<'ALL'|'SUPPORT_IF'|'CONTRADICT_IF'>('ALL');
  const selection=model.projections.find(x=>x.id===selectedId)??model.projections[0]??null;
  const tracks=selection?.branches.filter(x=>branchView==='ALL'||x.relation===branchView)??[];
  const ticks=selection?.ticks??[];
  const minimum=ticks.length?Math.min(...ticks.map(t=>Date.parse(t.at))):0;
  const maximum=ticks.length?Math.max(...ticks.map(t=>Date.parse(t.at))):1;
  const span=Math.max(1,maximum-minimum);
  return <section className="sfiHypLab" aria-label="Hypothesis conditional strength laboratory"
    data-sfi-instrument="SFI-HYPOTHESIS-CONDITIONAL-BRANCH-1.0">
    <header className="sfiHypLabHeader">
      <div>
        <span className="sfiHypLabKicker">METHOD LAB / MIHM-T · {context}</span>
        <h2>CONDICIONES QUE FORTALECERÍAN O CONTRADIRÍAN UNA HIPÓTESIS</h2>
        <p>No se asignan probabilidades imaginarias. Las ramas proceden de pruebas preregistradas; los tiempos de prueba no son acontecimientos observados.</p>
      </div>
      <div className="sfiHypLabCounts">
        <strong>{model.eligible}</strong><span>CON CONTRATO<br/>EN MUESTRA DE {model.scanned}</span>
      </div>
    </header>
    {model.warnings.length?<p className="sfiHypLabWarning">LECTURA PARCIAL: {model.warnings.join(' · ')}</p>:null}
    {!selection?<div className="sfiHypLabEmpty">
      SIN HIPÓTESIS CON CONTRATO VERIFICABLE EN ESTA LECTURA.
      No se generaron umbrales ni ramas sintéticas para suplirlos.
    </div>:<>
      <div className="sfiHypLabChooser" role="group" aria-label="Select a registered hypothesis">
        {model.projections.map((item,i)=><button type="button" key={item.id}
          aria-pressed={selection.id===item.id} onClick={()=>setSelectedId(item.id)}>
          <small>H{String(i+1).padStart(2,'0')} · {item.status}</small>
          <span>{item.statement}</span>
        </button>)}
      </div>
      <div className="sfiHypLabCore">
        <div className="sfiHypLabClaim">
          <small>HIPÓTESIS ORIGINAL · NO REESCRIBIBLE</small>
          <h3>{selection.statement}</h3>
          <p>RESULTADO CANÓNICO: <strong>{selection.outcomeClassification??'NO REGISTRADO'}</strong></p>
          <p>ESTADO TEMPORAL: <strong>{selection.methodState==='HISTORICAL_TEST_CLOSED'?'HORIZONTE CERRADO':'VALIDACIÓN PREREGISTRADA'}</strong></p>
        </div>
        <div className="sfiHypLabEvidence">
          <span>MUESTRA ORIGINAL <strong>{selection.baselineEvidenceCount}</strong></span>
          <span>RETURN ADMISIBLES RECONSTRUIDOS <strong>{selection.postCutoffEvidenceCount}/{selection.evidenceMinimum}</strong></span>
          <span>FAMILIAS DE FUENTE <strong>{selection.distinctPostCutoffSourceFamilies??'UNKNOWN'}/{selection.sourceFamilyMinimum}</strong></span>
        </div>
      </div>
      <div className="sfiHypLabTicks">
        <div className="sfiHypLabSectionTitle">TICS DE TIEMPO: T0 → APERTURA → FIN DE PRUEBA → EVALUACIÓN</div>
        <div className="sfiHypLabTickRail">
          {ticks.map(t=><div className="sfiHypLabTick" key={t.id}
            style={{left:(2+96*(Date.parse(t.at)-minimum)/span)+'%'}}
            data-kind={t.kind} title={t.meaning}>
            <i/><span>{t.kind.replace('_',' ')}</span>
          </div>)}
        </div>
        <div className="sfiHypLabTickLedger">
          {ticks.map(t=><div key={t.id}><b>{t.kind.replace('_',' ')}</b>
            <time>{utc(t.at)}</time><small>{t.epistemicClass} · {t.meaning}</small></div>)}
        </div>
        {selection.nextStep==='NEW_PROSPECTIVE_PREREGISTRATION_REQUIRED'
          ?<p className="sfiHypLabWarning">HORIZONTE HISTÓRICO CERRADO. Para observar futuros distintos se requiere un NUEVO contrato prospectivo, no mover el T0 anterior.</p>
          :<p>El horizonte sigue preregistrado. Las señales futuras son condiciones por observar, no pronósticos cumplidos.</p>}
      </div>
      <div className="sfiHypLabSectionTitle">RAMAS CONDICIONALES · {selection.branches.length} CRITERIOS CONGELADOS</div>
      <div className="sfiHypLabTabs" role="group" aria-label="Filter conditional branches">
        {(['ALL','SUPPORT_IF','CONTRADICT_IF'] as const).map(k=><button key={k}
          aria-pressed={branchView===k} onClick={()=>setBranchView(k)} type="button">
          {k==='ALL'?'TODAS':k==='SUPPORT_IF'?'FORTALECERÍA':'CONTRADIRÍA'}
        </button>)}
      </div>
      <div className="sfiHypLabBranches">
        {tracks.map(b=><article className="sfiHypLabBranch" key={b.id}
          data-relation={b.relation}>
          <div><small>{b.relation==='SUPPORT_IF'?'APOYARÍA, SI…':'CONTRADIRÍA, SI…'}</small>
            <strong>{b.signal}</strong><code>{symbol(b)}</code></div>
          <p>Mínimo: {b.minimumObservations} observaciones. Fuentes exigidas: {b.sourceFamilies.join(', ')||'diversidad global del contrato'}. {b.required?'CRITERIO REQUERIDO.':'DIAGNÓSTICO COMPLEMENTARIO.'}</p>
          <small>CONDICIONAL / NO OBSERVADO · {b.verificationState}</small>
        </article>)}
      </div>
      <details className="sfiHypLabInvariants">
        <summary>INVARIANTES, VARIABLES Y LÍMITES EXPERIMENTALES</summary>
        <div><strong>VARIABLES MEDIBLES</strong><p>{selection.variables.join(' · ')}</p></div>
        <div><strong>INVARIANTES PREREGISTRADAS</strong>
          <ul>{selection.invariantConditions.map(x=><li key={x}>{x}</li>)}</ul>
        </div>
        <p>{selection.epistemicBoundary}</p>
      </details>
    </>}
    <footer>{model.boundary}</footer>
  </section>;
}

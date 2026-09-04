'use client';

import { useMemo, useState } from 'react';
import { useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import { observableMetricValue, type ObservatoryReadAvailability } from '@/lib/observatory/public/readAvailability';
import './ObservatoryInterpretiveFlow.css';

type Row = Record<string, any>;
type WorldNode = {
  id:string; title:string; summary?:string|null; publisher:string; sourceId:string; sourceFamily:string;
  observedAt:string; affectedSystems:string[]; confidence:number|null; provenance?:Row|null;
};
type Hypothesis = Row & {
  id:string; statement?:string; status?:string; current_confidence?:number; cutoff_at?:string; validation_ends_at?:string;
  evidence_ids?:string[]; expected_signals?:string[]; contradiction_signals?:string[]; aiInference?:Row; outcome?:Row|null; learning?:Row|null;
};

type ObservatoryInterpretiveFlowProps = {
  world: Row | null;
  availability: ObservatoryReadAvailability;
};

const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const rows=(v:unknown):Row[]=>arr(v).filter((x):x is Row=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x));
const txt=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():'';
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const pct=(v:unknown)=>{const n=num(v);return n==null?'—':`${Math.round(n*100)}%`};
const short=(v:unknown,max=220)=>{const t=txt(v);return t.length>max?`${t.slice(0,max-1)}…`:t};

export function ObservatoryInterpretiveFlow({world,availability}:ObservatoryInterpretiveFlowProps){
  const {text}=useSfiLanguage();
  const [selectedId,setSelectedId]=useState<string>('');
  const available=availability==='AVAILABLE';
  const metric=(value:number)=>observableMetricValue(availability,value);

  const nodes=useMemo<WorldNode[]>(()=>rows(world?.nodes).map((n)=>({
    id:String(n.id),title:String(n.title||text('Observación sin título','Untitled observation')),summary:typeof n.summary==='string'?n.summary:null,
    publisher:String(n.publisher||'unknown'),sourceId:String(n.sourceId||'unknown'),sourceFamily:String(n.sourceFamily||'unknown'),observedAt:String(n.observedAt||''),
    affectedSystems:arr(n.affectedSystems).map(String),confidence:num(n.confidence),provenance:n.provenance&&typeof n.provenance==='object'?n.provenance:null,
  })),[world,text]);
  const hypotheses=useMemo<Hypothesis[]>(()=>rows(world?.hypotheses) as Hypothesis[],[world]);
  const selected=hypotheses.find(h=>String(h.id)===selectedId)??hypotheses[0]??null;
  const evidenceIds=new Set(arr(selected?.evidence_ids).map(String));
  const evidenceNodes=nodes.filter(n=>evidenceIds.has(n.id));
  const consequence=rows(selected?.aiInference?.consequenceChain);
  const expected=arr(selected?.expected_signals).map(String);
  const contradictions=arr(selected?.contradiction_signals).map(String);
  const rivals=arr(selected?.aiInference?.rivalHypotheses).map(String);
  const uncertainties=arr(selected?.aiInference?.uncertainties).map(String);
  const affectedSystems=arr(selected?.aiInference?.affectedSystems).map(String);
  const sourceFamilies=[...new Set(nodes.map(n=>n.sourceFamily))];
  const boundary=txt(world?.graph?.boundary)||text('Fuente ≠ evidencia; relación derivada ≠ causalidad observada; hipótesis ≠ verdad.','Source ≠ evidence; derived relation ≠ observed causality; hypothesis ≠ truth.');

  return <section className="obsInterpretiveFlow" aria-label={text('Lectura interpretativa del campo','Interpretive field reading')} data-world-availability={availability}>
    <div className="obsInterpretiveIntro">
      <div className="obsFlowKicker">SFI · {text('DE OBSERVACIÓN A INTERPRETACIÓN','FROM OBSERVATION TO INTERPRETATION')}</div>
      <h2>{text('El campo no termina en los números.','The field does not end with the numbers.')}</h2>
      <p>{text('Esta continuación separa explícitamente lo observado, lo derivado y lo inferido. No convierte una métrica en significado: muestra qué hipótesis está construyendo SFI, con qué fuentes, qué mecanismo propone y qué tendría que ocurrir para sostenerla o contradecirla.','This continuation explicitly separates observed, derived and inferred material. It does not turn a metric into meaning: it shows which hypothesis SFI is constructing, from which sources, which mechanism it proposes, and what would have to happen to support or contradict it.')}</p>
      <div className="obsFlowStats"><span data-availability={availability}>{metric(nodes.length)} {text('observaciones','observations')}</span><span data-availability={availability}>{metric(sourceFamilies.length)} {text('familias de fuente','source families')}</span><span data-availability={availability}>{metric(hypotheses.length)} {text('hipótesis trazables','traceable hypotheses')}</span></div>
    </div>

    {!available?<div className="obsInterpretiveUnavailable" data-availability={availability}>
      <span className="obsFlowKicker">{text('LECTURA AUTORITATIVA DEL CAMPO','AUTHORITATIVE FIELD READ')}</span>
      <h3>{availability}</h3>
      <p>{text('Los conteos, las relaciones y las afirmaciones de ausencia permanecen no disponibles hasta que la lectura autoritativa del campo sea AVAILABLE.','Counts, relations, and absence claims remain unavailable until the authoritative field read is AVAILABLE.')}</p>
    </div>:<>
      {hypotheses.length>1&&<div className="obsHypothesisSelector"><span>{text('LECTURA ACTIVA','ACTIVE READING')}</span><select value={selected?.id?String(selected.id):''} onChange={e=>setSelectedId(e.target.value)}>{hypotheses.slice(0,30).map(h=><option key={String(h.id)} value={String(h.id)}>{short(h.statement,100)||String(h.id)}</option>)}</select></div>}

      <div className="obsInterpretiveGrid">
        <article className="obsInterpretiveHero">
          <span className="obsFlowKicker">01 · {text('QUÉ ESTÁ INTERPRETANDO SFI','WHAT SFI IS INTERPRETING')}</span>
          <h3>{selected?.statement||text('Todavía no existe una hipótesis gobernada para este campo.','There is not yet a governed hypothesis for this field.')}</h3>
          {selected&&<><div className="obsFlowBadges"><b>{selected.aiInference?.relationClass||'INFERENCE'}</b><b>{selected.status||'UNKNOWN'}</b><b>{pct(selected.current_confidence)}</b><b>INFERENCE_ONLY</b></div>
          <p>{selected.aiInference?.mechanism||text('El mecanismo causal o sociotécnico todavía no está determinado. SFI conserva esa ausencia en lugar de rellenarla.','The causal or sociotechnical mechanism is still undetermined. SFI preserves that absence instead of filling it in.')}</p>
          {!!affectedSystems.length&&<div className="obsAffectedSystems">{affectedSystems.map(v=><span key={v}>{v}</span>)}</div>}</>}
        </article>

        <article>
          <span className="obsFlowKicker">02 · {text('CÓMO PODRÍA PROPAGARSE','HOW IT COULD PROPAGATE')}</span>
          {consequence.length?consequence.slice(0,8).map((edge,i)=><div className="obsConsequence" key={`${edge.from}-${edge.to}-${i}`}><b>{edge.from||'?'} → {edge.to||'?'}</b><span>{edge.relation||text('relación inferida','inferred relation')}</span><small>{text('base','basis')}: {arr(edge.basisEvidenceIds).join(', ')||text('no determinada','undetermined')}</small></div>):<p>{text('No hay una cadena de consecuencias propuesta. Eso permanece indeterminado.','No consequence chain has been proposed. That remains undetermined.')}</p>}
        </article>

        <article>
          <span className="obsFlowKicker">03 · {text('QUÉ LA SOSTENDRÍA','WHAT WOULD SUPPORT IT')}</span>
          {expected.length?<ul>{expected.slice(0,10).map(v=><li key={v}>+ {v}</li>)}</ul>:<p>{text('No hay señales esperadas registradas todavía.','No expected signals are recorded yet.')}</p>}
        </article>

        <article>
          <span className="obsFlowKicker">04 · {text('QUÉ LA ROMPERÍA','WHAT WOULD BREAK IT')}</span>
          {contradictions.length?<ul>{contradictions.slice(0,10).map(v=><li key={v}>− {v}</li>)}</ul>:<p>{text('No hay señales de contradicción registradas todavía.','No contradiction signals are recorded yet.')}</p>}
        </article>
      </div>

      <div className="obsInterpretiveWide">
        <article>
          <span className="obsFlowKicker">05 · {text('DE DÓNDE SALE ESTA LECTURA','WHERE THIS READING COMES FROM')}</span>
          <div className="obsEvidenceCards">{(evidenceNodes.length?evidenceNodes:nodes.slice(0,6)).slice(0,8).map(n=><div key={n.id} className="obsEvidenceCard"><small>{n.sourceFamily} · {n.publisher}</small><b>{n.title}</b><p>{n.summary||text('Sin resumen de fuente.','No source summary.')}</p><footer><span>{n.provenance?.sourceRole||'SOURCE_RECORD'}</span><span>{n.provenance?.verificationState||'NOT_RECORDED'}</span></footer></div>)}</div>
        </article>
      </div>

      <div className="obsInterpretiveGrid obsInterpretiveFinal">
        <article>
          <span className="obsFlowKicker">06 · {text('RIVALES E INCERTIDUMBRES','RIVALS & UNCERTAINTIES')}</span>
          {rivals.length?<><h4>{text('Hipótesis rivales','Rival hypotheses')}</h4><ul>{rivals.slice(0,8).map(v=><li key={v}>{v}</li>)}</ul></>:null}
          {uncertainties.length?<><h4>{text('Incertidumbres','Uncertainties')}</h4><ul>{uncertainties.slice(0,8).map(v=><li key={v}>{v}</li>)}</ul></>:null}
          {!rivals.length&&!uncertainties.length&&<p>{text('No se registraron rivales o incertidumbres para esta hipótesis.','No rivals or uncertainties were recorded for this hypothesis.')}</p>}
        </article>

        <article>
          <span className="obsFlowKicker">07 · RETURN / CONTRAST</span>
          {selected?.outcome?<><h4>{selected.outcome.classification||'OUTCOME'}</h4><p>{selected.outcome.observed_outcome||text('Existe un resultado, pero no contiene descripción pública.','An outcome exists but contains no public description.')}</p></>:<p>{text('Aún no existe un RETURN observado para esta hipótesis. SFI no lo fabrica: la lectura permanece abierta.','There is no observed RETURN for this hypothesis yet. SFI does not fabricate one: the reading remains open.')}</p>}
          {selected?.learning&&<div className="obsLearning"><b>{text('Aprendizaje candidato','Learning candidate')}</b><span>{text('Retenido','Retained')}: {arr(selected.learning.retained_assumptions).join(' · ')||'—'}</span><span>{text('Rechazado','Rejected')}: {arr(selected.learning.rejected_assumptions).join(' · ')||'—'}</span></div>}
        </article>
      </div>

      <div className="obsEpistemicBoundary"><span>{text('FRONTERA EPISTÉMICA','EPISTEMIC BOUNDARY')}</span><p>{boundary}</p></div>
    </>}
  </section>;
}

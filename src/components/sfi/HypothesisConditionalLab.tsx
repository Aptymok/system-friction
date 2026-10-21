'use client';

import { useState } from 'react';
import type { HypothesisConditionalReadModel, HypothesisConditionalBranch } from '@/lib/world-observatory/hypothesisConditionalBranches';
import { evaluatePossibility } from '@/lib/world-observatory/hypothesisConditionalExplore';
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
  // Browser-only what-if values: no writes, no changes to frozen hypothesis contracts.
  const [selectedBranchId,setSelectedBranchId]=useState<string|null>(null);
  const [scenarioValue,setScenarioValue]=useState('');
  const [scenarioPresence,setScenarioPresence]=useState<'UNKNOWN'|'PRESENT'|'ABSENT'>('UNKNOWN');
  const [scenarioObservations,setScenarioObservations]=useState('0');
  const [scenarioEvidence,setScenarioEvidence]=useState('0');
  const [scenarioFamilies,setScenarioFamilies]=useState('0');
  const [timelineIndex,setTimelineIndex]=useState(0);
  const selection=model.projections.find(x=>x.id===selectedId)??model.projections[0]??null;
  const tracks=selection?.branches.filter(x=>branchView==='ALL'||x.relation===branchView)??[];
  const ticks=[...(selection?.ticks??[])].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const selectedBranch=selection?.branches.find(b=>b.id===selectedBranchId)??selection?.branches[0]??null;
  const scenario=selection&&selectedBranch?evaluatePossibility(selectedBranch,selection.evidenceMinimum,selection.sourceFamilyMinimum,{
    value:scenarioValue,presence:scenarioPresence,observations:scenarioObservations,evidence:scenarioEvidence,
    sourceFamilies:scenarioFamilies,
  }):null;
  const activeTick=ticks[Math.min(timelineIndex,Math.max(0,ticks.length-1))]??null;
  const outcomeKnownAtCursor=Boolean(selection?.evaluationAt && activeTick && Date.parse(activeTick.at)>=Date.parse(selection.evaluationAt));
  const minimum=ticks.length?Math.min(...ticks.map(t=>Date.parse(t.at))):0;
  const maximum=ticks.length?Math.max(...ticks.map(t=>Date.parse(t.at))):1;
  const span=Math.max(1,maximum-minimum);
  return <section className="sfiHypLab" aria-label="Hypothesis conditional strength laboratory"
    data-sfi-instrument="SFI-HYPOTHESIS-CONDITIONAL-BRANCH-1.0">
    <header className="sfiHypLabHeader">
      <div>
        <span className="sfiHypLabKicker">METHOD LAB / MIHM-T · {context}</span>
        <h2>CONDICIONES QUE FORTALECERÍAN O CONTRADIRÍAN UNA HIPÓTESIS</h2>
        <p>Explora condiciones que podrían permitir, contradecir o dejar sin observación una hipótesis. El pasado permanece intacto: las alternativas no son acontecimientos observados.</p>
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
          aria-pressed={selection.id===item.id} onClick={()=>{setSelectedId(item.id);setSelectedBranchId(null);setTimelineIndex(0);setScenarioValue('');setScenarioPresence('UNKNOWN');}}>
          <small>H{String(i+1).padStart(2,'0')} · {item.status}</small>
          <span>{item.statement}</span>
        </button>)}
      </div>
      <div className="sfiHypLabCore">
        <div className="sfiHypLabClaim">
          <small>HIPÓTESIS ORIGINAL · NO REESCRIBIBLE</small>
          <h3>{selection.statement}</h3>
          <p>RESULTADO HISTÓRICO (LECTURA ACTUAL): <strong>{selection.outcomeClassification??'NO REGISTRADO'}</strong></p>
          <p>ESTADO TEMPORAL: <strong>{selection.methodState==='HISTORICAL_TEST_CLOSED'?'HORIZONTE CERRADO':'VALIDACIÓN PREREGISTRADA'}</strong></p>
        </div>
        <div className="sfiHypLabEvidence">
          <span>MUESTRA ORIGINAL <strong>{selection.baselineEvidenceCount}</strong></span>
          <span>RETURN ADMISIBLES RECONSTRUIDOS <strong>{selection.postCutoffEvidenceCount??'UNKNOWN'}/{selection.evidenceMinimum}</strong></span>
          <span>FAMILIAS DE FUENTE <strong>{selection.distinctPostCutoffSourceFamilies??'UNKNOWN'}/{selection.sourceFamilyMinimum}</strong></span>
        </div>
      </div>
      <section className="sfiHypLabPossibilityOverview" aria-label="Qué pudo observarse y qué quedó fuera">
        <div className="sfiHypLabSectionTitle">CAMPO DE POSIBILIDADES · HISTORIA / COBERTURA / DESCONOCIDO</div>
        <div className="sfiHypLabFieldGrid">
          <article>
            <small>QUÉ REGISTRÓ LA HISTORIA</small>
            <strong>{selection.outcomeClassification??'RESULTADO NO REGISTRADO'}</strong>
            <p>La clasificación histórica no cambia al ensayar otras condiciones. Inconcluso no significa falso.</p>
          </article>
          <article>
            <small>QUÉ NO PUDIMOS DETERMINAR</small>
            <strong>{selection.postCutoffEvidenceCount === null
              ? 'PROCEDENCIA NO DISPONIBLE' : selection.postCutoffEvidenceCount < selection.evidenceMinimum
              ? 'EVIDENCIA INSUFICIENTE' : selection.distinctPostCutoffSourceFamilies===null
                ? 'PROCEDENCIA DESCONOCIDA'
                : selection.distinctPostCutoffSourceFamilies < selection.sourceFamilyMinimum
                  ? 'FUENTES INSUFICIENTES' : 'REVISAR CRITERIOS Y CONTRASTES'}</strong>
            <p>{selection.postCutoffEvidenceCount??'UNKNOWN'}/{selection.evidenceMinimum} registros admisibles; {selection.distinctPostCutoffSourceFamilies??'desconocidas'}/{selection.sourceFamilyMinimum} familias de fuente. Estos datos no demuestran que la posibilidad no existiera.</p>
          </article>
          <article>
            <small>QUÉ QUEDÓ FUERA DEL EXPERIMENTO</small>
            <strong>POSIBILIDADES NO PROBADAS</strong>
            <p>Las condiciones no preregistradas y las restricciones que no cuentan con evidencia directa siguen como UNKNOWN. No se presume un bloqueo de autorización ni una causa.</p>
          </article>
          <article>
            <small>LO EMERGENTE NO SE PREDETERMINA</small>
            <strong>VARIABLE NO CONTROLADA</strong>
            <p>SFI puede diseñar qué observar, pero no ordenar lo que emergerá. Un acontecimiento imprevisto se registrará como observación nueva, no como confirmación retroactiva del ensayo.</p>
          </article>
        </div>
      </section>
      <div className="sfiHypLabTicks">
        <div className="sfiHypLabSectionTitle">TICS DE TIEMPO: T0 → APERTURA → FIN DE PRUEBA → EVALUACIÓN</div>
        <div className="sfiHypLabTickRail">
          {ticks.map(t=><div className="sfiHypLabTick" key={t.id}
            style={{left:(2+96*(Date.parse(t.at)-minimum)/span)+'%'}}
            data-kind={t.kind} title={t.meaning}>
            <i/><span>{t.kind.replace('_',' ')}</span>
          </div>)}
        </div>
        {activeTick?<div className="sfiHypLabTemporalCursor">
          <label htmlFor="sfi-hyp-timeline-cursor">DESPLAZARSE POR EL CONOCIMIENTO DISPONIBLE EN CADA MOMENTO</label>
          <input id="sfi-hyp-timeline-cursor" type="range" min={0} max={Math.max(0,ticks.length-1)}
            step={1} value={Math.min(timelineIndex,ticks.length-1)}
            onChange={event=>setTimelineIndex(Number(event.target.value))} />
          <p><strong>{activeTick.kind.replace('_',' ')} · {utc(activeTick.at)}</strong> — {outcomeKnownAtCursor
            ? 'A esta fecha ya existía una evaluación registrada.'
            : 'A esta fecha no existía todavía la evaluación posterior; conocer el plan de prueba no significa haber observado su resultado.'}</p>
          <small>Perspectiva temporal local (as-of). No cambia T0, las fechas, la evaluación ni el conocimiento que se tenía entonces.</small>
        </div>:null}
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
      <section className="sfiHypLabExplorer" aria-label="Ensayo de condiciones alternativas">
        <div className="sfiHypLabSectionTitle">ENSAYO CONDICIONAL · ¿QUÉ TENDRÍA QUE CAMBIAR?</div>
        <p>Selecciona un criterio ya registrado y plantea valores hipotéticos. No se genera un nuevo dato del mundo: se investiga la condición y lo que habría que medir para comprobarla.</p>
        <div className="sfiHypLabExplorerControls">
          <label>CONDICIÓN DE LA PRUEBA ORIGINAL
            <select value={selectedBranch?.id??''} onChange={event=>{
              setSelectedBranchId(event.target.value);setScenarioValue('');setScenarioPresence('UNKNOWN');
            }}>
              {selection.branches.map(b=><option key={b.id} value={b.id}>
                {b.relation==='SUPPORT_IF'?'Fortalecería':'Contradiría'}: {b.signal} · {symbol(b)}
              </option>)}
            </select>
          </label>
          {selectedBranch?.operator==='PRESENCE'||selectedBranch?.operator==='ABSENCE'
            ?<label>SEÑAL HIPOTÉTICA
              <select value={scenarioPresence} onChange={event=>setScenarioPresence(event.target.value as 'UNKNOWN'|'PRESENT'|'ABSENT')}>
                <option value="UNKNOWN">Sin especificar</option>
                <option value="PRESENT">Presente</option>
                <option value="ABSENT">Ausente</option>
              </select>
            </label>
            :<label>VALOR HIPOTÉTICO DE LA SEÑAL
              <input type="number" step="any" value={scenarioValue} placeholder="Introduce un valor"
                onChange={event=>setScenarioValue(event.target.value)} />
            </label>}
          <label>OBSERVACIONES EN EL ESCENARIO
            <input type="number" min={0} step={1} value={scenarioObservations}
              onChange={event=>setScenarioObservations(event.target.value)} />
          </label>
          <label>EVIDENCIAS POSTERIORES AL CORTE
            <input type="number" min={0} step={1} value={scenarioEvidence}
              onChange={event=>setScenarioEvidence(event.target.value)} />
          </label>
          <label>FAMILIAS DE FUENTE
            <input type="number" min={0} step={1} value={scenarioFamilies}
              onChange={event=>setScenarioFamilies(event.target.value)} />
          </label>
        </div>
        {scenario?<div className="sfiHypLabScenarioResult" role="status" aria-live="polite" data-state={scenario.state}>
          <small>RESULTADO DEL ENSAYO · NO OBSERVADO</small>
          <strong>{scenario.label}</strong>
          {scenario.missing.length?<div className="sfiHypLabScenarioGaps"><span>CONDICIONES PARA UNA PRUEBA ADMISIBLE</span>
            <ul>{scenario.missing.map(x=><li key={x}>{x}</li>)}</ul></div>:null}
          <p>{scenario.boundary}</p>
        </div>:null}
        <p className="sfiHypLabMethodCaution">La compatibilidad entre una afirmación y su indicador debe revisarse: satisfacer un umbral individual no prueba una comparación entre poblaciones. Para volver a contrastar una hipótesis cerrada se necesita un nuevo registro prospectivo, no modificar su historial.</p>
      </section>
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

'use client';

import styles from './MethodLabInstrumentRoom.module.css';

type Row=Record<string,unknown>;

type Props={
  runs:Row[];
  preregistrations:Row[];
  selectedRunId:string;
  onSelectRun:(id:string)=>void;
};

function row(value:unknown):Row{return value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{}}
function rows(value:unknown):Row[]{return Array.isArray(value)?value.filter((item):item is Row=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item)):[]}
function text(value:unknown,fallback='NOT RECORDED'){return typeof value==='string'&&value.trim()?value.trim():fallback}
function present(value:unknown){return !(value===null||value===undefined||value==='')}

function artifact(runRow:Row,key:string){
  const run=row(runRow.run);
  return row(row(run.artifacts)[key]);
}

function preregistrationFor(runRow:Row,preregistrations:Row[]){
  const executed=artifact(runRow,'EXECUTED');
  const experimentId=text(executed.experimentId,'');
  return preregistrations.find((item)=>text(row(item.preregistration).experimentId,'')===experimentId)??null;
}

export function MethodLabInstrumentRoom({runs,preregistrations,selectedRunId,onSelectRun}:Props){
  const selected=runs.find((item)=>String(item.id)===selectedRunId)??runs[0]??null;
  const executed=selected?artifact(selected,'EXECUTED'):{};
  const result=selected?artifact(selected,'RESULT'):{};
  const contrast=selected?artifact(selected,'CONTRAST'):{};
  const receipt=selected?artifact(selected,'REPRODUCIBILITY_RECEIPT'):{};
  const preregRow=selected?preregistrationFor(selected,preregistrations):null;
  const prereg=preregRow?row(preregRow.preregistration):{};
  const definitionHash=preregRow?text(preregRow.definitionHash,'NOT RECORDED'):'NOT RECORDED';
  const method=row(prereg.METHOD);
  const t0=row(prereg.T0);
  const inputs=rows(prereg.INPUTS);
  const frozenRefs=Array.isArray(t0.frozenInputRefs)?t0.frozenInputRefs.map(String):[];
  const evidenceRefs=Array.isArray(result.evidenceRefs)?result.evidenceRefs.map(String):[];
  const limitations=selected&&Array.isArray(row(selected.run).artifacts)?[]:Array.isArray(row(row(selected.run).artifacts).LIMITATIONS)?row(row(selected.run).artifacts).LIMITATIONS as unknown[]:[];
  const seed=executed.seed;
  const hasSeed=present(seed);
  const coreReceipt=[
    method.methodId,method.version,executed.runId,receipt.codeRef,
    receipt.preregistrationHash,receipt.inputHash,receipt.resultHash,
  ].every(present);
  const hasFrozenInputs=frozenRefs.length>0;
  const replayInputsComplete=coreReceipt&&hasFrozenInputs&&hasSeed;
  const replayState=replayInputsComplete
    ?'REPLAY SPEC COMPLETE'
    :coreReceipt&&hasFrozenInputs
      ?'PARTIAL · SEED NOT RECORDED'
      :'INCOMPLETE RECEIPT';

  const instruments=[
    {id:'method',label:'METHOD',value:text(method.methodId),detail:text(method.version),state:present(method.methodId)&&present(method.version)?'RECORDED':'MISSING'},
    {id:'run',label:'RUN',value:text(executed.runId),detail:text(executed.experimentType),state:present(executed.runId)?'EXECUTED':'MISSING'},
    {id:'inputs',label:'DATASET / INPUT SET',value:frozenRefs.length?String(frozenRefs.length):'0',detail:frozenRefs.length?'addressable refs':'no frozen refs',state:hasFrozenInputs?'FROZEN':'MISSING'},
    {id:'definition',label:'DEFINITION HASH',value:definitionHash==='NOT RECORDED'?'MISSING':'RECORDED',detail:definitionHash,state:definitionHash==='NOT RECORDED'?'MISSING':'RECORDED'},
    {id:'hash',label:'HASH CHAIN',value:present(receipt.inputHash)&&present(receipt.resultHash)?'3 LINKS':'INCOMPLETE',detail:'prereg → input → result',state:coreReceipt?'RECORDED':'MISSING'},
    {id:'seed',label:'SEED',value:hasSeed?String(seed):'NOT RECORDED',detail:'execution parameter',state:hasSeed?'RECORDED':'NOT RECORDED'},
    {id:'replay',label:'REPLAY',value:replayState,detail:'specification only · not execution',state:replayState},
  ];

  return <section className={styles.shell} aria-label="Method Lab Instrument Room" data-run-state={selected?'PERSISTED_RUN_SELECTED':'NO_PERSISTED_RUN'}>
    <header className={styles.header}>
      <div><small>P5 · LABORATORY INSTRUMENT ROOM</small><h3>Reproducibility rack</h3></div>
      <div className={styles.boundary}>REPLAY SPEC ≠ REPLAY EXECUTION ≠ OBSERVED RETURN</div>
    </header>

    <div className={styles.selector}>
      <label>RUN</label>
      <select value={selected?String(selected.id):''} onChange={(event)=>onSelectRun(event.target.value)}>
        <option value="">SELECT PERSISTED RUN…</option>
        {runs.map((item)=>{
          const x=artifact(item,'EXECUTED');
          return <option key={String(item.id)} value={String(item.id)}>{text(x.experimentId,String(item.id))} · {text(x.experimentType,'UNKNOWN')}</option>;
        })}
      </select>
    </div>

    {!selected?<div className={styles.empty}>
      <small>OBSERVED RUN STATE</small>
      <strong>NO PERSISTED EXPERIMENT RUN IN THIS OWNER SCOPE</strong>
      <p>The Instrument Room remains available, but it will not fabricate a dataset hash, seed, receipt or replay state. Create and execute a governed experiment to populate the rack.</p>
    </div>:null}

    <div className={styles.rack}>
      {instruments.map((instrument)=><article key={instrument.id} data-state={instrument.state}>
        <span className={styles.light}/>
        <small>{instrument.label}</small>
        <b>{instrument.value}</b>
        <p>{instrument.detail}</p>
        <em>{instrument.state}</em>
      </article>)}
    </div>

    <div className={styles.dossier}>
      <div className={styles.dossierHead}>
        <span>REPRODUCIBILITY DOSSIER</span>
        <b>{selected?text(executed.experimentId,'UNKNOWN EXPERIMENT'):'NO RUN SELECTED'}</b>
      </div>
      <div className={styles.grid}>
        <div><small>METHOD</small><code>{text(method.methodId)}</code></div>
        <div><small>METHOD VERSION</small><code>{text(method.version)}</code></div>
        <div><small>DEFINITION HASH</small><code>{definitionHash}</code></div>
        <div><small>CODE REF</small><code>{text(receipt.codeRef)}</code></div>
        <div><small>T0 CUTOFF</small><code>{text(t0.cutoff)}</code></div>
        <div><small>PROVIDER</small><code>{text(executed.provider)}</code></div>
        <div><small>MODEL</small><code>{text(executed.model)}</code></div>
        <div><small>SEED</small><code>{hasSeed?String(seed):'NOT RECORDED'}</code></div>
        <div><small>EPISTEMIC CLASS</small><code>{text(result.epistemicClass)}</code></div>
        <div><small>CONTRAST</small><code>{text(contrast.status)}</code></div>
        <div><small>EXECUTORS</small><code>{Array.isArray(receipt.executorRefs)?receipt.executorRefs.map(String).join(' · ')||'NONE':'NOT RECORDED'}</code></div>
      </div>

      <div className={styles.hashChain}>
        <article><small>PREREGISTRATION HASH</small><code>{text(receipt.preregistrationHash)}</code></article>
        <span>→</span>
        <article><small>INPUT HASH</small><code>{text(receipt.inputHash)}</code></article>
        <span>→</span>
        <article><small>RESULT HASH</small><code>{text(receipt.resultHash)}</code></article>
      </div>

      <div className={styles.inputLedger}>
        <div><small>FROZEN INPUT SET</small><b>{frozenRefs.length}</b><p>{frozenRefs.length?frozenRefs.join(' · '):'NOT RECORDED'}</p></div>
        <div><small>RESULT EVIDENCE REFS</small><b>{evidenceRefs.length}</b><p>{evidenceRefs.length?evidenceRefs.join(' · '):'NONE'}</p></div>
        <div><small>INPUT ROLES</small><b>{inputs.length}</b><p>{inputs.length?inputs.map((item)=>text(item.role,'UNKNOWN')+':'+text(item.epistemicClass,'UNKNOWN')).join(' · '):'NOT RECORDED'}</p></div>
      </div>

      <footer>
        <span>SIMULATION ≠ OBSERVATION</span>
        <span>HASH MATCH ≠ CAUSAL VALIDATION</span>
        <span>{replayState==='REPLAY SPEC COMPLETE'?'Replay specification is complete; successful replay has NOT been asserted. Replay execution, equality and successful reproduction remain unobserved.':replayState}</span>
        {limitations.length?<span>{limitations.map(String).join(' · ')}</span>:null}
      </footer>
    </div>
  </section>;
}

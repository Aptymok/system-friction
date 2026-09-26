'use client';

import styles from './HypothesisClosureDiff.module.css';

type Row=Record<string,any>;

function arr(value:unknown){return Array.isArray(value)?value:[]}
function text(value:unknown,fallback='NOT OBSERVED'){return typeof value==='string'&&value.trim()?value.trim():fallback}
function num(value:unknown){const n=Number(value);return Number.isFinite(n)?n:null}
function confidence(value:unknown){const n=num(value);return n==null?'—':Math.round(n*100)+'%'}

export function HypothesisClosureDiff({hypothesis}:{hypothesis:Row}){
  const outcome=hypothesis.outcome&&typeof hypothesis.outcome==='object'?hypothesis.outcome as Row:null;
  const learning=hypothesis.learning&&typeof hypothesis.learning==='object'?hypothesis.learning as Row:null;
  const evidenceIds=arr(outcome?.evidence_ids).map(String);
  const initial=num(hypothesis.initial_confidence);
  const current=num(hypothesis.current_confidence);
  const delta=initial!=null&&current!=null?current-initial:null;
  const classification=text(outcome?.classification,hypothesis.status?String(hypothesis.status):'NOT OBSERVED');
  const terminal=['VALIDATED','PARTIALLY_VALIDATED','CONTRADICTED','INCONCLUSIVE'].includes(classification);
  const dossierState=terminal&&outcome?'RECONSTRUCTIBLE':'NOT READY';

  const stages=[
    {
      key:'T0 CLAIM',
      state:hypothesis.cutoff_at?'FROZEN':'NOT OBSERVED',
      primary:text(hypothesis.cutoff_at),
      secondary:'Initial confidence '+confidence(hypothesis.initial_confidence),
    },
    {
      key:'RETURN WINDOW',
      state:terminal?'CLOSED':text(hypothesis.status,'OPEN'),
      primary:text(hypothesis.validation_starts_at)+' → '+text(hypothesis.validation_ends_at),
      secondary:'Window is a temporal boundary, not evidence.',
    },
    {
      key:'LATER EVIDENCE',
      state:evidenceIds.length?'LINKED':'NOT OBSERVED',
      primary:evidenceIds.length?evidenceIds.length+' linked evidence object'+(evidenceIds.length===1?'':'s'):'No linked RETURN evidence id',
      secondary:'Source coverage '+(num(outcome?.source_coverage)?.toFixed(3)??'—'),
    },
    {
      key:'CLASSIFICATION',
      state:classification,
      primary:text(outcome?.observed_outcome,'No persisted observed-outcome narrative.'),
      secondary:'Evaluator '+text(outcome?.evaluator_version),
    },
    {
      key:'LEARNING',
      state:learning?'PERSISTED':'NOT OBSERVED',
      primary:learning
        ? 'Retained '+arr(learning.retained_assumptions).length+' · Rejected '+arr(learning.rejected_assumptions).length+' · Missing '+arr(learning.missing_variables).length
        : 'No persisted world_learning_event',
      secondary:delta==null?'Confidence movement —':'Confidence movement '+(delta>=0?'+':'')+delta.toFixed(3),
    },
  ];

  return <section className={styles.shell} aria-label="Hypothesis closure and RETURN diff">
    <header className={styles.header}>
      <div><small>HYPOTHESIS CLOSURE / RETURN DIFF</small><strong>{classification}</strong></div>
      <div className={styles.dossier} data-ready={dossierState==='RECONSTRUCTIBLE'?'true':undefined}>
        <span>DOSSIER</span><b>{dossierState}</b>
      </div>
    </header>

    <div className={styles.track}>
      {stages.map((stage,index)=><article key={stage.key} data-state={stage.state}>
        <div className={styles.marker}>{String(index+1).padStart(2,'0')}</div>
        <div className={styles.stageBody}>
          <small>{stage.key}</small>
          <b>{stage.state}</b>
          <p>{stage.primary}</p>
          <span>{stage.secondary}</span>
        </div>
      </article>)}
    </div>

    <div className={styles.compare}>
      <div><small>EXPECTED</small><b>{arr(hypothesis.expected_signals).length}</b><span>frozen expected signals</span></div>
      <div><small>CONTRADICTION</small><b>{arr(hypothesis.contradiction_signals).length}</b><span>frozen contradiction signals</span></div>
      <div><small>RETURN EVIDENCE</small><b>{evidenceIds.length}</b><span>linked later objects</span></div>
      <div><small>CONFIDENCE</small><b>{confidence(initial)} → {confidence(current)}</b><span>{delta==null?'Δ —':'Δ '+(delta>=0?'+':'')+delta.toFixed(3)}</span></div>
    </div>

    <footer>
      EXPECTED ≠ OBSERVED · OUTCOME ≠ CAUSAL PROOF · INCONCLUSIVE ≠ FALSE · REPORT ≠ RETURN
    </footer>
  </section>;
}

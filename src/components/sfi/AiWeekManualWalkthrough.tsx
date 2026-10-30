'use client';
import Link from 'next/link';
import { useState } from 'react';

type Step={
 id:string; title:string; question:string; document:string;
 included:string; missing:string;
 options:[string,string,string]; answer:number;
 explanation:string; takeaway:string;
};
const STEPS:Step[]=[
 {id:'OBSERVATION',title:'What does the source actually say?',
  question:'Which statement is supported by the source excerpt in the packet?',
  document:'Exhibit 01 · Repository ingest note',
  included:'An extract describes a court request for additional expert clarification before final disposition.',
  missing:'Certified primary document, docket history and court portal snapshot.',
  options:['The court issued a final ruling.','The provided excerpt requests more clarification.','The legal dispute was settled.'],answer:1,
  explanation:'The packet describes an intermediate procedural state. It does not contain a certified final ruling.',
  takeaway:'A source excerpt is not proof of the full state of the world.'},
 {id:'EVIDENCE',title:'What was treated as evidence?',
  question:'What can we actually establish from the AI-generated memorandum?',
  document:'Exhibit 02 · FL-Copilot v3.2 memorandum',
  included:'The memorandum asserts finality, assigns 0% residual contingency and recommends releasing the provision.',
  missing:'Full prompt, retrieval trace, OCR output, version hash and independently verified source.',
  options:['The memorandum proves the fiscal claim was extinguished.','The memorandum contains the model’s claim, not proof of it.','A certified court docket independently confirms the claim.'],answer:1,
  explanation:'The output is an artifact of model reasoning. Treating it as independent confirmation would promote an assertion into evidence.',
  takeaway:'A confident answer can still lack adequate provenance.'},
 {id:'INFERENCE',title:'Where did interpretation become certainty?',
  question:'What is the critical inferential leap?',
  document:'Exhibit 01 + Exhibit 02 · Source-to-model contrast',
  included:'The extract indicates a request for clarification; the model output declares a final judgment and zero risk.',
  missing:'The transformation/retrieval trail showing how the procedural state was interpreted.',
  options:['An unresolved procedural step was represented as a final outcome.','The packet proves the model used the correct court record.','The 0% estimate was statistically validated.'],answer:0,
  explanation:'The two packet excerpts do not support the same conclusion. The missing transformation trail prevents a complete reconstruction.',
  takeaway:'Inference must stay visible, especially when a claim changes a decision.'},
 {id:'AUTHORITY',title:'Who could authorize the decision?',
  question:'What does the approval note establish—and what does it leave unknown?',
  document:'Exhibit 03 · Treasury authorization note',
  included:'A corporate Treasurer approved the release, citing the AI memorandum and a stated 98% historical accuracy figure.',
  missing:'Legal sign-off, delegation matrix, review checklist and proof of meaningful verification.',
  options:['The model itself legally authorized the release.','The Treasurer approved it in the packet; scope and review sufficiency remain unverified.','The 98% figure demonstrates lawful authority.'],answer:1,
  explanation:'An approval note records an institutional action. It does not by itself establish whether the actor had sufficient delegated authority.',
  takeaway:'Technical capability, past accuracy and institutional authority are different.'},
 {id:'EXECUTION',title:'What actually happened after approval?',
  question:'Which execution claim can this packet support?',
  document:'Exhibit 04 · Transaction and accounting record',
  included:'An internal accounting entry records release of the USD 42 million provision, with no technical execution error noted.',
  missing:'Bank confirmation, downstream reconciliation and exception logs.',
  options:['A technical and accounting execution was recorded inside the exercise packet.','Every downstream banking effect is independently confirmed.','Successful execution proves the underlying decision was correct.'],answer:0,
  explanation:'A successful internal transaction says something about execution, not legal truth, decision validity or external consequence.',
  takeaway:'An execution receipt is not a verification of the decision.'},
 {id:'RETURN',title:'What came back after the decision?',
  question:'How should a reviewer describe the T+60 notice?',
  document:'Exhibit 05 · Post-decision enforcement notice',
  included:'The fictional packet contains a notice summary demanding the same principal amount plus charges and interest at T+60.',
  missing:'Certified service, subsequent appeal, settlement or payment state and independent source verification.',
  options:['The model had correctly eliminated the contingency.','The notice summary creates a material contradiction; external resolution remains unknown.','The packet independently proves a real corporation incurred this loss.'],answer:1,
  explanation:'Within this synthetic story, the later notice contradicts the zero-risk premise. It does not establish a real-world financial loss or the ultimate resolution.',
  takeaway:'RETURN challenges the original claim without rewriting what was known at T0.'},
];

export function AiWeekManualWalkthrough(){
 const [index,setIndex]=useState(0);
 const [selections,setSelections]=useState<Record<number,number>>({});
 const [checked,setChecked]=useState<Record<number,boolean>>({});
 const step=STEPS[index];
 const selected=selections[index];
 const revealed=checked[index]===true;
 const correct=selected===step.answer;
 const completed=STEPS.every((_,i)=>checked[i]===true);
 const go=(next:number)=>setIndex(Math.max(0,Math.min(STEPS.length-1,next)));
 const choose=(value:number)=>{setSelections(v=>({...v,[index]:value}));setChecked(v=>({...v,[index]:false}));};
 const check=()=>{if(selected!==undefined)setChecked(v=>({...v,[index]:true}));};
 const reset=()=>{setIndex(0);setSelections({});setChecked({});};
 return <section className="sfiAiWeekInteractive" aria-label="Manual evidence reconstruction">
  <div className="sfiAiWeekProgress"><span>MANUAL OBSERVATION · {String(index+1).padStart(2,'0')} / {String(STEPS.length).padStart(2,'0')}</span><span>{completed?'ALL SIX QUESTIONS REVIEWED':'NO AUTOMATIC ANALYSIS'}</span></div>
  <nav className="sfiAiWeekStepNav" aria-label="Choose an observation stage">
   {STEPS.map((s,i)=><button key={s.id} type="button" onClick={()=>go(i)} aria-current={index===i?'step':undefined} data-active={index===i?'true':undefined}><small>{String(i+1).padStart(2,'0')}</small><strong>{s.id}</strong><span>{checked[i]?'Reviewed':'Not reviewed'}</span></button>)}
  </nav>
  <div className="sfiAiWeekPanels">
   <section className="sfiAiWeekExhibit" aria-labelledby="case-exhibit-title">
    <p className="sfiServicesKicker">PACKET RECORD / {step.id}</p>
    <h2 id="case-exhibit-title">{step.title}</h2>
    <div className="sfiAiWeekDocument"><small>{step.document}</small><h3>Provided in the exercise</h3><p>{step.included}</p></div>
    <div className="sfiAiWeekMissing"><small>NOT IN THIS PACKET</small><p>{step.missing}</p></div>
    <p className="sfiAiWeekLimit">All exhibits are fictional case materials, not independent records of a real organization.</p>
   </section>
   <section className="sfiAiWeekAssessment" aria-labelledby="case-observation-title">
    <p className="sfiServicesKicker">YOUR OBSERVATION / {String(index+1).padStart(2,'0')}</p>
    <h2 id="case-observation-title">What can you establish?</h2>
    <p className="sfiAiWeekQuestion">{step.question}</p>
    <fieldset><legend>Choose one interpretation</legend>
     {step.options.map((option,i)=><label key={option} className="sfiAiWeekChoice" data-selected={selected===i?'true':undefined}>
       <input type="radio" name={'case-'+index} checked={selected===i} onChange={()=>choose(i)}/><span>{option}</span>
     </label>)}
    </fieldset>
    <div className="sfiAiWeekControls">
      <button type="button" disabled={selected===undefined} className="sfiServicesButton" onClick={check}>Check my interpretation</button>
    </div>
    {revealed?<div className="sfiAiWeekReveal" role="status"><strong>{correct?'SUPPORTED BY THE PACKET':'RECONSIDER THE EVIDENCE'}</strong><p>{step.explanation}</p><p><b>What this teaches:</b> {step.takeaway}</p></div>:<p className="sfiAiWeekInstruction">Nothing will be submitted, stored or scored by an external AI. You control each step.</p>}
   </section>
  </div>
  <div className="sfiAiWeekFooterControls"><button type="button" disabled={index===0} onClick={()=>go(index-1)}>← Previous stage</button><span>{STEPS.filter((_,i)=>checked[i]).length} of {STEPS.length} inspected</span><button type="button" disabled={index===STEPS.length-1} onClick={()=>go(index+1)}>Next stage →</button></div>
  {completed?<div className="sfiAiWeekConclusion"><p className="sfiServicesKicker">RECONSTRUCTION COMPLETE / EXERCISE ONLY</p><h2>Reconstructability is not the same as truth.</h2><p>You have compared a source extract, an AI statement, a human approval, a technical execution and a later contradiction. What remains missing is as important as what was recorded.</p><div className="sfiServicesButtons"><Link className="sfiServicesButton" href="/servicios/evaluacion-de-decisiones-con-ia">Explore the Decision Trace service ↗</Link><button type="button" onClick={reset} className="sfiServicesSecondaryButton">Review again</button></div></div>:null}
 </section>;
}
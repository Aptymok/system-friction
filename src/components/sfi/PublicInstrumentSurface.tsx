'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SCENES, type Scene } from './publicSceneManifest';
import './PublicInstrumentSurface.css';

type SurfaceId='root'|'observatory'|'reality-chain'|'method-lab'|'timeline'|'access';

type Panel={
  kicker:string;
  title:string;
  lead:string;
  bullets:string[];
  note?:string;
  action?:{label:string;href:string};
};

const SURFACE_IMAGE:Record<SurfaceId,string>={
  root:'/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_18-1.png',
  observatory:'/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_22-2.png',
  'reality-chain':'/assets/sfi/instruments/RealityChain.png',
  'method-lab':'/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_26-3.png',
  timeline:'/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_38-6.png',
  access:'/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_42-7.png',
};

const COMMON_NOTE='TRACEABILITY ≠ JUSTIFICATION';

const PANELS:Record<SurfaceId,Panel[]>={
  root:[
    {kicker:'01 · CANONICAL FIELD',title:'Reasoning is different from authority.',lead:'ROOT keeps the institutional field relational, inspectable and bounded.',bullets:['Cases, projects, evidence, decisions and RETURN remain linked without collapsing provenance.','Human-readable inspection comes before machine ontology.','Authority remains explicit rather than inferred from model confidence.']},
    {kicker:'02 · EPISTEMIC STATE',title:'What was known then must remain distinguishable from what became known later.',lead:'The field must preserve temporal epistemic state instead of rewriting history from the present.',bullets:['Observed-at and effective-at remain separate.','Later evidence can revise confidence without erasing earlier state.','Unknown remains unknown until a source or observation changes it.']},
    {kicker:'03 · AUTHORITY BOUNDARY',title:'Capability does not grant permission.',lead:'SFI may control its own governed actions and record external authority evidence; it does not claim universal authority across institutions.',bullets:['Identity ≠ authority.','Approval ≠ execution.','Assignment ≠ execution.','Execution must remain scope-bound and evidence-linked.']},
    {kicker:'04 · STOP CONDITION',title:'A system must be able to abstain.',lead:'Before material action, ROOT should distinguish whether the problem is impossible, insufficiently supported, unauthorized or executable.',bullets:['Impossible task.','Insufficient information.','Missing authority.','Authorized and viable action.'],note:'COMPETENCE ≠ SELF-RESTRAINT'},
    {kicker:'05 · RETURN',title:'Reality can alter what the institution believes next.',lead:'Observed consequence may recalibrate confidence, method and future action without becoming canon by default.',bullets:['Expected state remains reconstructible.','Observed effect remains separate from execution receipt.','Contrast records divergence.','Learning re-enters through governance.'],action:{label:'ENTER OPERATIONAL ROOT',href:'/root'}},
  ],
  observatory:[
    {kicker:'01 · LIVE WORLD FIELD',title:'A signal is not evidence — and a vector is not the world.',lead:'Observatory combines persisted sources, current conditions and the bounded World Vector reading in one observational surface.',bullets:['Sources remain identifiable and dated.','Signals remain distinct from observations.','World Vector contextualizes the field; it does not establish causality.','Unavailable coverage remains explicit.']},
    {kicker:'02 · SOURCE HEALTH / PROVENANCE',title:'Coverage is part of the observation.',lead:'What SFI can see, how fresh it is and where it came from remain visible before interpretation.',bullets:['Fresh · stale · degraded · unavailable · unknown.','Source version and cutoff remain visible.','Derived copies do not become independent confirmations.','Reference count ≠ source independence.']},
    {kicker:'03 · WORLD VECTOR / TENSIONS',title:'The world does not have the same time.',lead:'World Vector remains an Observatory capability: a longitudinal contextual reading across domains, gradients and tensions.',bullets:['Domains move at different rates.','Current state is a dated observation.','Tensions remain relations and changes rather than one universal score.','World Vector / WorldSpect retains its own provenance and memory.'],note:'CONTEXT ≠ CAUSALITY'},
    {kicker:'04 · HYPOTHESES / PROJECTION',title:'Interpretation remains provisional.',lead:'Possible explanations and possible futures remain explicitly separate from observed world state.',bullets:['Observation ≠ hypothesis.','Projection ≠ observation.','Rival explanations remain visible where evidence permits.','Discriminating observations determine what should be checked next.']},
    {kicker:'05 · TRAJECTORY / RETURN',title:'Movement matters more than a snapshot.',lead:'Persisted T0 → T1 comparison shows direction, persistence and divergence, while RETURN becomes a later observation only when measured.',bullets:['Institution and world may keep different clocks.','Historical frames are not rewritten from later knowledge.','Execution ≠ impact.','Observed RETURN may change the next institutional state.'],action:{label:'OPEN OBSERVATORY',href:'/observatory?lens=world-vector'}},
  ],
  'reality-chain':[
    {kicker:'01 · RECONSTRUCT',title:'A complete-looking package is not a complete chain of justification.',lead:'Reality Chain reconstructs what existed, what was observed, what became evidence, who had authority, what was executed and what reality returned.',bullets:['REAL WORLD → SIGNAL → OBSERVATION → EVIDENCE','INFERENCE → AUTHORITY → EXECUTION → RETURN'],note:COMMON_NOTE},
    {kicker:'02 · EPISTEMIC REGISTER',title:'What could be known at the time?',lead:'Sources, provenance, independence, versions and time determine the epistemic state available to a decision.',bullets:['What was known then.','What was still unknown.','Which records shared the same upstream source.','What entered the case only later.']},
    {kicker:'03 · REALITY PASSPORT',title:'Inspect one decision without creating a parallel authority system.',lead:'The Passport is a decision view over the existing case and chain.',bullets:['OBSERVATION · A dispute exists; final resolution not established.','EVIDENCE · Five exhibits; no independent confirmation.','INFERENCE · “Risk zero” exceeds visible evidence.','AUTHORITY · Approval recorded; scope unverified.','EXECUTION · Internal accounting entry; external effect unverified.','RETURN · Later notice; causation not established.'],note:'RC-CASE-006 · SYNTHETIC EXERCISE'},
    {kicker:'04 · AUTHORITY / ABSTENTION',title:'Could the action happen, and should it happen?',lead:'Viability and authority are separate gates.',bullets:['Verify permission, scope and validity before action.','Distinguish impossible from insufficiently supported.','Distinguish insufficiently supported from unauthorized.','A capable model may still require abstention.']},
    {kicker:'05 · CONTRAST / RETURN',title:'Execution is not the end of the chain.',lead:'Observed consequence, new evidence and review determine whether the original decision remains justified.',bullets:['Execution receipt ≠ observed impact.','New evidence creates a new epistemic state; it does not overwrite the old one.','RETURN may revise confidence, method or future action.'],action:{label:'RECONSTRUCT A CASE',href:'/reality-chain'}},
  ],
  'method-lab':[
    {kicker:'01 · CONTROLLED EXPERIMENTATION',title:'Method exists before result.',lead:'Method Lab preserves protocols, rival hypotheses, parameters and reproducibility.',bullets:['Question and protocol are declared.','Inputs and stopping conditions remain inspectable.','Simulation remains non-observed.']},
    {kicker:'02 · INDEPENDENCE TEST',title:'Test artificial evidence inflation.',lead:'A post-conference contrast can compare one original source, ten reproductions and ten independent observations without rewriting the historical case.',bullets:['Same claim; different dependency structure.','Compare confidence, authorization and abstention.','Preserve source lineage and effective time.'],note:'EXPERIMENTAL CONTRAST · NOT SCIENTIFIC VALIDATION'},
    {kicker:'03 · ABSTENTION',title:'Producing an output is not the same as being justified to produce it.',lead:'Protocols should expose when the correct result is refusal or deferral.',bullets:['Impossible transformation.','Missing evidence.','Missing authority.','Viable and authorized action.']},
    {kicker:'04 · RUN RECEIPT',title:'Every run remains reconstructible.',lead:'Provider, model, parameters, evidence, timing, hashes and result belong to the run receipt.',bullets:['Provider/model identity remains visible.','Parameters remain addressable.','Hashes support integrity and reproducibility.','Result remains separate from real-world RETURN.']},
    {kicker:'05 · RE-ENTRY',title:'A result must survive contrast.',lead:'Re-running under changed evidence exposes what changed and why.',bullets:['Rival hypotheses remain alive where evidence permits.','Counterfactuals remain non-observed.','Learning requires governed re-entry.'],action:{label:'ENTER METHOD LAB',href:'/method-lab'}},
  ],
  timeline:[
    {kicker:'01 · LONGITUDINAL MEMORY',title:'Everything the institution can reconstruct over time.',lead:'Timeline preserves sequence without rewriting older states from current knowledge.',bullets:['Institution clock.','World clock.','Case clock.','Project clock.']},
    {kicker:'02 · EPISTEMIC TIME',title:'Known then ≠ known now.',lead:'A later source may alter the current reading without changing what was available at the earlier decision point.',bullets:['Observed-at.','Effective-at.','Decision-at.','RETURN-at.']},
    {kicker:'03 · VERSION RECONSTRUCTION',title:'History gains new layers; it is not overwritten.',lead:'Versioned reconstruction allows later evidence to coexist with prior institutional state.',bullets:['Prior state preserved.','New evidence appended.','Confidence may change.','Lineage remains explicit.']},
    {kicker:'04 · DEPLOYMENT / EXECUTION',title:'Technical release is an event, not an outcome.',lead:'Deployment, execution and observed consequence belong to different moments.',bullets:['Deployment event.','Authorized action.','Execution receipt.','Observed RETURN.']},
    {kicker:'05 · CONTRAST',title:'Time makes justification inspectable.',lead:'Expected state and later observed consequence can be compared without collapsing them into one narrative.',bullets:['Before / after.','Enables / derives-from.','Expected / observed.','Learning remains governed.'],action:{label:'OPEN INSTITUTIONAL TIMELINE',href:'/observatory?lens=trajectory&focus=timeline'}},
  ],
  access:[
    {kicker:'01 · IDENTITY',title:'Identity is not authority.',lead:'Authentication establishes who is present; it does not silently grant institutional power.',bullets:['Actor identity.','Session.','Authentication method.','Environment.']},
    {kicker:'02 · ROLE / SCOPE',title:'Role does not equal permission.',lead:'Authority remains action-specific and scope-bound.',bullets:['Observer.','Operator.','Controller.','ROOT.','System.']},
    {kicker:'03 · AUTHORITY EVIDENCE',title:'External authority may be recorded without being controlled by SFI.',lead:'SFI can verify and preserve evidence of external authorization but should not claim universal cross-institution authorization.',bullets:['Issuer or institution.','Scope.','Validity window.','Restrictions.','Evidence reference.']},
    {kicker:'04 · PRE-EXECUTION CHECK',title:'Permission must be checked before applicable action.',lead:'A valid identity and a capable model are insufficient when authority or viability is missing.',bullets:['Identity valid?','Scope valid?','Action viable?','Evidence sufficient?','Abstain when a gate fails.']},
    {kicker:'05 · ACCESS TRACE',title:'Access itself leaves a trace.',lead:'Changes in role, scope, session and operational access remain reconstructible.',bullets:['Access log.','Scope request.','Grant change.','Session boundary.'],action:{label:'INSTITUTIONAL ACCESS',href:'/root/access'}},
  ],
};

function sceneFor(surface:SurfaceId):Scene{
  const scene=SCENES.find(item=>item.id===surface);
  if(!scene)throw new Error(`Unknown public SFI surface: ${surface}`);
  return scene;
}

export function PublicInstrumentSurface({surface}:{surface:SurfaceId}){
  const host=useRef<HTMLElement|null>(null);
  const scene=useMemo(()=>sceneFor(surface),[surface]);
  const panels=PANELS[surface];
  const [activeIndex,setActiveIndex]=useState(0);

  useEffect(()=>{
    const el=host.current;
    if(!el)return;
    const onWheel=(event:WheelEvent)=>{
      if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
      event.preventDefault();
      el.scrollBy({left:event.deltaY,behavior:'auto'});
    };
    const onScroll=()=>{
      const width=Math.max(1,el.clientWidth);
      const next=Math.max(0,Math.min(panels.length-1,Math.round(el.scrollLeft/width)));
      setActiveIndex(next);
    };
    el.addEventListener('wheel',onWheel,{passive:false});
    el.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
    return()=>{
      el.removeEventListener('wheel',onWheel);
      el.removeEventListener('scroll',onScroll);
    };
  },[panels.length]);

  const goTo=(index:number)=>{
    const el=host.current;
    if(!el)return;
    const next=Math.max(0,Math.min(panels.length-1,index));
    el.scrollTo({left:next*el.clientWidth,behavior:'smooth'});
    setActiveIndex(next);
  };

  return <main className="sfiInstrumentPage" data-surface={surface}>
    <div className="sfiInstrumentArtwork" aria-hidden="true">
      <img src={SURFACE_IMAGE[surface]} alt=""/>
      <div className="sfiInstrumentArtworkVeil"/>
    </div>

    <section className="sfiInstrumentHorizontal" ref={host} aria-label={scene.title}>
      <div className="sfiInstrumentTrack">
        {panels.map((panel,index)=><article className="sfiInstrumentFifth" key={panel.kicker}>
          <div className="sfiInstrumentCopy">
            <small>{scene.number} · {scene.title}{scene.accent}</small>
            <span>{panel.kicker}</span>
            <h1>{panel.title}</h1>
            <p>{panel.lead}</p>
            <ul>{panel.bullets.map(item=><li key={item}>{item}</li>)}</ul>
            {panel.note?<em>{panel.note}</em>:null}
            {panel.action?<Link href={panel.action.href}>{panel.action.label} <b>→</b></Link>:null}
          </div>
          <div className="sfiInstrumentFifthIndex" aria-hidden="true">{String(index+1).padStart(2,'0')} / {String(panels.length).padStart(2,'0')}</div>
        </article>)}
      </div>
    </section>

    {surface==='timeline'?<nav className="sfiTimelineDock" aria-label="Timeline navigation">
      <div className="sfiTimelineDockHead"><span>GLOBAL TIMELINE</span><b>{String(activeIndex+1).padStart(2,'0')} / {String(panels.length).padStart(2,'0')}</b></div>
      <div className="sfiTimelineDockTrack">
        <div className="sfiTimelineDockLine"/>
        {panels.map((panel,index)=><button type="button" key={panel.kicker} data-active={index===activeIndex?'true':undefined} onClick={()=>goTo(index)} style={{left:`${6+(index*(88/Math.max(1,panels.length-1)))}%`}}>
          <i/><small>{String(index+1).padStart(2,'0')}</small><span>{panel.kicker.replace(/^\d+\s·\s/,'')}</span>
        </button>)}
      </div>
      <div className="sfiTimelineDockControls">
        <button type="button" disabled={activeIndex===0} onClick={()=>goTo(activeIndex-1)}>← PREVIOUS</button>
        <button type="button" disabled={activeIndex===panels.length-1} onClick={()=>goTo(activeIndex+1)}>NEXT →</button>
      </div>
    </nav>:<div className="sfiInstrumentScrollCue" aria-hidden="true"><span>SCROLL</span><i>←</i><b>HORIZONTAL</b><i>→</i></div>}
  </main>;
}

export type { SurfaceId };

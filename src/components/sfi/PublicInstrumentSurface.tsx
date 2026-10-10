'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { SCENES, type Scene } from './publicSceneManifest';
import './PublicInstrumentSurface.css';

type SurfaceId='root'|'observatory'|'reality-chain'|'method-lab'|'world-vector'|'repository'|'timeline'|'access';

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
  'world-vector':'/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_30-4.png',
  repository:'/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_34-5.png',
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
    {kicker:'01 · LIVE FIELD',title:'A signal is not evidence.',lead:'The Observatory exposes what SFI can currently see and where observation is degraded.',bullets:['Sources remain identifiable.','Freshness remains visible.','Signals remain distinct from observations.','Blind spots remain explicit.']},
    {kicker:'02 · SOURCE HEALTH',title:'Coverage is part of the observation.',lead:'Absence of data must not be mistaken for absence in the world.',bullets:['Fresh · stale · degraded · unavailable · unknown.','Source version and cutoff remain visible.','A copied report does not become a new independent observation.']},
    {kicker:'03 · INDEPENDENCE',title:'Ten reproductions of one source are not ten confirmations.',lead:'Corroboration should reflect independent origin, not document count or agent count.',bullets:['Track original source lineage.','Detect derived copies and shared upstream dependencies.','Apply independence only where sources are being used as corroboration.'],note:'TRACEABILITY DOES NOT ESTABLISH INDEPENDENCE'},
    {kicker:'04 · HYPOTHESES',title:'Interpretation remains provisional.',lead:'Possible explanations retain support, contradiction, uncertainty and discriminating observations.',bullets:['Observation ≠ hypothesis.','Confidence does not erase alternatives.','Recent changes remain time-bound.','Degraded state constrains inference.']},
    {kicker:'05 · TRAJECTORY',title:'Movement matters more than a snapshot.',lead:'Longitudinal observation preserves direction, persistence and divergence through time.',bullets:['Institution and world may keep different clocks.','Trajectory is dated.','Projection remains non-observed.','RETURN can become a later observation.'],action:{label:'OPEN OPERATIONAL OBSERVATORY',href:'/observatory'}},
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
  'world-vector':[
    {kicker:'01 · WORLD STATE',title:'The world does not have the same time.',lead:'World Vector keeps domain state longitudinal instead of forcing one universal present.',bullets:['Domains move at different rates.','Now is a dated observation.','Historical reconstruction remains bounded by what was knowable then.']},
    {kicker:'02 · TENSIONS',title:'Friction is relational.',lead:'Contradictions, gradients and pressure points remain inspectable rather than collapsed into one score.',bullets:['Relation before aggregation.','Persistence before narrative.','Uncertainty remains visible.']},
    {kicker:'03 · TRAJECTORY',title:'Direction matters more than a snapshot.',lead:'Persistent change and transient noise should not be treated as the same phenomenon.',bullets:['Trajectory preserves sequence.','Temporal relations remain explicit.','External change can alter institutional assumptions.']},
    {kicker:'04 · PROJECTION',title:'Projection is not observation.',lead:'Possible futures can support planning only while their inferred or simulated status remains visible.',bullets:['No future state is back-projected as past knowledge.','Projection can be contrasted later with observed RETURN.']},
    {kicker:'05 · RETURN TO WORLD',title:'Institutional action re-enters the environment.',lead:'Observed external consequence becomes a new world observation only when actually measured.',bullets:['Action ≠ impact.','Deployment ≠ outcome.','Measurement determines the next state.'],action:{label:'OPEN WORLD VIEW',href:'/observatory?lens=trajectory'}},
  ],
  repository:[
    {kicker:'01 · INSTITUTIONAL ARCHIVE',title:'The source remains distinct from the claim.',lead:'Repository preserves source records, evidence, publications and case objects without flattening their roles.',bullets:['Source origin.','Access conditions.','Observed time.','Case relation.']},
    {kicker:'02 · PROVENANCE / INDEPENDENCE',title:'Trace where a record came from — and whether it is actually independent.',lead:'Lineage must show when multiple records derive from the same upstream observation.',bullets:['Original source.','Derived copy.','Transformation.','Shared dependency.','Independent corroboration when established.']},
    {kicker:'03 · VERSIONED EVIDENCE',title:'New evidence should not erase old knowledge states.',lead:'Versions preserve what a case contained at each effective time.',bullets:['Version.','Hash.','Lineage.','Manifest.','Effective / observed timestamps.']},
    {kicker:'04 · INTEGRITY',title:'Timestamp alone does not make a log immutable.',lead:'Integrity claims require preservation, access controls and detectable modification in addition to time.',bullets:['Content-addressable objects.','Version history.','Access boundary.','Modification detection where implemented.']},
    {kicker:'05 · PUBLICATION',title:'Exposure is not adoption.',lead:'Publication, discovery, citation, institutional use and external recognition remain different observations.',bullets:['Publications remain addressable.','Evidence remains linked to claims.','Case objects retain provenance.'],action:{label:'OPEN REPOSITORY',href:'/publications?view=registry'}},
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
    {kicker:'05 · ACCESS TRACE',title:'Access itself leaves a trace.',lead:'Changes in role, scope, session and operational access remain reconstructible.',bullets:['Access log.','Scope request.','Grant change.','Session boundary.'],action:{label:'INSTITUTIONAL ACCESS',href:'/login'}},
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

  useEffect(()=>{
    const el=host.current;
    if(!el)return;
    const onWheel=(event:WheelEvent)=>{
      if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
      event.preventDefault();
      el.scrollBy({left:event.deltaY,behavior:'auto'});
    };
    el.addEventListener('wheel',onWheel,{passive:false});
    return()=>el.removeEventListener('wheel',onWheel);
  },[]);

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
          <div className="sfiInstrumentFifthIndex" aria-hidden="true">{String(index+1).padStart(2,'0')} / 05</div>
        </article>)}
      </div>
    </section>

    <div className="sfiInstrumentScrollCue" aria-hidden="true"><span>SCROLL</span><i>←</i><b>HORIZONTAL</b><i>→</i></div>
  </main>;
}

export type { SurfaceId };

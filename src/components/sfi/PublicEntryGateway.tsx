'use client';

import Link from 'next/link';
import './PublicEntryGateway.css';

const SURFACE_RAIL=[
  {label:'ROOT',number:'01',sceneId:'root',href:'/instruments/root',line:'Canonical field · authority · RETURN'},
  {label:'OBSERVATORY',number:'02',sceneId:'observatory',href:'/instruments/observatory',line:'Sources · signals · trajectories'},
  {label:'REALITY CHAIN',number:'03',sceneId:'reality-chain',href:'/instruments/reality-chain',line:'Evidence · justification · Reality Passport'},
  {label:'METHOD LAB',number:'04',sceneId:'method-lab',href:'/instruments/method-lab',line:'Protocols · abstention · reproducibility'},
  {label:'WORLD VECTOR',number:'05',sceneId:'world-vector',href:'/instruments/world-vector',line:'World state · tensions · projection'},
  {label:'REPOSITORY',number:'06',sceneId:'repository',href:'/instruments/repository',line:'Sources · provenance · versions'},
  {label:'TIMELINE',number:'07',sceneId:'timeline',href:'/instruments/timeline',line:'Epistemic time · reconstruction'},
  {label:'ACCESS',number:'08',sceneId:'access',href:'/instruments/access',line:'Identity · scope · authority'},
] as const;

export function PublicEntryGateway(){
  return <main className="sfiSceneExperience sfiHomeOnly" data-active-scene="intro">
    <div className="sfiHomeArtwork" aria-hidden="true">
      <img src="/assets/sfi/instruments/SFI_HOME_PANORAMA.png" alt=""/>
      <div className="sfiHomeArtworkVeil"/>
    </div>

    <section className="sfiHomeIndependent">
      <div className="sfiIndexStatement">
        <span>SFI | SYSTEM FRICTION INSTITUTE</span>
        <h1>NOTHING ACTS ALONE.<br/><b>REALITY ANSWERS BACK.</b></h1>
        <p>SFI observes, reconstructs, tests and preserves how systems interact — from signal to evidence, authority, execution and RETURN.</p>
        <small>Traceability can show where a claim came from. SFI also asks whether the evidence was independent, whether the decision was justified, what authority enabled action and what the world returned.</small>
      </div>

      <nav className="sfiIndexSurfaceRail" aria-label="SFI instruments">
        {SURFACE_RAIL.map(surface)=><Link key={surface.sceneId} href={surface.href}>
          <small>{surface.number}</small>
          <span><strong>{surface.label}</strong><em>{surface.line}</em></span>
          <b>→</b>
        </Link>)}
      </nav>
    </section>
  </main>;
}

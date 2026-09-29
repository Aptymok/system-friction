import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata:Metadata={
  title:'Institution',
  description:'Institutional identity, operating boundary and public orientation for System Friction Institute.',
};

const stages=['OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN','LEARNING'] as const;

export default function InstitutionPage(){
  return <main className="institutionPage">
    <section className="institutionHero">
      <div className="institutionHeroCopy">
        <span>INSTITUTION / SYSTEM FRICTION INSTITUTE</span>
        <h1>System Friction Institute</h1>
        <h2>Friction becomes legible when evidence survives the transition to action and back.</h2>
        <p>System Friction Institute studies how systems change under friction when actors, rules, information channels, memory, observation and authority interact over time. Its public surfaces expose bounded representations; operational authority and private evidence remain governed separately.</p>
      </div>
    </section>
    <section className="institutionBand">
      <article><span>OBJECT</span><strong>Complex sociotechnical systems</strong></article>
      <article><span>METHOD</span><strong>Longitudinal observation and governed contrast</strong></article>
      <article><span>BOUNDARY</span><strong>Representation is not canon</strong></article>
      <article><span>RETURN</span><strong>Observed change must return to evidence</strong></article>
    </section>
    <section className="institutionSection">
      <header><span>01</span><b>One institutional cycle.</b></header>
      <div className="institutionLifecycle">{stages.map(stage=><span key={stage}>{stage}</span>)}</div>
    </section>
    <section className="institutionSection">
      <header><span>02</span><b>Public surfaces have distinct responsibilities.</b></header>
      <div className="institutionLinks">
        <Link href="/observatory"><code>OBSERVATORY</code><span>Public persisted observation and longitudinal world state.</span></Link>
        <Link href="/laboratory"><code>LABORATORY</code><span>Public explanation of experimental method and its limits.</span></Link>
        <Link href="/publications"><code>REGISTRY</code><span>Canonical public publications and machine-addressable objects.</span></Link>
        <Link href="/contact"><code>CONTACT</code><span>Traceable public contact and institutional inquiry.</span></Link>
      </div>
    </section>
    <section className="institutionSection">
      <header><span>03</span><b>Epistemic boundaries remain explicit.</b></header>
      <div className="institutionBoundary">
        <article><h3>Observation is not inference.</h3><p>A source record does not become accepted evidence or causality merely because it is visible.</p></article>
        <article><h3>Execution is not validation.</h3><p>A capability may run successfully without proving that the method or claim is empirically valid.</p></article>
        <article><h3>Publication is not discovery.</h3><p>Exposure, retrieval, recognition, interaction, relation, propagation, PULL and RETURN remain distinct evidence states.</p></article>
      </div>
    </section>
  </main>;
}

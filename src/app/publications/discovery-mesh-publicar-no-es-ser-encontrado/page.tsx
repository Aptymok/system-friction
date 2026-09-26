import type { Metadata } from 'next';
import Link from 'next/link';
import './discovery-note.css';

const CANONICAL = 'https://systemfriction.org/publications/discovery-mesh-publicar-no-es-ser-encontrado';
const COVER = '/images/editorial/discovery-mesh-observation.svg';

export const metadata: Metadata = {
  title: 'Discovery Mesh: Publishing Is Not Being Found · System Friction Institute',
  description: 'Lab note on institutional self-observation, discoverability, governed candidates and the distance between EXPOSURE, DISCOVERY, PULL and RETURN.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    type:'article',
    url:CANONICAL,
    siteName:'System Friction Institute',
    title:'Discovery Mesh: Publishing Is Not Being Found',
    description:'How SFI observes its own discoverability without converting exposure into recognition.',
    images:[{url:COVER}],
  },
  other: {
    'sfi-canonical-id':'SFI-PUB-OBS-014',
    'sfi-epistemic-class':'METHOD_NOTE',
    'sfi-publication-state':'PUBLISHED_BY_FOUNDER_AUTHORIZATION',
    'sfi-boundary':'EXPOSURE_NE_DISCOVERY_NE_PULL_NE_RETURN',
  },
};

export default function DiscoveryMeshMethodNote() {
  return <main className="meshNote">
    <header className="meshTop">
      <Link href="/">SYSTEM FRICTION INSTITUTE</Link>
      <div>LAB NOTES · SFI-PUB-OBS-014 · 16 SEP 2026</div>
      <Link href="/publications">PUBLICATIONS</Link>
    </header>

    <section className="meshHero">
      <div className="meshHeroCopy">
        <span className="meshKicker">DISCOVERY MESH · METHOD NOTE</span>
        <h1>Publishing is not being found.</h1>
        <p className="meshLead">An institution can expose a surface, appear in search, and still not have been recognized, used or required. Discovery Mesh preserves those distances instead of filling them with narrative.</p>
      </div>
      <figure className="meshFigure">
        <img src={COVER} alt="Discovery Mesh: trajectory from EXPOSURE to RETURN"/>
        <figcaption>SFI · DISCOVERY MESH · methodological representation. The diagram describes possible states; it does not claim that all of them have been observed.</figcaption>
      </figure>
    </section>

    <aside className="meshBoundary">
      <b>BOUNDARY</b>
      <p>PUBLICATION = EXPOSURE. DISCOVERY, RECOGNITION, INTERACTION, RELATION, PROPAGATION, PULL and RETURN require distinct observations. An absent state remains absent. NULL is not converted to zero.</p>
    </aside>

    <article className="meshBody">
      <section className="meshSection"><span>01 / EXPOSURE</span><div><h2>Publishing only opens the trajectory.</h2><p>A public page, feed, canonical object or machine-readable representation demonstrates that SFI placed something on an accessible surface. It does not demonstrate that anyone found it, recognized it as useful, changed a decision because of it or returned with an outcome.</p><p>If publication and discovery are mixed, the system can celebrate its own activity as if it were external evidence.</p></div></section>
      <section className="meshSection"><span>02 / SELF-OBSERVATION</span><div><h2>The institution can observe its own discoverability.</h2><p>Discovery Mesh performs bounded observations over eligible searches and retrievals. It preserves query, intent, provider, source, timestamp, attributed identity, cited canonical URL, independent references and collisions when those variables exist.</p><p>Self-observation does not make the institute the judge of its own legitimacy. It detects where public representation can be reconstructed and where observations are still missing.</p></div></section>
      <section className="meshSection"><span>03 / INSTRUMENTS</span><div><h2>Seven measurement families. No prestige metric.</h2><div className="meshMetrics"><div><b>UDR</b><small>Unmarked retrieval.</small></div><div><b>EIC</b><small>External identity coherence.</small></div><div><b>IRD</b><small>Independent reference density.</small></div><div><b>ACR</b><small>AI retrieval, attribution and citation.</small></div><div><b>ECR</b><small>Name, domain, method and entity collisions.</small></div><div><b>MPD</b><small>Observed propagation depth.</small></div><div><b>ERR</b><small>Entity reconstruction.</small></div></div><p>Their purpose is to make otherwise impressionistic claims falsifiable: “we are discoverable,” “we are reconstructed correctly,” “the piece circulated,” “an AI cites us.”</p></div></section>
      <section className="meshSection"><span>04 / MISSING</span><div><h2>What was not observed is not filled in.</h2><p>A query without an eligible sample does not produce zero. A publication without an independent reference does not produce failure. A mention does not become a relation. A relation does not become PULL. A request does not become RETURN until an observable outcome is linked to it.</p></div></section>
      <section className="meshSection"><span>05 / DEVELOPMENT</span><div><h2>Observation can produce development candidates.</h2><p>When the Mesh finds an unobserved dimension or degraded measurement, it can formulate a bounded change and preserve the run that originated it, the observed metric, the desired condition and the suggested change.</p><p>The candidate enters the existing institutional lifecycle. If it requires code or material implementation and no authorized executor exists, it remains <b>BLOCKED_MISSING_EXECUTOR</b>. Execution, RETURN, adoption and canon remain distinct states.</p></div></section>
      <section className="meshSection"><span>06 / FOUNDER-AWAY</span><div><h2>Being found must not depend on the Founder chasing it.</h2><p>The institutional function of the Mesh is to reduce that dependency: emit reconstructible objects, observe how they appear—or fail to appear—detect identity friction and formulate traceable candidates.</p><p>The Founder intervenes where a reserved decision exists. Routine observation, recording and re-measurement can continue without turning Founder attention into institutional middleware.</p></div></section>
      <section className="meshSection"><span>07 / RETURN</span><div><h2>The next cycle begins when the field responds.</h2><p>An improvement is demonstrated only when a later observation changes traceably: a query retrieves what it previously did not, an identity is reconstructed correctly, an independent reference appears or an external trajectory reaches a previously unobserved state.</p><p>RETURN also preserves the possibility that the intervention did not work.</p></div></section>
    </article>

    <footer className="meshFooter">
      <span>SFI · LAB NOTES</span>
      <span>OBSERVED / DERIVED / INFERRED / PROJECTED remain separate</span>
      <span><Link href="/observatory">OBSERVATORY →</Link></span>
    </footer>
  </main>;
}

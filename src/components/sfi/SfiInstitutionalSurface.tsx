import Link from 'next/link';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import type { PublicInstitutionalAttractorState } from '@/lib/institution/publicAttractor';
import './sfi-institutional-surface.css';

function label(value: string | null | undefined, fallback = 'NO MEDIDO') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function utc(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? `${parsed.toISOString().replace('T', ' ').slice(0, 19)} UTC` : 'SIN FECHA';
}

export function SfiInstitutionalSurface({ state, attractor }: { state: SfiWorldInterfaceState; attractor: PublicInstitutionalAttractorState }) {
  const coverage = attractor.evidenceCoverage === null ? 'NO MEDIDA' : `${Math.round(attractor.evidenceCoverage * 100)}%`;
  const organs = [
    { key: '01', label: 'OBSERVATORY', href: '/observatory', detail: 'Contexto externo, fuentes, latencia y cambio longitudinal.' },
    { key: '02', label: 'FIELD', href: '/field', detail: 'Casos reales, ventanas de retorno y perturbación mínima verificable.' },
    { key: '03', label: 'MIHM', href: '/mihm', detail: 'Marco multinodal público para describir fricción, homeostasis y relaciones entre nodos.' },
    { key: '04', label: 'ATLAS', href: '/atlas', detail: 'Trayectorias, artefactos y memoria institucional observable.' },
    { key: '05', label: 'REPOSITORY', href: '/repository', detail: 'Métodos, contratos, canon y material reproducible.' },
    { key: '06', label: 'LIBRARY', href: '/library', detail: 'Corpus público, instrumentos y publicaciones.' },
  ];

  return (
    <main className="is-root">
      <header className="is-nav">
        <Link className="is-mark" href="/" aria-label="System Friction Institute"><span>SFI</span><small>SYSTEM FRICTION INSTITUTE</small></Link>
        <nav aria-label="Superficies públicas">
          <Link href="/observatory">OBSERVATORY</Link>
          <Link href="/repository">METHOD</Link>
          <Link href="/founder-edition">FOUNDER EDITION</Link>
          <Link href="/contact">CONTACT</Link>
          <Link className="is-login" href="/login">PRIVATE ACCESS →</Link>
        </nav>
      </header>

      <section className="is-hero">
        <div className="is-hero-copy">
          <span className="is-kicker">INSTITUTIONAL OBSERVATION SYSTEM · 2026</span>
          <h1>Observe systems<br/>before intervention.</h1>
          <p>System Friction Institute studies systems that remain operational while accumulating friction. Evidence is separated from inference; trajectory precedes intervention; returns determine what the system is allowed to learn.</p>
          <div className="is-actions">
            <Link href="/observatory">ENTER OBSERVATORY</Link>
            <Link href="/repository">READ THE METHOD</Link>
          </div>
        </div>

        <div className="is-field" aria-label="Topología operativa de SFI">
          <div className="is-orbit is-orbit-a" />
          <div className="is-orbit is-orbit-b" />
          <div className="is-axis is-axis-x" />
          <div className="is-axis is-axis-y" />
          <div className="is-core"><span>SFI</span><strong>{label(state.signalState.status)}</strong><small>{utc(state.generatedAt)}</small></div>
          <div className="is-node n1"><span>EVIDENCE</span><b>OBSERVE</b></div>
          <div className="is-node n2"><span>TRAJECTORY</span><b>RECONSTRUCT</b></div>
          <div className="is-node n3"><span>ATTRACTOR</span><b>CONTRAST</b></div>
          <div className="is-node n4"><span>PERTURBATION</span><b>MINIMIZE</b></div>
          <div className="is-node n5"><span>RETURN</span><b>VERIFY</b></div>
          <div className="is-node n6"><span>GOVERNANCE</span><b>DECIDE</b></div>
        </div>
      </section>

      <section className="is-runtime" aria-label="Estado operativo público">
        <article><span>SIGNAL STATE</span><strong>{label(state.signalState.value, label(state.signalState.status))}</strong><small>{state.signalState.detail}</small></article>
        <article><span>FRICTION</span><strong>{label(state.frictionLevel.value)}</strong><small>{label(state.frictionLevel.trend)}</small></article>
        <article><span>FIELD COHERENCE</span><strong>{label(state.fieldCoherence.value)}</strong><small>{label(state.fieldCoherence.trend)}</small></article>
        <article><span>PREDICTIONS</span><strong>{label(state.predictions.value)}</strong><small>{state.predictions.detail}</small></article>
        <article><span>ATTRACTOR COVERAGE</span><strong>{coverage}</strong><small>{attractor.activePhenomena} active phenomenon trajectories</small></article>
      </section>

      <section className="is-method">
        <header><span>OPERATING PRINCIPLE</span><h2>Evidence → trajectory → perturbation → return.</h2></header>
        <div className="is-method-grid">
          <article><span>01 / OBSERVE</span><h3>Separate signal from explanation.</h3><p>Source, timestamp, reliability and lineage remain attached to what is observed. Missing evidence remains missing.</p></article>
          <article><span>02 / MODEL</span><h3>Represent competing trajectories.</h3><p>MIHM, WorldSpect, attractors and the Cognitive Twin are instruments. Their outputs remain method-scoped rather than universal claims.</p></article>
          <article><span>03 / TEST</span><h3>Intervene only at the minimum useful scale.</h3><p>A proposal does not become knowledge until a return window closes and the observed outcome can contradict the original hypothesis.</p></article>
        </div>
      </section>

      <section className="is-organs">
        <header><span>PUBLIC ARCHITECTURE</span><h2>One institute. Distinct observational organs.</h2></header>
        <div className="is-organ-grid">
          {organs.map((organ) => <Link key={organ.key} href={organ.href}><span>{organ.key}</span><strong>{organ.label}</strong><p>{organ.detail}</p><em>OPEN →</em></Link>)}
        </div>
      </section>

      <section className="is-book">
        <div className="is-book-cover" aria-label="Founder Edition publication mark">
          <div><span>SFI · 2026</span><strong>INSTRUMENTALIZACIÓN DE UNA MENTE FRAGMENTADA</strong><small>THE FOUNDER EDITION</small></div>
        </div>
        <div className="is-book-copy">
          <span>FOUNDER EDITION · PUBLICATION / 2026</span>
          <h2>Instrumentalización de una mente fragmentada</h2>
          <h3>Del conocimiento tácito a una arquitectura observable.</h3>
          <p>La edición acompaña la superficie institucional como registro de origen: cómo operaciones cognitivas, memoria, extracción de conocimiento tácito y formalización metodológica fueron convertidas en una arquitectura que puede observarse, discutirse y ponerse a prueba.</p>
          <div className="is-book-meta"><span>FOUNDER EDITION</span><span>ARCHIVAL PDF</span><span>SYSTEM FRICTION INSTITUTE</span></div>
          <div className="is-actions"><Link href="/founder-edition">VIEW EDITION STATUS</Link></div>
        </div>
      </section>

      <section className="is-boundary">
        <span>TRUTH BOUNDARY</span>
        <h2>The system may be operational before its scientific questions are closed.</h2>
        <p>Observed, derived, experimental and canonical states are not interchangeable. Runtime capability is not validation; a declared attractor is not an achieved state; a model output is not external evidence.</p>
        <Link href="/repository">INSPECT CANON + METHODS →</Link>
      </section>

      <footer className="is-footer"><div><strong>SYSTEM FRICTION INSTITUTE</strong><span>ONTO · EPISTE · BIO · DIGITAL · ANTROPO · PSYCHO · AESTHETIC · NEURO ARCHITECTURES</span></div><div><Link href="/privacy">PRIVACY</Link><Link href="/contact">CONTACT</Link><Link href="/login">ACCESS</Link></div></footer>
    </main>
  );
}

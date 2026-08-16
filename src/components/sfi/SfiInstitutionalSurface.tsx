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

const publicSurfaces = [
  { key: '01', phase: 'SIGNAL', label: 'OBSERVATORY', href: '/observatory?source=home&phase=signal', access: 'PUBLIC', detail: 'Contexto externo, señales, fuentes, latencia y cambio longitudinal.' },
  { key: '02', phase: 'SYSTEM', label: 'ATLAS', href: '/atlas?source=home&phase=system', access: 'PUBLIC', detail: 'Trayectorias, artefactos, relaciones y memoria institucional observable.' },
  { key: '03', phase: 'MODEL', label: 'MIHM', href: '/mihm?source=home&phase=model', access: 'PUBLIC', detail: 'Marco multinodal para describir fricción, homeostasis y relaciones entre nodos.' },
  { key: '04', phase: 'METHOD', label: 'REPOSITORY', href: '/repository?source=home&phase=method', access: 'PUBLIC', detail: 'Métodos, contratos, canon y material reproducible.' },
  { key: '05', phase: 'MEMORY', label: 'LIBRARY', href: '/library?source=home&phase=memory', access: 'PUBLIC', detail: 'Corpus, instrumentos, publicaciones y registros preservados.' },
  { key: '06', phase: 'FIELD', label: 'FIELD', href: '/field?source=home&phase=field', access: 'PUBLIC', detail: 'Casos reales, ventanas de retorno y perturbación mínima verificable.' },
];

const governedSurfaces = [
  { key: '07', phase: 'INSTRUMENT', label: 'STUDIO', href: '/login?next=/studio', access: 'AUTHENTICATED', detail: 'Instrumentación de objetos, sesiones, análisis y producción operativa.' },
  { key: '08', phase: 'EVIDENCE', label: 'EVIDENCE', href: '/login?next=/root/evidence/intake', access: 'GOVERNED', detail: 'Ingreso de evidencia, lineage y separación formal entre registro e inferencia.' },
  { key: '09', phase: 'COGNITION', label: 'COGNITIVE TWIN', href: '/login?next=/root/cognitive-twin', access: 'ROOT', detail: 'Memoria, estado cognitivo, deliberación y trazabilidad de ejecución.' },
  { key: '10', phase: 'CONTROL', label: 'ROOT', href: '/login?next=/root', access: 'ROOT / OBSERVER', detail: 'Gobernanza, control institucional y lectura soberana del sistema.' },
];

const convergencePoints = [
  [96, 38, 2.2, .46], [78, 46, 1.7, .28], [61, 59, 2.8, .6], [53, 76, 1.8, .34], [66, 91, 2.4, .48], [86, 98, 1.5, .25], [105, 105, 2.9, .63], [119, 118, 1.7, .31], [111, 136, 2.3, .5], [94, 150, 1.8, .34], [71, 156, 2.7, .58], [51, 149, 1.4, .24],
  [256, 40, 2.5, .55], [278, 41, 1.6, .29], [300, 42, 2.1, .44], [255, 60, 1.5, .28], [255, 82, 2.7, .59], [276, 83, 1.8, .33], [292, 84, 2.3, .46], [255, 106, 1.7, .3], [255, 128, 2.5, .51], [255, 151, 1.9, .36],
  [444, 43, 2.6, .57], [444, 66, 1.6, .31], [444, 90, 2.8, .62], [444, 114, 1.7, .32], [444, 139, 2.4, .49], [444, 158, 1.5, .27],
  [18, 30, 1.1, .15], [146, 27, 1.2, .12], [190, 124, 1.4, .16], [330, 27, 1.1, .13], [382, 147, 1.4, .17], [489, 96, 1.2, .14], [522, 36, 1.1, .11], [574, 137, 1.3, .15], [620, 68, 1.2, .12], [688, 154, 1.4, .16],
] as const;

export function SfiInstitutionalSurface({ state, attractor }: { state: SfiWorldInterfaceState; attractor: PublicInstitutionalAttractorState }) {
  const coverage = attractor.evidenceCoverage === null ? 'NO MEDIDA' : `${Math.round(attractor.evidenceCoverage * 100)}%`;

  return (
    <main className="is-root">
      <header className="is-nav">
        <Link className="is-mark" href="/" aria-label="System Friction Institute"><span>SFI</span><small>SYSTEM FRICTION INSTITUTE</small></Link>
        <nav aria-label="Entradas institucionales">
          <Link href="/observatory">OBSERVE</Link>
          <Link href="/contact">ENGAGE</Link>
          <Link className="is-login" href="/login?next=/studio">ACCESS →</Link>
        </nav>
      </header>

      <section className="is-hero">
        <div className="is-hero-copy">
          <span className="is-kicker">INSTITUTIONAL ATTRACTOR · LAYER 0 · 2026</span>
          <h1>Observe systems<br/>before intervention.</h1>
          <p>System Friction Institute studies systems that remain operational while accumulating friction. Evidence is separated from inference; trajectory precedes intervention; returns determine what the system is allowed to learn.</p>
          <div className="is-actions">
            <Link href="/observatory?source=home&phase=entry">OBSERVE THE SYSTEM</Link>
            <Link href="/contact?source=home&phase=entry">ENGAGE SFI</Link>
          </div>
          <div className="is-entry-note"><span>THIS SURFACE IS NOT THE SYSTEM.</span><strong>IT ROUTES INTO IT.</strong></div>
        </div>

        <div className="is-field" aria-label="Topología operativa de SFI">
          <div className="is-orbit is-orbit-a" />
          <div className="is-orbit is-orbit-b" />
          <div className="is-axis is-axis-x" />
          <div className="is-axis is-axis-y" />
          <div className="is-core"><span>FIELD</span><strong>{label(state.signalState.status)}</strong><small>{utc(state.generatedAt)}</small></div>
          <Link className="is-node n1" href="/login?next=/root/evidence/intake"><span>EVIDENCE</span><b>OBSERVE</b><em>GOVERNED ↗</em></Link>
          <Link className="is-node n2" href="/atlas?source=home&phase=trajectory"><span>TRAJECTORY</span><b>RECONSTRUCT</b><em>ATLAS ↗</em></Link>
          <Link className="is-node n3" href="/observatory?source=home&phase=attractor"><span>ATTRACTOR</span><b>CONTRAST</b><em>OBSERVATORY ↗</em></Link>
          <Link className="is-node n4" href="/field?source=home&phase=perturbation"><span>PERTURBATION</span><b>MINIMIZE</b><em>FIELD ↗</em></Link>
          <Link className="is-node n5" href="/field?source=home&phase=return"><span>RETURN</span><b>VERIFY</b><em>FIELD ↗</em></Link>
          <Link className="is-node n6" href="/login?next=/root"><span>GOVERNANCE</span><b>DECIDE</b><em>ROOT ↗</em></Link>
        </div>
      </section>

      <section className="is-runtime" aria-label="Estado operativo público">
        <Link href="/observatory?source=home&metric=signal"><span>SIGNAL STATE</span><strong>{label(state.signalState.value, label(state.signalState.status))}</strong><small>{state.signalState.detail}</small><em>OBSERVATORY ↗</em></Link>
        <Link href="/friction?source=home&metric=friction"><span>FRICTION</span><strong>{label(state.frictionLevel.value)}</strong><small>{label(state.frictionLevel.trend)}</small><em>FRICTION ↗</em></Link>
        <Link href="/observatory?source=home&metric=coherence"><span>FIELD COHERENCE</span><strong>{label(state.fieldCoherence.value)}</strong><small>{label(state.fieldCoherence.trend)}</small><em>OBSERVATORY ↗</em></Link>
        <Link href="/login?next=/root"><span>PREDICTIONS</span><strong>{label(state.predictions.value)}</strong><small>{state.predictions.detail}</small><em>GOVERNED ↗</em></Link>
        <Link href="/atlas?source=home&metric=attractor"><span>ATTRACTOR COVERAGE</span><strong>{coverage}</strong><small>{attractor.activePhenomena} active phenomenon trajectories</small><em>ATLAS ↗</em></Link>
      </section>

      <section className="is-method">
        <header><span>OPERATING PRINCIPLE</span><h2>Evidence → trajectory → perturbation → return.</h2></header>
        <div className="is-method-grid">
          <Link href="/observatory?source=home&phase=observe"><span>01 / OBSERVE</span><h3>Separate signal from explanation.</h3><p>Source, timestamp, reliability and lineage remain attached to what is observed. Missing evidence remains missing.</p><em>ENTER OBSERVATORY ↗</em></Link>
          <Link href="/mihm?source=home&phase=model"><span>02 / MODEL</span><h3>Represent competing trajectories.</h3><p>MIHM, WorldSpect, attractors and the Cognitive Twin are instruments. Their outputs remain method-scoped rather than universal claims.</p><em>EXPLORE MIHM ↗</em></Link>
          <Link href="/field?source=home&phase=test"><span>03 / TEST</span><h3>Intervene only at the minimum useful scale.</h3><p>A proposal does not become knowledge until a return window closes and the observed outcome can contradict the original hypothesis.</p><em>ENTER FIELD ↗</em></Link>
        </div>
      </section>

      <section className="is-organs">
        <header><span>PUBLIC ARCHITECTURE</span><h2>The narrative resolves into real institutional surfaces.</h2></header>
        <div className="is-organ-grid">
          {publicSurfaces.map((surface) => (
            <Link key={surface.key} href={surface.href}>
              <span>{surface.key} / {surface.phase}</span>
              <strong>{surface.label}</strong>
              <p>{surface.detail}</p>
              <small>{surface.access}</small>
              <em>OPEN SURFACE →</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="is-governed">
        <header><span>ACCESS BOUNDARY</span><h2>Some organs can be inspected publicly. Others require identity and governance.</h2></header>
        <div className="is-governed-grid">
          {governedSurfaces.map((surface) => (
            <Link key={surface.key} href={surface.href}>
              <div><span>{surface.key} / {surface.phase}</span><small>{surface.access}</small></div>
              <strong>{surface.label}</strong>
              <p>{surface.detail}</p>
              <em>ENTER THROUGH ACCESS →</em>
            </Link>
          ))}
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
        <Link href="/repository?source=home&phase=truth-boundary">INSPECT CANON + METHODS →</Link>
      </section>

      <section className="is-convergence" aria-label="Convergencia institucional">
        <div className="is-convergence-copy">
          <span>RESOLUTION</span>
          <h2>The field does not end here.</h2>
          <p>The mark is intentionally incomplete. Recognition is produced by relation and density rather than by drawing the letters as a finished object.</p>
        </div>
        <div className="is-particle-field" aria-hidden="true">
          <svg viewBox="0 0 720 190" role="presentation">
            {convergencePoints.map(([cx, cy, r, opacity], index) => <circle key={index} cx={cx} cy={cy} r={r} opacity={opacity} />)}
          </svg>
        </div>
      </section>

      <section className="is-resolution" aria-label="Siguientes entradas">
        <Link href="/observatory?source=home&phase=resolution"><span>OBSERVE</span><strong>OBSERVATORY</strong><p>Ver señales, evidencia pública, trayectorias y cambio.</p><em>ENTER ↗</em></Link>
        <Link href="/contact?source=home&phase=resolution"><span>ENGAGE</span><strong>FIELD / INTAKE</strong><p>Introducir un caso, sistema, colaboración o problema al campo institucional.</p><em>BEGIN ↗</em></Link>
        <Link href="/login?next=/studio"><span>ACCESS</span><strong>SIGN IN</strong><p>Continuar hacia Studio o las superficies gobernadas según identidad y rol.</p><em>AUTHENTICATE ↗</em></Link>
      </section>

      <footer className="is-footer"><div><strong>SYSTEM FRICTION INSTITUTE</strong><span>ONTO · EPISTE · BIO · DIGITAL · ANTROPO · PSYCHO · AESTHETIC · NEURO ARCHITECTURES</span></div><div><Link href="/privacy">PRIVACY</Link><Link href="/contact">ENGAGE</Link><Link href="/login?next=/studio">ACCESS</Link></div></footer>
    </main>
  );
}

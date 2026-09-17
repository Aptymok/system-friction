import Link from 'next/link';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';

export const dynamic = 'force-dynamic';

const PUBLIC_NAV = [
  ['/observatory','OBSERVATORY'],
  ['/publications','PUBLICATIONS'],
  ['/library','LIBRARY'],
  ['/institution','INSTITUTE'],
] as const;

const CURRENT_PUBLIC_SURFACES = [
  { path: '/observatory', role: 'Observación viva del campo, fuentes, hipótesis, trayectoria y contraste.' },
  { path: '/publications', role: 'Archivo editorial: notas, casos, métodos y RETURN publicados.' },
  { path: '/library', role: 'Conocimiento conectado, métodos, instrumentos y procedencia.' },
  { path: '/institution', role: 'Identidad, autoridad, límites e invariantes institucionales.' },
  { path: '/history', role: 'Historia institucional observada con procedencia.' },
  { path: '/privacy', role: 'Política de privacidad y tratamiento de datos para agentes externos.' },
] as const;

export default function InstitutionPage() {
  const p = SFI_PUBLIC_PROFILE;

  return <main className="institutionPage">
    <header className="sfiPublicTopbar">
      <Link href="/" className="sfiPublicBrand"><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></Link>
      <nav>{PUBLIC_NAV.map(([href,label]) => <Link key={href} href={href} data-active={href === '/institution' ? 'true' : 'false'}>{label}</Link>)}</nav>
      <Link href="/login" className="sfiPublicAccess">SIGN IN</Link>
    </header>

    <section className="institutionHero">
      <div className="institutionHeroCopy">
        <span>INSTITUTO · IDENTIDAD / AUTORIDAD / PROCEDENCIA</span>
        <h1>Instituto</h1>
        <h2>Una institución para observar, pensar y reorganizar la realidad.</h2>
        <p>{p.institution.operationalDefinition}</p>
      </div>
    </section>

    <section className="institutionBand" aria-label="Institution facts">
      <article><span>DEFINICIÓN</span><strong>{p.institution.primaryDefinition}</strong></article>
      <article><span>PRINCIPIO OPERATIVO</span><strong>{p.operatingPrinciple}</strong></article>
      <article><span>PREGUNTA CANÓNICA</span><strong>{p.institution.canonicalQuestion}</strong></article>
      <article><span>ACCESO MÁQUINA</span><strong>Separado de la lectura humana; trazable y gobernado.</strong></article>
    </section>

    <section className="institutionSection">
      <header><span>01 · QUÉ HACE SFI</span><b>Observar. Contrastar. Actuar. Retornar.</b></header>
      <div className="institutionGrid">
        {p.instruments.map((item) => <article className="institutionCard" key={item.key}>
          <span>{item.key}</span><h3>{item.name}</h3><p>{item.role}</p>
        </article>)}
      </div>
    </section>

    <section className="institutionSection">
      <header><span>02 · CICLO OPERATIVO</span><b>El conocimiento debe conservar cómo cambió.</b></header>
      <div className="institutionLifecycle">{p.lifecycle.map((item,index) => <span key={item}>{String(index + 1).padStart(2,'0')} · {item}</span>)}</div>
    </section>

    <section className="institutionSection">
      <header><span>03 · AUTORIDAD Y LÍMITES</span><b>Capacidad no equivale a autoridad.</b></header>
      <div className="institutionBoundary">{p.invariants.map((item,index) => <article key={item}><h3>{String(index + 1).padStart(2,'0')}</h3><p>{item}</p></article>)}</div>
    </section>

    <section className="institutionSection">
      <header><span>04 · SUPERFICIES PÚBLICAS</span><b>Una institución, distintas profundidades.</b></header>
      <div className="institutionLinks">{CURRENT_PUBLIC_SURFACES.map((surface) => <Link key={surface.path} href={surface.path}><code>{surface.path}</code><span>{surface.role}</span></Link>)}</div>
    </section>
  </main>;
}

import Link from 'next/link';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';
import './institution.css';

export const dynamic = 'force-dynamic';

const PUBLIC_NAV = [
  ['/observatory','OBSERVATORY'],
  ['/publications','PUBLICATIONS'],
  ['/library','LIBRARY'],
  ['/field','FIELD'],
  ['/institution','INSTITUTE'],
] as const;

const PUBLIC_INSTRUMENT_NAMES: Record<string,string> = {
  MIHM:'Integrated Multivariable Homeostasis Framework',
  'MOP-H':'Minimal Observation and Perturbation Protocol',
  WorldSpect:'World Spectrum Observation',
  'World Vector':'World Vector',
  AMV:'Adaptive Meta-Observer',
  Atlas:'Atlas / SFI Reference Bank',
  'Cognitive Twin':'Cognitive Twin',
  'Method Lab':'Method Lab',
};

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
        <span>INSTITUTE · IDENTITY / AUTHORITY / PROVENANCE</span>
        <h1>Institute</h1>
        <h2>An institution for observing, reasoning about and reorganizing reality.</h2>
        <p>{p.institution.operationalDefinition}</p>
      </div>
    </section>

    <section className="institutionBand" aria-label="Institution facts">
      <article><span>DEFINITION</span><strong>{p.institution.primaryDefinition}</strong></article>
      <article><span>OPERATING PRINCIPLE</span><strong>{p.operatingPrinciple}</strong></article>
      <article><span>CANONICAL QUESTION</span><strong>{p.institution.canonicalQuestion}</strong></article>
      <article><span>MACHINE ACCESS</span><strong>Separated from human reading; traceable and governed.</strong></article>
    </section>

    <section className="institutionSection">
      <header><span>01 · WHAT SFI DOES</span><b>Observe. Contrast. Act. Return.</b></header>
      <div className="institutionGrid">
        {p.instruments.map((item) => <article className="institutionCard" key={item.key}>
          <span>{item.key}</span><h3>{PUBLIC_INSTRUMENT_NAMES[item.key] ?? item.name}</h3><p>{item.role}</p>
        </article>)}
      </div>
    </section>

    <section className="institutionSection">
      <header><span>02 · OPERATING CYCLE</span><b>Knowledge must preserve how it changed.</b></header>
      <div className="institutionLifecycle">{p.lifecycle.map((item,index) => <span key={item}>{String(index + 1).padStart(2,'0')} · {item}</span>)}</div>
    </section>

    <section className="institutionSection">
      <header><span>03 · AUTHORITY AND LIMITS</span><b>Capability does not equal authority.</b></header>
      <div className="institutionBoundary">{p.invariants.map((item,index) => <article key={item}><h3>{String(index + 1).padStart(2,'0')}</h3><p>{item}</p></article>)}</div>
    </section>

    <section className="institutionSection">
      <header><span>04 · PUBLIC SURFACES</span><b>One institution, different depths.</b></header>
      <div className="institutionLinks">{p.publicSurfaces.map((surface) => <Link key={surface.path} href={surface.path}><code>{surface.path}</code><span>{surface.role}</span></Link>)}</div>
    </section>
  </main>;
}

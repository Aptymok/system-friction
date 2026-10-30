import type { Metadata } from 'next';
import Link from 'next/link';
import { SFI_PUBLIC_SERVICES, SFI_SERVICE_AREAS } from '@/lib/public/sfiServiceCatalog';
import './services.css';

export const metadata:Metadata={title:'Services — System Friction Institute',description:'Research, diagnostic and evidence services. Ten clear profiles and an initial inquiry without creating an account.',alternates:{canonical:'/servicios'}};

export default function ServiciosPage(){
  return <main className="sfiServices" id="contenido"><div className="sfiServicesWrap">
    <header className="sfiServicesHero">
      <p className="sfiServicesKicker">SYSTEM FRICTION INSTITUTE / SERVICES</p>
      <h1>Understand the problem.<br/><em>Find out what can be established.</em></h1>
      <p className="sfiServicesIntro">SFI investigates decisions, organizations and complex systems. We distinguish documented facts, explanations and what remains unknown.</p>
      <div className="sfiServicesButtons"><Link className="sfiServicesButton" href="/servicios/solicitar">Tell us about your problem ↗</Link><a href="#catalogo">Explore services ↓</a></div>
      <p className="sfiServicesCaption">No account required to start. Scope, cost and permissions are agreed before private work.</p>
    </header>
    <section className="sfiServicesCaseTeaser" aria-label="Guided case study">
       <div><p className="sfiServicesKicker">TRY A CASE / AI WEEK NYC 2026</p><h2>What happens when AI says the risk is zero?</h2><p>Explore a fictional USD 42 million decision, inspect five exhibits, and classify what the record really establishes. Nothing runs automatically.</p><small>SYNTHETIC TRAINING CASE · NOT A REAL CLIENT CLAIM</small></div>
       <Link className="sfiServicesButton" href="/servicios/case-study/ai-week-nyc-2026">Start the manual case walkthrough ↗</Link>
     </section>
     <section id="catalogo" className="sfiServicesCatalog" aria-labelledby="servicios-titulo">
      <div className="sfiServicesSectionHeader"><div><p className="sfiServicesKicker">01—10 / SERVICE CATALOG</p><h2 id="servicios-titulo">What do you need to understand?</h2></div><p>Each service describes the question, proposed deliverables and limitations. No technical vocabulary is required.</p></div>
      <nav className="sfiServicesChips" aria-label="Service categories">{SFI_SERVICE_AREAS.map(a=><a href={`#area-${a.id}`} key={a.id}>{a.label}</a>)}</nav>
      {SFI_SERVICE_AREAS.map(a=><section className="sfiServicesArea" id={`area-${a.id}`} key={a.id}>
        <div className="sfiServicesAreaTitle"><h3>{a.label}</h3><p>{a.description}</p></div>
        <div className="sfiServicesCards">{SFI_PUBLIC_SERVICES.filter(s=>s.group===a.id).map(s=><article key={s.canonicalId} className="sfiServicesCard">
          <small>{s.number} / SERVICE</small><h4><Link href={`/servicios/${s.slug}`}>{s.title}</Link></h4><strong>{s.question}</strong><p>{s.summary}</p>
          <Link className="sfiServicesCardLink" href={`/servicios/${s.slug}`}>Explore this service ↗</Link>
        </article>)}</div>
      </section>)}
    </section>
    <section className="sfiServicesClosing"><div><p className="sfiServicesKicker">FIRST CONTACT</p><h2>Begin with a question.<br/>Create an account only if needed.</h2><p>Tell us what is happening without uploading confidential files. We review scope and evidence needs before proposing an engagement.</p></div><Link className="sfiServicesButton" href="/servicios/solicitar">Request an assessment ↗</Link></section>
    <footer className="sfiServicesFooter"><span>Service profiles are defined offerings, not certifications or guarantees.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
  </div></main>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { SFI_PUBLIC_SERVICES, SFI_SERVICE_AREAS } from '@/lib/public/sfiServiceCatalog';
import './services.css';

export const metadata:Metadata={title:'Servicios — System Friction Institute',description:'Servicios de investigación, diagnóstico y evidencia de SFI. Diez perfiles, alcances claros y solicitud inicial sin cuenta.',alternates:{canonical:'/servicios'}};

export default function ServiciosPage(){
  return <main className="sfiServices" id="contenido"><div className="sfiServicesWrap">
    <header className="sfiServicesHero">
      <p className="sfiServicesKicker">SYSTEM FRICTION INSTITUTE / SERVICIOS</p>
      <h1>Entender un problema.<br/><em>Descubrir qué puede comprobarse.</em></h1>
      <p className="sfiServicesIntro">Investigamos decisiones, organizaciones y sistemas complejos. Te ayudamos a distinguir lo que sabemos, lo que falta y qué podemos verificar.</p>
      <div className="sfiServicesButtons"><Link className="sfiServicesButton" href="/servicios/solicitar">Cuéntanos tu problema ↗</Link><a href="#catalogo">Explorar servicios ↓</a></div>
      <p className="sfiServicesCaption">Sin cuenta inicial · Alcance y coste acordados antes de cualquier trabajo privado.</p>
    </header>
    <section id="catalogo" className="sfiServicesCatalog" aria-labelledby="servicios-titulo">
      <div className="sfiServicesSectionHeader"><div><p className="sfiServicesKicker">01—10 / CATÁLOGO</p><h2 id="servicios-titulo">¿Qué necesitas resolver?</h2></div><p>Cada ficha explica el problema, los resultados propuestos y sus límites. No necesitas conocer nuestros instrumentos.</p></div>
      <nav className="sfiServicesChips" aria-label="Categorías">{SFI_SERVICE_AREAS.map(a=><a href={`#area-${a.id}`} key={a.id}>{a.label}</a>)}</nav>
      {SFI_SERVICE_AREAS.map(a=><section className="sfiServicesArea" id={`area-${a.id}`} key={a.id}>
        <div className="sfiServicesAreaTitle"><h3>{a.label}</h3><p>{a.description}</p></div>
        <div className="sfiServicesCards">{SFI_PUBLIC_SERVICES.filter(s=>s.group===a.id).map(s=><article key={s.canonicalId} className="sfiServicesCard">
          <small>{s.number} / SERVICIO</small><h4><Link href={`/servicios/${s.slug}`}>{s.title}</Link></h4><strong>{s.question}</strong><p>{s.summary}</p>
          <Link className="sfiServicesCardLink" href={`/servicios/${s.slug}`}>Conocer este servicio ↗</Link>
        </article>)}</div>
      </section>)}
    </section>
    <section className="sfiServicesClosing"><div><p className="sfiServicesKicker">PRIMER CONTACTO</p><h2>Una pregunta primero.<br/>Una cuenta, solo cuando haga falta.</h2><p>Describe tu situación sin archivos confidenciales. Revisaremos alcance, evidencia y condiciones antes de proponerte trabajar en un expediente.</p></div><Link className="sfiServicesButton" href="/servicios/solicitar">Solicitar evaluación ↗</Link></section>
    <footer className="sfiServicesFooter"><span>Los servicios son perfiles definidos, no certificaciones ni promesas de resultados.</span><div><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link></div></footer>
  </div></main>;
}

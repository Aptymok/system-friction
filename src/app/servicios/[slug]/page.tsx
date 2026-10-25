import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serviceBySlug, SFI_PUBLIC_SERVICES } from '@/lib/public/sfiServiceCatalog';
import '../services.css';
type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return SFI_PUBLIC_SERVICES.map(s=>({slug:s.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;const s=serviceBySlug(slug);
 return s?{title:`${s.title} — Servicios SFI`,description:s.summary,alternates:{canonical:`/servicios/${slug}`}}:{title:'Servicio no encontrado'};
}
export default async function ServiceDetail({params}:Props){
 const {slug}=await params;const s=serviceBySlug(slug);if(!s)notFound();
 return <main className="sfiServices sfiServicesDetail" id="contenido"><div className="sfiServicesWrap">
  <nav className="sfiServicesBreadcrumb" aria-label="Ruta"><Link href="/servicios">Servicios</Link><span aria-hidden="true">/</span><span>{s.title}</span></nav>
  <header className="sfiServicesDetailHero"><p className="sfiServicesKicker">SERVICIO {s.number} / EVALUACIÓN POR ALCANCE</p><h1>{s.title}</h1><h2>{s.question}</h2><p className="sfiServicesIntro">{s.summary}</p>
   <Link className="sfiServicesButton" href={`/servicios/solicitar?servicio=${encodeURIComponent(s.slug)}`}>Solicitar evaluación inicial ↗</Link>
   <p className="sfiServicesCaption">No hace falta cuenta ni pago para plantear tu pregunta.</p>
  </header>
  <section className="sfiServicesDetailGrid" aria-label="Alcance del servicio">
   <article><small>01 / A QUIÉN AYUDA</small><h3>¿Para quién?</h3><p>{s.audience}</p></article>
   <article><small>02 / PUNTO DE PARTIDA</small><h3>¿Qué necesitamos?</h3><p>{s.inputs}</p><p className="sfiServicesMuted">No envíes aquí documentos privados: se definirán permisos antes de recibirlos.</p></article>
   <article><small>03 / PROPUESTA DE ENTREGA</small><h3>¿Qué recibirías?</h3><p>{s.deliverable}</p><p className="sfiServicesMuted">El formato definitivo se fija en la propuesta aceptada.</p></article>
   <article><small>04 / FRONTERAS</small><h3>¿Qué no prometemos?</h3><p>{s.limits}</p><p className="sfiServicesMuted">Una hipótesis o simulación no constituye un RETURN confirmado.</p></article>
  </section>
  <section className="sfiServicesProvenance"><div><p className="sfiServicesKicker">CONTRATO INSTITUCIONAL</p><h2>Un servicio explicado con claridad y un método que puedes revisar.</h2><p>El perfil existe en el catálogo canónico de SFI. La aceptación del caso, los resultados y las condiciones económicas requieren evaluación específica.</p></div><dl><dt>Perfil</dt><dd><code>{s.canonicalId}</code></dd><dt>Alcance</dt><dd>Por definir con el solicitante</dd><dt>Precio</dt><dd>A cotizar; sin tarifa vinculante publicada</dd><dt>Datos y acceso</dt><dd>Privados únicamente tras acuerdo y autorización</dd></dl></section>
  <div className="sfiServicesClosing"><div><h2>Cuéntanos lo que ocurre.</h2><p>La primera conversación sirve para saber si SFI puede investigar tu caso y qué haría falta.</p></div><Link className="sfiServicesButton" href={`/servicios/solicitar?servicio=${encodeURIComponent(s.slug)}`}>Iniciar solicitud ↗</Link></div>
  <footer className="sfiServicesFooter"><Link href="/servicios">← Todos los servicios</Link><div><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link></div></footer>
 </div></main>;
}
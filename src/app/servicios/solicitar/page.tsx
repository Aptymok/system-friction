import type { Metadata } from 'next';
import Link from 'next/link';
import { ServiceInquiryForm } from '@/components/sfi/ServiceInquiryForm';
import { SFI_PUBLIC_SERVICES } from '@/lib/public/sfiServiceCatalog';
import '../services.css';

export const metadata:Metadata={
 title:'Solicitar evaluación — Servicios SFI',
 description:'Explica tu problema a SFI sin crear una cuenta. Prepara tu solicitud y envíala desde tu correo.',
 alternates:{canonical:'/servicios/solicitar'},
};
export default async function SolicitarPage({searchParams}:{searchParams:Promise<{servicio?:string}>}){
 const params=await searchParams;
 const initial=SFI_PUBLIC_SERVICES.some(s=>s.slug===params.servicio)?String(params.servicio):'';
 return <main className="sfiServices sfiServicesRequest" id="contenido"><div className="sfiServicesWrap">
   <nav className="sfiServicesBreadcrumb" aria-label="Ruta"><Link href="/servicios">Servicios</Link><span>/</span><span>Solicitar evaluación</span></nav>
   <div className="sfiServicesRequestLayout">
    <header><p className="sfiServicesKicker">CONTACTO INICIAL · SIN REGISTRO</p>
      <h1>Empecemos por <em>tu pregunta.</em></h1>
      <p className="sfiServicesIntro">No necesitas una cuenta ni adjuntar documentos para averiguar si SFI puede ayudarte.</p>
      <div className="sfiServicesSteps"><h2>¿Qué ocurre después?</h2><ol>
        <li><strong>Describes el problema.</strong><span>Solo el contexto básico, sin información sensible.</span></li>
        <li><strong>Preparas y envías el correo.</strong><span>Tú decides cuándo enviarlo desde tu aplicación.</span></li>
        <li><strong>Revisamos la viabilidad.</strong><span>El alcance, coste, plazo y permisos se acuerdan antes de aceptar trabajo.</span></li>
      </ol></div>
    </header>
    <ServiceInquiryForm initialSlug={initial}/>
   </div>
   <footer className="sfiServicesFooter"><Link href="/servicios">← Volver a Servicios</Link><div><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link></div></footer>
 </div></main>;
}
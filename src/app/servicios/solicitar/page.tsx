import type { Metadata } from 'next';
import Link from 'next/link';
import { ServiceInquiryForm } from '@/components/sfi/ServiceInquiryForm';
import { SFI_PUBLIC_SERVICES } from '@/lib/public/sfiServiceCatalog';
import '../services.css';

export const metadata:Metadata={
 title:'Request an Assessment — SFI Services',
 description:'Describe your question without an account. Prepare and send your inquiry using your own email client.',
 alternates:{canonical:'/servicios/solicitar'},
};
export default async function SolicitarPage({searchParams}:{searchParams:Promise<{servicio?:string}>}){
 const params=await searchParams;
 const initial=SFI_PUBLIC_SERVICES.some(s=>s.slug===params.servicio)?String(params.servicio):'';
 return <main className="sfiServices sfiServicesRequest" id="contenido"><div className="sfiServicesWrap">
   <nav className="sfiServicesBreadcrumb" aria-label="Ruta"><Link href="/servicios">Services</Link><span>/</span><span>Request an assessment</span></nav>
   <div className="sfiServicesRequestLayout">
    <header><p className="sfiServicesKicker">FIRST CONTACT · NO ACCOUNT</p>
      <h1>Start with <em>your question.</em></h1>
      <p className="sfiServicesIntro">You do not need an account or documents to ask whether SFI can help.</p>
      <div className="sfiServicesSteps"><h2>What happens next?</h2><ol>
        <li><strong>Describe the issue.</strong><span>Share only the essentials, not confidential information.</span></li>
        <li><strong>Prepare and send the email.</strong><span>You decide when to send it from your email application.</span></li>
        <li><strong>We review the scope.</strong><span>Scope, cost, timeline and permissions are agreed before accepting work.</span></li>
      </ol></div>
    </header>
    <ServiceInquiryForm initialSlug={initial}/>
   </div>
   <footer className="sfiServicesFooter"><Link href="/servicios">← Back to Services</Link><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
 </div></main>;
}
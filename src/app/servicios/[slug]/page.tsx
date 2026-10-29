import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serviceBySlug, SFI_PUBLIC_SERVICES } from '@/lib/public/sfiServiceCatalog';
import '../services.css';
type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return SFI_PUBLIC_SERVICES.map(s=>({slug:s.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;const s=serviceBySlug(slug);
 return s?{title:`${s.title} — SFI Services`,description:s.summary,alternates:{canonical:`/servicios/${slug}`}}:{title:'Service not found'};
}
export default async function ServiceDetail({params}:Props){
 const {slug}=await params;const s=serviceBySlug(slug);if(!s)notFound();
 return <main className="sfiServices sfiServicesDetail" id="contenido"><div className="sfiServicesWrap">
  <nav className="sfiServicesBreadcrumb" aria-label="Ruta"><Link href="/servicios">Services</Link><span aria-hidden="true">/</span><span>{s.title}</span></nav>
  <header className="sfiServicesDetailHero"><p className="sfiServicesKicker">SERVICE {s.number} / SCOPE-BASED ASSESSMENT</p><h1>{s.title}</h1><h2>{s.question}</h2><p className="sfiServicesIntro">{s.summary}</p>
   <Link className="sfiServicesButton" href={`/servicios/solicitar?servicio=${encodeURIComponent(s.slug)}`}>Request an initial assessment ↗</Link>
   <p className="sfiServicesCaption">No account or payment is required to ask your first question.</p>
  </header>
  <section className="sfiServicesDetailGrid" aria-label="Service scope">
   <article><small>01 / WHO IT HELPS</small><h3>Who is it for?</h3><p>{s.audience}</p></article>
   <article><small>02 / STARTING MATERIAL</small><h3>What do we need?</h3><p>{s.inputs}</p><p className="sfiServicesMuted">Do not send private documents at this stage. Permissions come first.</p></article>
   <article><small>03 / PROPOSED DELIVERABLE</small><h3>What would you receive?</h3><p>{s.deliverable}</p><p className="sfiServicesMuted">The final format is agreed in the accepted proposal.</p></article>
   <article><small>04 / BOUNDARIES</small><h3>What we do not promise</h3><p>{s.limits}</p><p className="sfiServicesMuted">A hypothesis or simulation is not an observed real-world RETURN.</p></article>
  </section>
  <section className="sfiServicesProvenance"><div><p className="sfiServicesKicker">INSTITUTIONAL CONTRACT</p><h2>A clear service, with a method you can inspect.</h2><p>The profile is mapped to the canonical SFI catalog. Scope, acceptance criteria and price are agreed for each engagement.</p></div><dl><dt>Profile</dt><dd><code>{s.canonicalId}</code></dd><dt>Scope</dt><dd>Defined with the requester</dd><dt>Price</dt><dd>Quoted after scope review; no binding price published</dd><dt>Data and access</dt><dd>Private only after permission and agreement</dd></dl></section>
  <section className="sfiServicesManualPrompt">
    <p className="sfiServicesKicker">OBSERVE IT YOURSELF / MANUAL EXERCISE</p>
    <h2>What would you check first?</h2>
    <details><summary>Reveal an initial observation prompt</summary><p>{s.firstCheck}</p><p>Ask what is documented, what is inferred and which missing record would change the conclusion.</p></details>
    {s.canonicalId==='AI_GOVERNANCE_ASSURANCE'?<p><Link href="/servicios/case-study/ai-week-nyc-2026">Explore the AI Week NYC 2026 synthetic decision case ↗</Link></p>:null}
  </section><div className="sfiServicesClosing"><div><h2>Tell us what is happening.</h2><p>The first conversation establishes whether SFI can investigate, and what material would be needed.</p></div><Link className="sfiServicesButton" href={`/servicios/solicitar?servicio=${encodeURIComponent(s.slug)}`}>Start an inquiry ↗</Link></div>
  <footer className="sfiServicesFooter"><Link href="/servicios">← All services</Link><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
 </div></main>;
}
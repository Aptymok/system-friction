import type { Metadata } from 'next';
import Link from 'next/link';
import { AiWeekManualWalkthrough } from '@/components/sfi/AiWeekManualWalkthrough';
import '../../services.css';

export const metadata:Metadata={
 title:'AI Week NYC 2026 — Guided Decision Trace Exercise',
 description:'A manual, six-stage reconstruction of the synthetic RC-CASE-006 case from the SFI AI Week NYC 2026 Participant Casebook. No account or automated execution.',
 alternates:{canonical:'/servicios/case-study/ai-week-nyc-2026'},
};
export default function AiWeekCaseStudy(){
 return <main className="sfiServices sfiAiWeekPage" id="content">
  <div className="sfiServicesWrap">
   <nav className="sfiServicesBreadcrumb" aria-label="Breadcrumb"><Link href="/servicios">Services</Link><span>/</span><Link href="/servicios/evaluacion-de-decisiones-con-ia">AI Decision Assurance</Link><span>/</span><span>Guided case</span></nav>
   <header className="sfiAiWeekHero">
    <p className="sfiServicesKicker">AI WEEK NYC 2026 / PARTICIPANT CASEBOOK / RC-CASE-006</p>
    <h1>A USD 42 million decision. <em>What could the institution really know?</em></h1>
    <p className="sfiServicesIntro">A model recommended releasing a provision. A Treasurer approved. A transaction was recorded. Sixty days later, the case packet describes a new enforcement notice. Follow the evidence yourself.</p>
    <div className="sfiAiWeekTruth"><strong>SYNTHETIC LEARNING EXERCISE</strong><p>Infrastructure Group A, FL-Copilot v3.2, EXP-559/2025 and FID-8842 are fictional elements of a controlled teaching case. The exhibits are not independent evidence of real financial or legal events. This exercise is not the factual reconstruction of the AI Week conference itself.</p></div>
    <div className="sfiAiWeekFacts"><span><small>CASE ID</small><strong>RC-CASE-006</strong></span><span><small>CLAIMED PROVISION</small><strong>USD 42,000,000</strong></span><span><small>MODEL CLAIM</small><strong>0% residual risk</strong></span><span><small>PACKET RETURN</small><strong>T+60 notice</strong></span></div>
    <p className="sfiServicesCaption">Based on SFI AI Week NYC 2026 Participant Casebook, V1.0, 06 October 2026, pp. 1–7. All included assertions remain classified as synthetic packet content. The six questions preserve its observation, evidence, inference, authority, execution and RETURN framework.</p>
   </header>
   <AiWeekManualWalkthrough/>
   <section className="sfiAiWeekMethod">
    <div><p className="sfiServicesKicker">FROM AN EXERCISE TO A SERVICE</p><h2>What does SFI actually do?</h2><p>In a real engagement, Decision Trace works from authorized sources and tries to reconstruct the route from records to recommendation, approval, action and observed consequence. An unresolved link stays unresolved.</p></div>
    <div><h3>Six questions to keep asking</h3><ol><li>What was observed?</li><li>What counted as evidence?</li><li>What was inferred?</li><li>Who had authority?</li><li>What was executed?</li><li>What returned from the world?</li></ol><Link href="/servicios/evaluacion-de-decisiones-con-ia">See the AI Decision Assurance service ↗</Link><p className="sfiServicesCaption">The underlying Method Lab and Reality Chain remain separate institutional instruments; this is a manual public explanation, not a run in those systems.</p></div>
   </section>
   <footer className="sfiServicesFooter"><Link href="/servicios">← Explore all services</Link><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
  </div>
 </main>;
}
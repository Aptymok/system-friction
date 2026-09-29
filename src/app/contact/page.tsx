import type { Metadata } from 'next';
import { PublicContactForm } from '@/components/public/PublicContactForm';

export const metadata:Metadata={
  title:'Contact',
  description:'Contact System Friction Institute about research, institutional collaboration, evidence, publications or governed systems work.',
};

export default function ContactPage(){
  return <main className="sfiContactPage">
    <section className="sfiContactHero">
      <span>CONTACT / SYSTEM FRICTION INSTITUTE</span>
      <h1>Contact begins with a traceable message.</h1>
      <p>System Friction Institute receives research, institutional, publication and collaboration inquiries through this public channel. A submission records contact intent; it does not create a contract, endorsement, authority relationship or institutional validation.</p>
    </section>
    <section className="sfiContactBody">
      <aside>
        <span>PUBLIC CHANNEL</span>
        <h2>What should be included.</h2>
        <p>The sender should identify the organization or context, the object of the inquiry, the requested outcome and any relevant public evidence or reference.</p>
        <dl>
          <div><dt>RESEARCH</dt><dd>Methods, evidence, reproducibility and laboratory work.</dd></div>
          <div><dt>INSTITUTIONAL</dt><dd>Governance, observability, operational cases and bounded collaboration.</dd></div>
          <div><dt>PUBLICATIONS</dt><dd>Attribution, citations, corrections and publication questions.</dd></div>
        </dl>
      </aside>
      <PublicContactForm/>
    </section>
  </main>;
}

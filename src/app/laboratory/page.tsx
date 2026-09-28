import type { Metadata } from 'next';
import Link from 'next/link';
import { CanonicalCognitiveFieldPublic } from '@/components/sfi/CanonicalCognitiveFieldPublic';
import { SfiPublicHeader, SfiPublicFooter } from '@/components/public/SfiPublicChrome';
import './laboratory.css';

export const metadata:Metadata={
  title:'Laboratory · System Friction Institute',
  description:'A public, human-readable view of SFI methods, cognitive field and experimental boundaries.',
  alternates:{canonical:'https://systemfriction.org/laboratory'},
  robots:{index:true,follow:true},
};

const HUMAN_LAYERS=[
  ['OBSERVATION','What can be recorded about a bounded world or system.'],
  ['EVIDENCE','What is traceable enough to support or challenge a claim.'],
  ['HYPOTHESIS','What SFI believes may be true before the later world answers back.'],
  ['METHOD','How an instrument transforms inputs without changing their epistemic class.'],
  ['AUTHORITY','Who is allowed to authorize a consequential action.'],
  ['EXECUTION','What was actually done under that authority.'],
  ['RETURN','What later came back from the world after action or time.'],
  ['LEARNING','What may be retained only after contrast and governed promotion.'],
] as const;

export default function LaboratoryPage(){
  return <main className="publicLab">
    <SfiPublicHeader active="/laboratory"/>

    <section className="publicLabHero">
      <div>
        <small>RESEARCH = LABORATORY</small>
        <h1>How SFI thinks without turning a model into reality.</h1>
        <p>The public Laboratory explains the instruments, boundaries and cognitive structure behind SFI. The governed Method Lab workspace remains authenticated because experiments, evidence selection and institutional runs are not public actions.</p>
        <div className="publicLabActions">
          <a href="#cognitive-field">EXPLORE THE COGNITIVE FIELD ↓</a>
          <Link href="/login?next=%2Fmethod-lab">SIGN IN TO METHOD LAB →</Link>
        </div>
      </div>
      <aside>
        <small>HUMAN RULE</small>
        <strong>One graph. Many readings.</strong>
        <p>Changing the lens may reorganize what you see. It must not create another truth, another evidence base or another authority layer.</p>
      </aside>
    </section>

    <section className="publicLabLayers" aria-labelledby="human-layers-title">
      <header><small>THE HUMAN VERSION</small><h2 id="human-layers-title">Eight things SFI refuses to collapse into one.</h2></header>
      <div>{HUMAN_LAYERS.map(([name,description],index)=><article key={name}><span>{String(index+1).padStart(2,'0')}</span><strong>{name}</strong><p>{description}</p></article>)}</div>
    </section>

    <div id="cognitive-field"><CanonicalCognitiveFieldPublic/></div>

    <section className="publicLabMethod">
      <header><small>WHAT THE LABORATORY IS FOR</small><h2>Test the instrument before trusting the conclusion.</h2></header>
      <div>
        <article><b>METHODS</b><p>Define what is being measured, transformed or simulated and what remains outside the method.</p></article>
        <article><b>REPRODUCIBILITY</b><p>Keep inputs, definition hashes, parameters, seeds, code references and result hashes separate enough to replay a run.</p></article>
        <article><b>CONTRAST</b><p>A result becomes informative when it can meet later observations, rival explanations or a RETURN window.</p></article>
        <article><b>LIMITS</b><p>A laboratory run can remain simulated, incomplete or inconclusive. Persistence does not make it true.</p></article>
      </div>
    </section>

    <SfiPublicFooter/>
  </main>;
}

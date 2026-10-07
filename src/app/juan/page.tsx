import type { Metadata } from 'next';
import styles from './page.module.css';

const BASE='https://systemfriction.org';
const CARD_URL=`${BASE}/juan`;
const LINKEDIN_JUAN='https://www.linkedin.com/in/juanliera/';
const LINKEDIN_SFI='https://www.linkedin.com/company/system-friction-institute/';
const WHATSAPP='https://wa.me/5214496370444?text=Hello%20Juan%20%E2%80%94%20I%27m%20contacting%20you%20from%20your%20SFI%20digital%20contact%20card.';

const caseSubject=encodeURIComponent('Case for System Friction Institute');
const caseBody=encodeURIComponent(`Hello Juan,

I am contacting you from your SFI digital contact card.

I have a case that may be useful to reconstruct.

Organization / domain:
AI-assisted decision or process:
Why it matters:
What I can share:
What remains unknown:
Preferred next step:

No confidential details are required in this first message.`);

export const metadata:Metadata={
  title:'Juan Antonio Marín Liera — Digital Contact Card',
  description:'Juan Antonio Marín Liera · Founder, System Friction Institute. Save contact, send a case to SFI, or continue the conversation.',
  alternates:{canonical:'/juan'},
  openGraph:{
    type:'profile',
    url:CARD_URL,
    title:'Juan Antonio Marín Liera · System Friction Institute',
    description:'Digital contact card · Save contact · Send a case to SFI · Continue the conversation.',
  },
  robots:{index:true,follow:true},
};

const personLd={
  '@context':'https://schema.org',
  '@type':'Person',
  name:'Juan Antonio Marín Liera',
  jobTitle:'Founder',
  url:CARD_URL,
  email:'mailto:jmarin@systemfriction.org',
  telephone:'+52 1 449 637 0444',
  worksFor:{
    '@type':'ResearchOrganization',
    name:'System Friction Institute',
    url:BASE,
  },
  sameAs:[LINKEDIN_JUAN,LINKEDIN_SFI],
};

function Arrow(){return <span aria-hidden="true">↗</span>}

export default function JuanDigitalContactCard(){
  const caseHref=`mailto:jmarin@systemfriction.org?subject=${caseSubject}&body=${caseBody}`;

  return <main className={styles.surface}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(personLd)}}/>

    <div className={styles.atmosphere} aria-hidden="true">
      <div className={styles.halo}/>
      <div className={styles.grid}/>
      <img className={styles.ghostMark} src="/library/assets/sfi-mark.svg" alt=""/>
    </div>

    <section className={styles.frame} aria-label="Juan Antonio Marín Liera digital contact card">
      <div className={styles.meta}>
        <span>PUBLIC CONTACT OBJECT</span>
        <span>FOUNDER / SFI</span>
        <span>DIRECT · CONSENTED ACTIONS</span>
      </div>

      <div className={styles.card}>
        <div className={styles.identity}>
          <div className={styles.brandLine}>
            <img src="/library/assets/sfi-mark.svg" alt="" aria-hidden="true"/>
            <span>SYSTEM FRICTION INSTITUTE</span>
          </div>

          <p className={styles.kicker}>DIGITAL CONTACT CARD</p>
          <h1>Juan Antonio<br/>Marín Liera</h1>
          <p className={styles.role}>Founder · System Friction Institute</p>
          <p className={styles.statement}>Nothing acts alone.<br/>Reality answers back.</p>

          <div className={styles.primaryActions}>
            <a className={styles.primary} href="/juan/contact.vcf">
              <span>SAVE CONTACT</span><Arrow/>
            </a>
            <a className={styles.secondary} href={caseHref}>
              <span>SEND A CASE TO SFI</span><Arrow/>
            </a>
          </div>

          <p className={styles.boundary}>No automatic submission occurs. Your mail or messaging app opens first, and you decide what is sent.</p>
        </div>

        <aside className={styles.channels} aria-label="Contact channels">
          <div className={styles.channelHeader}>
            <span>CONTINUE THE CONVERSATION</span>
            <i/>
          </div>

          <a href={WHATSAPP} target="_blank" rel="noreferrer">
            <small>WHATSAPP</small>
            <strong>+52 1 449 637 0444</strong>
            <Arrow/>
          </a>

          <a href="mailto:jmarin@systemfriction.org">
            <small>EMAIL</small>
            <strong>jmarin@systemfriction.org</strong>
            <Arrow/>
          </a>

          <a href={BASE} target="_blank" rel="noreferrer">
            <small>INSTITUTION</small>
            <strong>systemfriction.org</strong>
            <Arrow/>
          </a>

          <a href={LINKEDIN_JUAN} target="_blank" rel="me noreferrer">
            <small>LINKEDIN</small>
            <strong>Juan Antonio Marín Liera</strong>
            <Arrow/>
          </a>

          <a href={LINKEDIN_SFI} target="_blank" rel="noreferrer">
            <small>LINKEDIN · SFI</small>
            <strong>System Friction Institute</strong>
            <Arrow/>
          </a>

          <div className={styles.caseNote}>
            <span>SEND A CASE</span>
            <p>Start with the decision or process. You do not need to disclose confidential details in the first message.</p>
          </div>
        </aside>
      </div>

      <footer className={styles.objectFooter}>
        <span>JUAN ANTONIO MARÍN LIERA</span>
        <span className={styles.chain}>EVIDENCE <i>›</i> INFERENCE <i>›</i> AUTHORITY <i>›</i> ACTION <i>›</i> RETURN</span>
        <span>systemfriction.org/juan</span>
      </footer>
    </section>
  </main>;
}

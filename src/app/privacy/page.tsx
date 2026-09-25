import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy & External Agent Data Policy',
  description: 'Privacy, analytics, consent and governed external-agent data policy for System Friction Institute.',
  alternates: { canonical: '/privacy' },
};

const sections = [
  {
    title: '1. Scope',
    body: [
      'This policy describes how System Friction Institute (SFI) handles data associated with its public surfaces, web analytics, authenticated interfaces and External Agent Gateway.',
      'SFI keeps observation, evidence, inference, proposal, authorization, execution and RETURN distinct. The existence of a technical record does not by itself turn that record into evidence about a person, organization or phenomenon.',
    ],
  },
  {
    title: '2. Data that may be processed',
    body: [
      'Public surfaces may process technical navigation data, visited page, date and time, device or browser, campaign origin and instrument-usage events, subject to the applicable consent configuration.',
      'Authenticated or agentic/API surfaces may process technical identifiers for the principal or agent, tenant or workspace where applicable, granted scopes, requested operation, timestamps, SFI object identifiers, evidence references, runtime results and audit traces.',
      'Access credentials are used to authenticate and authorize operations. SFI must not expose tokens, service-role secrets or credentials in public responses, reports or indexable resources.',
    ],
  },
  {
    title: '3. External Agent Gateway',
    body: [
      'Authorized AI clients may use the SFI external gateway to observe permitted surfaces, propose actions, perform already-authorized internal actions and operate Method Lab functions according to scopes and authority.',
      'External proposals do not self-approve. Approval and canonical promotion remain separate governance decisions. Lab operations that require root_delegate preserve traceability and provenance.',
      'SFI may record actorId, credential label, scopes, operation, affected object, referenced evidence, result and timestamps for security, audit, calibration and institutional continuity.',
    ],
  },
  {
    title: '4. Method Lab, Cognitive Twin and learning',
    body: [
      'An observation persisted in Method Lab may enter the epistemic ledger with provenance. Analyses, Cognitive Twin evaluations, predictions and outcomes may be preserved for longitudinal reconstruction and calibration.',
      'The Cognitive Twin must not automatically promote an inference to canonical fact. Institutional learning is based on observable RETURN, comparison with outcomes, error, evidence and governance, not solely on model-generated text.',
    ],
  },
  {
    title: '5. Google Analytics and consent',
    body: [
      'SFI uses Google Analytics 4 to measure navigation and use of public surfaces. The implementation uses Consent Mode v2 with analytics_storage, ad_storage, ad_user_data and ad_personalization denied by default until a consent choice exists.',
      'When a person accepts or rejects, SFI updates that consent state. Public analytics must not send free-text evidence, private objectives, names, email addresses, account identifiers or authenticated content as event parameters.',
      'The data and modeling available to Google depend on consent, Google configuration and applicable jurisdiction. Technical configuration does not replace legal obligations that may apply to a specific organization or territory.',
    ],
  },
  {
    title: '6. Purposes',
    body: [
      'Data is processed to operate SFI, authenticate and authorize agents, maintain security and auditability, reconstruct decision history, measure technical performance, evaluate predictions, produce governed reports and improve instruments through documented outcomes.',
      'SFI does not use an isolated public signal to infer undeclared psychological states and must not convert attention metrics into authority, causality or methodological validation.',
    ],
  },
  {
    title: '7. Sharing and providers',
    body: [
      'SFI may use technical providers required for hosting, databases, observability, analytics, language models or infrastructure execution. Each provider receives only the context required for the relevant operation, according to available configuration and permissions.',
      'An authorized external integration, including an AI client, operates within its granted scopes. An agent\'s access to one surface does not imply access to ROOT, private data, restricted evidence or execution authority that has not been granted.',
    ],
  },
  {
    title: '8. Retention, audit and security',
    body: [
      'Retention periods may vary by record class. Evidence, decisions, RETURN, predictions and audit events may be preserved longitudinally when required for traceability, research, security or governance.',
      'SFI applies authority separation, scopes, operation traceability and provenance recording. No technical mechanism eliminates risk completely; controls are reviewed as infrastructure changes.',
    ],
  },
  {
    title: '9. Rights, requests and contact',
    body: [
      'Requests related to access, correction, deletion, consent or data processing may be directed through the SFI institutional contact surface. The applicable response depends on the nature of the data, the relationship with SFI and the relevant law.',
      'Institutional contact: https://systemfriction.org/contact',
    ],
  },
  {
    title: '10. Resources for agents and models',
    body: [
      'SFI public machine-readable resources include /llms.txt, /llms-full.txt, /ai-index.json, /field-schema.json, /openapi.json and /api/external/v1/manifest. These resources describe public capabilities and interpretation rules; they do not grant authority by themselves.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#080806', color: '#d7c29a', padding: 'clamp(32px,6vw,88px) 24px', fontFamily: 'Georgia, Times New Roman, serif' }}>
      <article style={{ maxWidth: 980, margin: '0 auto', border: '1px solid rgba(205,164,93,.24)', background: 'linear-gradient(180deg,rgba(24,20,13,.72),rgba(8,8,6,.94))', boxShadow: '0 30px 90px rgba(0,0,0,.45)', padding: 'clamp(28px,5vw,68px)' }}>
        <p style={{ margin: 0, color: '#a9864d', letterSpacing: '.24em', fontSize: 12 }}>SYSTEM FRICTION INSTITUTE · GOVERNANCE</p>
        <h1 style={{ margin: '14px 0 10px', color: '#e1bd79', fontSize: 'clamp(34px,5vw,64px)', fontWeight: 400, lineHeight: 1.04 }}>Privacy & External Agent Data Policy</h1>
        <p style={{ margin: '0 0 36px', maxWidth: 760, color: '#b9aa8e', fontFamily: 'system-ui, sans-serif', lineHeight: 1.7 }}>Privacy, consent, analytics and data handling for SFI human-facing surfaces and external agents.</p>

        <div style={{ borderTop: '1px solid rgba(205,164,93,.18)' }}>
          {sections.map((section) => (
            <section key={section.title} style={{ padding: '28px 0', borderBottom: '1px solid rgba(205,164,93,.14)' }}>
              <h2 style={{ margin: '0 0 14px', color: '#d3ad6a', fontSize: 20, fontWeight: 400, letterSpacing: '.04em' }}>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} style={{ margin: '10px 0', color: '#c6baa4', fontFamily: 'system-ui, sans-serif', fontSize: 15, lineHeight: 1.75 }}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <footer style={{ paddingTop: 28, color: '#7f725d', fontFamily: 'system-ui, sans-serif', fontSize: 12, lineHeight: 1.7 }}>
          <div>Last updated: August 22, 2026.</div>
          <div>Canonical: https://systemfriction.org/privacy</div>
          <div style={{ marginTop: 12 }}>This page describes SFI public operating policy and does not by itself constitute legal advice or a certification of compliance for every jurisdiction.</div>
        </footer>
      </article>
    </main>
  );
}

import { SFI_SERVICE_PROFILES } from '@/core/case-platform/serviceProfiles';
import type { SfiServiceProfileId } from '@/core/contracts/commercial';

// Human-readable editorial projection of the ten existing canonical profiles.
// Descriptions follow the SFI Institutional and Master Operational Atlases (2026).
// This is an invitation to request an assessment, not a public execution grant.
export type SfiServiceArea = 'ia' | 'operaciones' | 'memoria' | 'investigacion';
type ServiceCopy = {
  slug:string; number:string; group:SfiServiceArea; title:string;
  question:string; summary:string; audience:string; inputs:string;
  deliverable:string; limits:string; firstCheck:string;
};
const serviceCopy:Record<SfiServiceProfileId,ServiceCopy> = {
  "AI_GOVERNANCE_ASSURANCE": {
    "slug": "evaluacion-de-decisiones-con-ia",
    "number": "01",
    "group": "ia",
    "title": "AI Decision Assurance",
    "question": "Can you reconstruct how an AI recommendation became an institutional decision?",
    "summary": "Examine the records, permissions and consequences behind one AI-assisted decision.",
    "audience": "Risk leaders, internal audit teams and AI governance officers.",
    "inputs": "The decision, its timeline, available source records and participating roles.",
    "deliverable": "Decision timeline, authority and evidence map, contradictions, missing records and a reviewable report.",
    "limits": "Not an ISO certification, legal opinion or automatic proof of causation.",
    "firstCheck": "Was the primary document actually verified before the recommendation was authorized?"
  },
  "AI_IMPLEMENTATION_DIAGNOSTIC": {
    "slug": "diagnostico-de-sistemas-con-ia",
    "number": "02",
    "group": "ia",
    "title": "AI Implementation Diagnostic",
    "question": "Does your AI work in testing but fail when people depend on it?",
    "summary": "Separate failures in data, retrieval, models, permissions and workflows before deciding what to repair.",
    "audience": "Technical leads, product teams, MLOps and operations.",
    "inputs": "System context, reproducible failures and authorized logs.",
    "deliverable": "Dependency map, competing failure hypotheses, bounded tests and prioritized recommendations.",
    "limits": "No automatic production repair or reliability guarantee.",
    "firstCheck": "Which event proves the model failed rather than the pipeline or approval step?"
  },
  "AI_ADOPTION_INTEGRATION": {
    "slug": "adopcion-de-ia-en-procesos",
    "number": "03",
    "group": "ia",
    "title": "Responsible AI Adoption",
    "question": "Would AI help this process—or would a simpler change work better?",
    "summary": "Compare non-AI, assistive and bounded automation options against real work, costs and risks.",
    "audience": "Operations leaders, transformation teams and process owners.",
    "inputs": "Process map, time and cost baseline, exceptions and constraints.",
    "deliverable": "Opportunity map, alternatives, pilot conditions and a measurement plan.",
    "limits": "Projected ROI is not observed savings.",
    "firstCheck": "What is the baseline cost of the entire process, including verification?"
  },
  "SERVICE_OBSERVABILITY": {
    "slug": "diagnostico-de-servicios",
    "number": "04",
    "group": "operaciones",
    "title": "Service & Support Diagnostics",
    "question": "Are tickets closing while the underlying problem keeps returning?",
    "summary": "Connect incidents, assets, suppliers and time to find recurring service failures.",
    "audience": "Service owners, help desks, SRE and ITSM leads.",
    "inputs": "Authorized ticket samples, dates, dependencies and SLA definitions.",
    "deliverable": "Recurrence map, incident chronology, candidate causes and follow-up measures.",
    "limits": "Does not replace a ticketing system or autonomously remediate an incident.",
    "firstCheck": "Did the problem stop recurring—or did its ticket merely change status?"
  },
  "CONTRACT_WARRANTY_ASSURANCE": {
    "slug": "contratos-y-garantias",
    "number": "05",
    "group": "operaciones",
    "title": "Contract & Warranty Review",
    "question": "Can you show what was promised, delivered and still disputed?",
    "summary": "Trace contractual obligations through events, assets, warranties and responses.",
    "audience": "Procurement teams, contract managers and compliance officers.",
    "inputs": "Agreements, amendments, milestones and authorized service records.",
    "deliverable": "Obligation matrix, event timeline, discrepancies and missing evidence.",
    "limits": "Not a legal determination of contractual breach.",
    "firstCheck": "Which dated record supports the claim that an obligation was fulfilled?"
  },
  "TENDER_ASSURANCE": {
    "slug": "licitaciones-y-ofertas",
    "number": "06",
    "group": "operaciones",
    "title": "Tender & Proposal Assurance",
    "question": "Can each evaluation decision be traced to previously defined requirements?",
    "summary": "Compare proposals with set criteria and preserve conflicting or missing evidence.",
    "audience": "Procurement reviewers and tender evaluation teams.",
    "inputs": "Tender documents, requirements, proposals and permitted evaluation records.",
    "deliverable": "Requirements-to-evidence matrix, findings and unresolved questions.",
    "limits": "SFI does not award tenders or replace procurement authorities.",
    "firstCheck": "Did the scoring criterion exist before the offers were opened?"
  },
  "ENTERPRISE_MEMORY": {
    "slug": "memoria-organizacional",
    "number": "07",
    "group": "memoria",
    "title": "Organizational Memory",
    "question": "Does vital context disappear when teams, projects or roles change?",
    "summary": "Organize decisions and records into a reconstructible institutional history.",
    "audience": "Operations, program management and knowledge leaders.",
    "inputs": "Authorized records, dates, decisions and context documents.",
    "deliverable": "Temporal map, documented relationships, provenance and continuity plan.",
    "limits": "Documented connections do not prove causal relationships.",
    "firstCheck": "Could a new colleague identify the original reason for a past decision?"
  },
  "COGNITIVE_RECONSTRUCTION": {
    "slug": "conocimiento-experto",
    "number": "08",
    "group": "memoria",
    "title": "Expert Knowledge Reconstruction",
    "question": "What disappears when a key expert is no longer available?",
    "summary": "Document expert procedures, decision criteria and changes in knowledge.",
    "audience": "Knowledge leads, research groups, training and succession teams.",
    "inputs": "Voluntary examples, expert review and authorized materials.",
    "deliverable": "Structured reasoning map, temporal reconstruction and consistency checks.",
    "limits": "A computational representation is not a copy of consciousness.",
    "firstCheck": "Can another reviewer reproduce the decision from the recorded criteria?"
  },
  "SYSTEM_OBSERVATORY": {
    "slug": "observacion-de-sistemas",
    "number": "09",
    "group": "investigacion",
    "title": "Complex Systems Observation",
    "question": "What relationships shape a system as conditions change?",
    "summary": "Observe dependencies, friction, change and uncertainty using dated records.",
    "audience": "Researchers, system owners and institutions.",
    "inputs": "Dated events, defined metrics, source coverage and scope.",
    "deliverable": "Dependency map, baseline, possible trajectories and stated uncertainty.",
    "limits": "Correlation alone does not prove causation.",
    "firstCheck": "Which signals are independent, dated and actually observed?"
  },
  "CUSTOM_RESEARCH": {
    "slug": "investigacion-a-medida",
    "number": "10",
    "group": "investigacion",
    "title": "Custom Research",
    "question": "Is your question too specific for an off-the-shelf assessment?",
    "summary": "Define a bounded question, source corpus and reproducible tailored method.",
    "audience": "Academic institutions, research teams and organizations.",
    "inputs": "Question, existing materials, permissions and intended use.",
    "deliverable": "Tailored protocol, findings, contradictions and agreed deliverable.",
    "limits": "No manufactured significance or promised positive findings.",
    "firstCheck": "What observation could refute the leading explanation?"
  }
};

export const SFI_SERVICE_AREAS:ReadonlyArray<{id:SfiServiceArea;label:string;description:string}> = [
  {id:'ia',label:'Artificial intelligence',description:'Audit, diagnose and integrate AI-assisted systems.'},
  {id:'operaciones',label:'Operations & institutions',description:'Inspect services, contracts and evaluation processes.'},
  {id:'memoria',label:'Knowledge & memory',description:'Preserve decisions, relationships and expert knowledge.'},
  {id:'investigacion',label:'Systems & research',description:'Observe phenomena and test explanations.'},
];

const order:SfiServiceProfileId[] = [
  "AI_GOVERNANCE_ASSURANCE",
  "AI_IMPLEMENTATION_DIAGNOSTIC",
  "AI_ADOPTION_INTEGRATION",
  "SERVICE_OBSERVABILITY",
  "CONTRACT_WARRANTY_ASSURANCE",
  "TENDER_ASSURANCE",
  "ENTERPRISE_MEMORY",
  "COGNITIVE_RECONSTRUCTION",
  "SYSTEM_OBSERVATORY",
  "CUSTOM_RESEARCH"
];
export const SFI_PUBLIC_SERVICES = order.map((id)=>{
  const profile=SFI_SERVICE_PROFILES.find((item)=>item.id===id);
  if(!profile) throw new Error('SFI_SERVICE_PROFILE_MISSING:'+id);
  return {canonicalId:id,profile, ...serviceCopy[id]};
});
export type SfiPublicService = (typeof SFI_PUBLIC_SERVICES)[number];
export function serviceBySlug(slug:string):SfiPublicService|null {
  return SFI_PUBLIC_SERVICES.find((item)=>item.slug===slug)??null;
}
export const SFI_PUBLIC_INQUIRY_EMAIL='jmarin@systemfriction.org' as const;
// The address is already published at /juan. No new CRM endpoint or credential.

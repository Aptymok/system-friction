/**
 * SFI Studio autonomy program · bounded, read-only decision instrument.
 * Reuses the existing institutional Studio session and morning archive.
 * All external organizations are PUBLIC RESEARCH LEADS, not clients.
 * No proposal has authority to contact, publish, spend or promote canon.
 */
export const SFI_STUDIO_P2P3P4_CONTRACT = 'SFI-STUDIO-P2P3P4-1.0' as const;
export type InstitutionalLead = {
 id:string; organization:string; publicIssue:string; sources:{url:string;sourceRole:'PRIMARY'|'INSTITUTIONAL_SELF_DESCRIPTION'}[];
 evidenceType:'SPECIFIC_PUBLIC_AUDIT'|'INSTITUTIONAL_PROGRAM'|'RESEARCH_MISSION';
 demonstratedDemand:false; contactAuthorized:false; costClass:'LOW_DOCUMENT_REVIEW'|'MEDIUM_RESEARCH_REVIEW';
 methodFit:'MIHM_INSTITUTIONAL_CANDIDATE'|'MOP_H_CANDIDATE';
 contradiction:string; nextObservation:string;
};
export const INSTITUTIONAL_LEADS:readonly InstitutionalLead[] = [
 {id:'NY_STATE_AUDIT_AI_GOVERNANCE',organization:'Office of the New York State Comptroller',
 publicIssue:'Public follow-up audit of NYC agency AI governance; documented oversight gaps and agency-level variation.',
 sources:[{url:'https://www.osc.ny.gov/state-agencies/audits/2026/08/27/artificial-intelligence-governance-follow',sourceRole:'PRIMARY'}],
 evidenceType:'SPECIFIC_PUBLIC_AUDIT',demonstratedDemand:false,contactAuthorized:false,
 costClass:'LOW_DOCUMENT_REVIEW',methodFit:'MIHM_INSTITUTIONAL_CANDIDATE',
 contradiction:'A public audit identifies governance gaps; it does not demonstrate demand for SFI services or comparative efficacy.',
 nextObservation:'Reproduce an attribution table from public audit, compare MIHM-style lineage against an ordinary audit checklist without reusing that audit as outcome evidence.'},
 {id:'NYU_RESPONSIBLE_AI',organization:'NYU Center for Responsible AI',
 publicIssue:'Interdisciplinary research, AI technology policy and education on responsible AI.',
 sources:[{url:'https://engineering.nyu.edu/research/centers/center-responsible-ai',sourceRole:'INSTITUTIONAL_SELF_DESCRIPTION'}],
 evidenceType:'RESEARCH_MISSION',demonstratedDemand:false,contactAuthorized:false,
 costClass:'MEDIUM_RESEARCH_REVIEW',methodFit:'MIHM_INSTITUTIONAL_CANDIDATE',
 contradiction:'A compatible research theme is not an expressed request to collaborate.',
 nextObservation:'Identify a concrete current research question, relevant publication and conventional comparative method before proposing outreach.'},
 {id:'NYC_SBS_BUSINESS_SOLUTIONS',organization:'NYC Department of Small Business Services',
 publicIssue:'Assistance for small businesses, including business operation, education and financing.',
 sources:[{url:'https://portal.311.nyc.gov/article/?kanumber=KA-02898',sourceRole:'PRIMARY'}],
 evidenceType:'INSTITUTIONAL_PROGRAM',demonstratedDemand:false,contactAuthorized:false,
 costClass:'MEDIUM_RESEARCH_REVIEW',methodFit:'MOP_H_CANDIDATE',
 contradiction:'Availability of an assistance program is not evidence of an unaddressed problem that SFI could solve.',
 nextObservation:'Specify one observable administrative friction and identify comparable public service metrics before any pilot.'},
] as const;
export const SCIENTIFIC_CONTRAST = {
 contract:'SFI-STUDIO-PREREGISTERED-CONTRAST-1.0',
 state:'PROTOCOL_DECLARED_NO_STUDY_EXECUTED' as const,
 subject:'Public AI-governance audit source traceability',
 target:'Compare SFI-style evidence/claim lineage with a conventional manual audit checklist on the same fixed, publicly available report.',
 hypothesis:'SFI-style claim lineage reduces unsupported attributions or improves provenance completeness relative to a conventional manual checklist.',
 rival:'A conventional checklist provides equal or better provenance with lower cost and implementation effort.',
 baseline:'A manual table linking audit findings, quoted audit sections, source URLs and explicit uncertainty.',
 separation:'Freeze protocol before evaluating any new held-out source; the 2026 source used to design the protocol cannot count as unseen test material.',
 expectedSignals:['Number of claims with directly recoverable source excerpts','Number of unsupported or incorrect institutional attributions','Minutes of human verification per 10 claims'],
 contradictionSignals:['No improvement in source-trace coverage','More unsupported claims than the baseline','Verification time rises without a traceability improvement'],
 missing:['HELD_OUT_EXTERNAL_DATASET','BASELINE_MEASUREMENT','SFI_MEASUREMENT','INDEPENDENT_REVIEW','OBSERVED_RETURN'],
 sourceIds:['NY_STATE_AUDIT_AI_GOVERNANCE'],
 epistemicClass:'HYPOTHESIZED' as const,
 forbiddenInference:'No simulated performance, synthetic citations, or comparison in-sample is empirical validation.',
} as const;
export type CampaignDecision='MAINTAIN_HYPOTHESIS'|'REVIEW_ADJUSTMENT'|'HALT_PUBLICATION'|'EVIDENCE_INSUFFICIENT';
export function chooseResearchLead(leads:readonly InstitutionalLead[] = INSTITUTIONAL_LEADS) {
 const sorted=[...leads].sort((a,b)=>{
  const evidenceScore=(x:InstitutionalLead)=>x.evidenceType==='SPECIFIC_PUBLIC_AUDIT'?3:x.evidenceType==='INSTITUTIONAL_PROGRAM'?2:1;
  const cost=(x:InstitutionalLead)=>x.costClass==='LOW_DOCUMENT_REVIEW'?1:0;
  return evidenceScore(b)-evidenceScore(a) || cost(b)-cost(a) || a.id.localeCompare(b.id);
 });
 const lead=sorted[0]??null;
 return {selectedLeadId:lead?.id??null,selectedBecause:'Source-specific publicly documented problem and low-cost internal documentary contrast, not an actual client lead.',
  alternatives:sorted.slice(1).map(x=>x.id),rankingType:'QUALITATIVE_RULE_NOT_CALIBRATED_PROBABILITY',
  contactExecuted:false,grantForContact:false,researchWindow:'15_DAY_DOCUMENT_REVIEW',
  excludedGenericHeadlines:true};
}
export function calibrateStudioCampaign(input:{
 day:number; relevantWorldSources:number; observedSocialPerformance:boolean;
 newCounterEvidence:boolean; confirmedSourceContradiction:boolean;
 actualPublishedPostIds:number; empiricalContrastCompleted:boolean;
}):{decision:CampaignDecision;reason:string;checkpoint:'DAILY'|'15_DAY'|'90_DAY';changeAuthorized:false;publicationAuthorized:false} {
 const checkpoint=input.day>=90?'90_DAY':input.day>=15&&input.day%15===0?'15_DAY':'DAILY';
 if(input.confirmedSourceContradiction) return {decision:'HALT_PUBLICATION',reason:'Confirmed contradiction requires review before releasing related claims.',checkpoint,changeAuthorized:false,publicationAuthorized:false};
 if(input.newCounterEvidence) return {decision:'REVIEW_ADJUSTMENT',reason:'Counterevidence requires a human-evaluated reversible revision; no self-approved campaign switch.',checkpoint,changeAuthorized:false,publicationAuthorized:false};
 if(!input.empiricalContrastCompleted || !input.observedSocialPerformance || input.actualPublishedPostIds===0) return {
  decision:'EVIDENCE_INSUFFICIENT',reason:'No independently evaluated comparative RETURN and authenticated channel results; do not claim improvement.',checkpoint,changeAuthorized:false,publicationAuthorized:false};
 return {decision:'MAINTAIN_HYPOTHESIS',reason:'Sufficient prerequisites for reviewing current hypothesis; effects still require manual interpretation.',checkpoint,changeAuthorized:false,publicationAuthorized:false};
}

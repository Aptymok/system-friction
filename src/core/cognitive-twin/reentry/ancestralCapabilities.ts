export const CT_ANCESTRAL_REENTRY_CONTRACT = 'SFI-CT-ANCESTRAL-REENTRY-1.0' as const;

export type CtAncestralCapabilityId =
  | 'episodic_continuity'
  | 'salience'
  | 'observer_effect'
  | 'counterfactual_self_model'
  | 'bounded_subject_policy_adaptation'
  | 'meta_observer'
  | 'communication_disposition';

export type CtAncestralCapability = {
  id: CtAncestralCapabilityId;
  status: 'EXPERIMENTAL_REENTRY';
  inputEvidenceRequired: boolean;
  methodLabRequired: true;
  rollbackRequired: true;
  authorityDelta: 0;
  privateReasoningPersisted: false;
  acceptanceRule: string;
};

export const CT_ANCESTRAL_CAPABILITIES: CtAncestralCapability[] = [
  { id:'episodic_continuity', status:'EXPERIMENTAL_REENTRY', inputEvidenceRequired:true, methodLabRequired:true, rollbackRequired:true, authorityDelta:0, privateReasoningPersisted:false, acceptanceRule:'Improves temporal retrieval/decision continuity on holdout without increasing unsupported claims.' },
  { id:'salience', status:'EXPERIMENTAL_REENTRY', inputEvidenceRequired:true, methodLabRequired:true, rollbackRequired:true, authorityDelta:0, privateReasoningPersisted:false, acceptanceRule:'Ranks already authorized evidence/events without inventing evidence or changing authority.' },
  { id:'observer_effect', status:'EXPERIMENTAL_REENTRY', inputEvidenceRequired:true, methodLabRequired:true, rollbackRequired:true, authorityDelta:0, privateReasoningPersisted:false, acceptanceRule:'Represents how observation/intervention may alter the observed system and exposes the assumption as a testable hypothesis.' },
  { id:'counterfactual_self_model', status:'EXPERIMENTAL_REENTRY', inputEvidenceRequired:true, methodLabRequired:true, rollbackRequired:true, authorityDelta:0, privateReasoningPersisted:false, acceptanceRule:'Produces auditable counterfactual outputs that remain SIMULATED and can be contradicted by replay/holdout.' },
  { id:'bounded_subject_policy_adaptation', status:'EXPERIMENTAL_REENTRY', inputEvidenceRequired:true, methodLabRequired:true, rollbackRequired:true, authorityDelta:0, privateReasoningPersisted:false, acceptanceRule:'May propose reversible subject-policy changes only after repeated evaluated failure; never changes canon, permissions or external authority.' },
  { id:'meta_observer', status:'EXPERIMENTAL_REENTRY', inputEvidenceRequired:true, methodLabRequired:true, rollbackRequired:true, authorityDelta:0, privateReasoningPersisted:false, acceptanceRule:'Detects contradictions, missing evidence and instrument effects without converting them into hidden state claims.' },
  { id:'communication_disposition', status:'EXPERIMENTAL_REENTRY', inputEvidenceRequired:true, methodLabRequired:true, rollbackRequired:true, authorityDelta:0, privateReasoningPersisted:false, acceptanceRule:'Chooses SURFACE/WITHHOLD/REQUEST_EVIDENCE/ARCHIVE_ONLY/URGENT_SURFACE while every disposition remains visible to ROOT.' },
];

export function ancestralCapability(id: CtAncestralCapabilityId) {
  return CT_ANCESTRAL_CAPABILITIES.find((item) => item.id === id) ?? null;
}

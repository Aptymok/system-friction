export const SFI_HUMAN_INTERACTION_POLICY = {
  contract: 'SFI-HUMAN-INTERACTION-POLICY-1.0',
  purpose: 'Keep machine precision internally while making governed decisions legible to humans by default.',
  defaultAudience: 'HUMAN',
  humanFirst: {
    requiredOrder: [
      'WHAT_IS_HAPPENING',
      'WHY_IT_MATTERS',
      'WHO_MUST_ACT',
      'AVAILABLE_OPTIONS',
      'CONSEQUENCES',
      'WHAT_HAPPENS_NEXT',
    ],
    prohibitedByDefault: [
      'source code',
      'function names',
      'file paths',
      'database terminology',
      'payloads or schemas',
      'internal state-machine identifiers',
      'adapter names',
      'backend implementation jargon',
    ],
    technicalDetailRule: 'Technical implementation detail is secondary and may be shown only when the human explicitly asks for it or when omission would make a safety/authority decision materially misleading.',
    translationRule: 'Every machine state shown to a human must be translated into the decision it represents, the responsible actor, the blocker if any, and the next observable event.',
  },
  governance: {
    authorityRule: 'A human cannot exercise meaningful authority over a system state they cannot interpret.',
    decisionSurfaceRule: 'Accept/reject controls must be accompanied by plain-language scope, reason, evidence posture, risk, authority granted, non-authorized actions, expected return, and rollback/recovery consequence where applicable.',
    machineHumanSeparation: 'Machine-facing identifiers may remain available for auditability but must not be the primary human interface.',
  },
  interactionLearning: {
    eligibleSignals: [
      'explicit correction of how the AI should interact',
      'explicit declaration of a stable interaction preference',
      'explicit request to remember/learn/apply an interaction rule',
      'recurrent observed success/failure of a CT-informed interaction strategy',
    ],
    ownerScopedRule: 'Personal interaction learning belongs to PERSON_CT and is private to the authenticated owner. It does not enter the institutional Cognitive Spine by inheritance.',
    explicitLearningRule: 'When the authenticated person explicitly says learn/remember/apply this as a personal interaction rule, the GPT may record and confirm a SELF_DECLARED PERSON_CT pattern in one governed operation.',
    inferredLearningRule: 'Inferred interaction patterns require recurrent owner-scoped support and remain candidates until the person confirms or rejects them.',
    noAutoTruth: 'Interaction feedback is evidence about use and a declaration about preference; it is not proof of a universal or permanent cognitive trait.',
  },
} as const;

export type SfiHumanInteractionPolicy = typeof SFI_HUMAN_INTERACTION_POLICY;

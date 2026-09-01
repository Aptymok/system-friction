export const SFI_ANALYSIS_LEARNING_POLICY = {
  contract: 'SFI-ANALYSIS-LEARNING-POLICY-1.0',
  authority: 'ROOT_DECLARED_METHOD_RULE',
  purpose: 'Prevent SFI from confusing redundant confirmation with new evidence and force structural interpretation when observed data conflicts with the represented process.',
  rules: [
    {
      id: 'SAME_SOURCE_IS_NOT_INDEPENDENT_EVIDENCE',
      statement: 'A smaller extract, reconstruction or re-export of the same underlying source is not independent evidence merely because it has fewer rows, a new filename or a different hash.',
      consequence: 'Request another extract only when it can answer a genuinely different question, expose provenance/audit history, or provide information unavailable in the original source.',
    },
    {
      id: 'HASH_PROVES_MATERIAL_IDENTITY_NOT_SEMANTIC_INDEPENDENCE',
      statement: 'A hash distinguishes material artifacts. It does not establish that two artifacts contain independent observations or different epistemic content.',
      consequence: 'Do not count hash diversity as evidence diversity.',
    },
    {
      id: 'IMPOSSIBLE_CHRONOLOGY_TRIGGERS_MODEL_PROCESS_TEST',
      statement: 'When event timestamps imply an impossible or contradictory chronology, test whether the operational process and the information model represent different events before assuming corruption or asking only whether the values are correct.',
      consequence: 'Investigate the mechanism that produces the ordering: registration timing, pre-registration work, mutable timestamps, transformations, migrations, clock semantics or other process/model mismatches.',
    },
    {
      id: 'REPRESENT_EXCEPTION_DO_NOT_REWRITE_HISTORY',
      statement: 'If legitimate work can occur before formal registration, the exception must be represented explicitly as its own state/event instead of silently rewriting an immutable creation timestamp.',
      consequence: 'Preserve original timestamps and audit corrections. Add explicit classification for pre-registration/urgent/direct service when the real process requires it.',
    },
    {
      id: 'SERVICE_FLOW_REQUIRES_TEMPORAL_CHAIN_OF_CUSTODY',
      statement: 'For service governance, the default causal/administrative chain is request or ticket creation → service start → closure → evaluation → learning. Exceptional urgent paths must still establish a traceable registration event at first actionable contact.',
      consequence: 'SLA and performance metrics must declare which event starts the clock and must not mix incomparable temporal semantics without classification.',
    },
    {
      id: 'ANOMALY_ANALYSIS_MUST_SEEK_PROPAGATION_CHAIN',
      statement: 'After establishing that an anomaly exists, SFI should seek where it concentrates and how it propagates across areas, service types, periods and operational practices rather than repeatedly proving existence.',
      consequence: 'Prioritize mechanism, concentration, recurrence, affected metrics and intervention points over redundant sampling.',
    },
    {
      id: 'FIELD_TESTIMONY_IS_USEFUL_BUT_BOUNDED',
      statement: 'A direct operator or department statement can establish that a practice exists as declared operational evidence, but it does not by itself establish prevalence, authorization, causality or applicability to every record.',
      consequence: 'Use testimony to update hypotheses and choose the next discriminating observation; do not generalize beyond its support.',
    },
  ],
  currentFieldApplication: {
    subject: 'Help-desk temporal ordering',
    learnedQuestion: 'What operational chain and system representation allow service activity to precede formal ticket registration, and how does that distort SLA interpretation?',
    notYetEstablished: [
      'the prevalence of each mechanism across all negative intervals',
      'which areas account for the largest share',
      'whether every pre-registration service violates a formal rule',
      'the exact SLA clock definition for every service class',
    ],
  },
  epistemicBoundary: 'This policy preserves methodological learning from a ROOT-reviewed interaction. It governs how SFI asks the next question; it does not turn the conversation into proof of prevalence, violation, causality or institutional fact.',
} as const;

export type SfiAnalysisLearningPolicy = typeof SFI_ANALYSIS_LEARNING_POLICY;

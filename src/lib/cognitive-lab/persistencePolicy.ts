export const CRL_PERSISTENCE_POLICY = {
  version: 'SFI-CRL-PERSISTENCE-1.0',
  design: 'HYBRID_GOVERNED_MIGRATION',
  protocolLocalStore: ['sfi_cognitive_lab_sessions','sfi_cognitive_lab_events','sfi_cognitive_lab_analyses'],
  institutionalRunLedger: 'sfi_lab_analyses',
  twinCandidateStore: 'sfi_cognitive_twin_memory',
  rules: [
    'Protocol-local tables preserve CRL session/event/analysis structure.',
    'Every completed/imported CRL experiment receives a Method Lab institutional summary in sfi_lab_analyses.',
    'CRL candidate learning remains CANDIDATE and cannot mutate canon.',
    'Schema presence in code does not assert the production migration has been applied.',
    'Production schema verification is a live deployment gate, not an architecture-design ambiguity.',
  ],
  codeDesignResolved: true,
  productionSchemaVerified: false,
} as const;

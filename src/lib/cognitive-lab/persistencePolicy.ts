export const CRL_PERSISTENCE_POLICY = {
  version: 'SFI-CRL-PERSISTENCE-2.0',
  design: 'CANONICAL_GOVERNED_PERSISTENCE',
  protocolLocalStore: ['sfi_cognitive_lab_sessions','sfi_cognitive_lab_events','sfi_cognitive_lab_analyses'],
  institutionalRunLedger: 'sfi_lab_analyses',
  twinCandidateStore: 'sfi_amv_memory',
  twinCandidateModule: 'institutionalEventPipeline',
  rules: [
    'Protocol-local tables preserve CRL session/event/analysis structure.',
    'Every completed/imported CRL experiment receives a Method Lab institutional summary in sfi_lab_analyses.',
    'CRL learning is persisted through the canonical institutionalEventPipeline memory writer.',
    'Candidate learning remains CANDIDATE and is excluded from Cognitive Twin canonical consumption until VERIFIED or CANONICAL.',
    'Production schema verification is a live deployment gate.',
  ],
  codeDesignResolved: true,
  productionSchemaVerified: false,
} as const;

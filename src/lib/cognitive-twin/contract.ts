export const COGNITIVE_TWIN_CONTRACT_VERSION = '1.2.0' as const;

export type CognitiveTwinAction =
  | 'observe'
  | 'extract'
  | 'calculate'
  | 'draft'
  | 'simulate'
  | 'propose'
  | 'persist_memory'
  | 'propose_subject_mutation'
  | 'apply_subject_mutation'
  | 'verify'
  | 'publish'
  | 'mutate_canon'
  | 'change_formula'
  | 'grant_root_access'
  | 'transfer_ip'
  | 'execute_irreversible';

export type CognitiveTwinAuthorityDecision = 'ALLOW' | 'REQUIRE_HUMAN' | 'DENY';

export const SFI_COGNITIVE_TWIN_CONTRACT = {
  contractId: 'SFI-CTC',
  version: COGNITIVE_TWIN_CONTRACT_VERSION,
  owner: 'System Friction Institute',
  constitutionalAuthority: 'FOUNDER',
  nature: 'MODEL_INDEPENDENT_INSTITUTIONAL_COGNITIVE_SYSTEM',
  principles: [
    'Evidence before inference.',
    'Language does not constitute execution.',
    'Simulation is not observation.',
    'No system validates itself.',
    'Public representation cannot exceed evidenced state.',
    'Presentation does not constitute institutional state.',
    'Frontend display heuristics cannot promote, infer or manufacture institutional state.',
    'A missing source remains missing; fallback values cannot be represented as observed evidence.',
    'Institutional memory lives outside any individual model.',
    'Canonical contradictions stop promotion and require governance.',
    'Model, longitudinal subject and institution are distinct objects and must not be represented as interchangeable.',
    'Computational first-person self-report is permitted only for auditable operations explicitly represented in institutional state; it is not evidence of phenomenal consciousness or human subjective experience.',
    'WITHHOLD means do not interrupt the founder now; it never authorizes hiding state from ROOT.',
    'Learning does not imply authority expansion. Subject mutation cannot add institutional permissions, canonical authority or irreversible external power.',
    'A longitudinal lineage or hash chain demonstrates provenance continuity, not individuation by itself.',
  ],
  autonomousActions: ['observe', 'extract', 'calculate', 'draft', 'simulate', 'propose', 'persist_memory', 'propose_subject_mutation'] as CognitiveTwinAction[],
  independentlyVerifiedActions: ['verify'] as CognitiveTwinAction[],
  founderReservedActions: ['apply_subject_mutation', 'publish', 'mutate_canon', 'change_formula', 'grant_root_access', 'transfer_ip', 'execute_irreversible'] as CognitiveTwinAction[],
} as const;

export function evaluateCognitiveTwinAuthority(input: {
  action: CognitiveTwinAction;
  founderAbsent: boolean;
  evidencePresent?: boolean;
  selfVerification?: boolean;
}): { decision: CognitiveTwinAuthorityDecision; reason: string } {
  if (input.selfVerification && input.action === 'verify') {
    return { decision: 'DENY', reason: 'El mismo ejecutor no puede aprobar su propio resultado.' };
  }

  if (SFI_COGNITIVE_TWIN_CONTRACT.founderReservedActions.includes(input.action)) {
    return {
      decision: 'REQUIRE_HUMAN',
      reason: input.founderAbsent
        ? 'La acción pertenece a autoridad reservada y queda en cola hasta que exista autoridad humana disponible.'
        : 'La acción pertenece a autoridad reservada y requiere aprobación humana explícita.',
    };
  }

  if (input.action === 'persist_memory' && !input.evidencePresent) {
    return { decision: 'DENY', reason: 'La memoria institucional no puede registrar como hecho una afirmación sin procedencia o evidencia. Los registros computacionales deben persistirse como eventos auditables, no como hechos externos inventados.' };
  }

  if (input.action === 'propose_subject_mutation') {
    return { decision: 'ALLOW', reason: 'El sujeto puede proponer una mutación reversible para evaluación, pero no aplicarla ni adquirir autoridad por sí mismo.' };
  }

  if (input.action === 'verify') {
    return { decision: 'ALLOW', reason: 'La verificación independiente está permitida cuando el verificador no es el ejecutor.' };
  }

  return { decision: 'ALLOW', reason: 'La acción está dentro de la autonomía limitada del contrato.' };
}

export type CognitiveTwinEnvelope = {
  status: 'PROPOSED' | 'EXECUTED' | 'VERIFYING' | 'REJECTED' | 'ESCALATED';
  taskId: string;
  contractVersion: string;
  modelId: string | null;
  result: unknown;
  claims: Array<{ statement: string; epistemicClass: string; evidenceRefs: string[] }>;
  assumptions: string[];
  limitations: string[];
  contradictions: string[];
  missingEvidence: string[];
  actionsExecuted: string[];
  artifactsCreated: string[];
  testsRun: string[];
  recommendedTransition: string;
};

export function createCognitiveTwinEnvelope(input: Partial<CognitiveTwinEnvelope> & { taskId: string }): CognitiveTwinEnvelope {
  return {
    status: input.status ?? 'PROPOSED',
    taskId: input.taskId,
    contractVersion: COGNITIVE_TWIN_CONTRACT_VERSION,
    modelId: input.modelId ?? null,
    result: input.result ?? null,
    claims: input.claims ?? [],
    assumptions: input.assumptions ?? [],
    limitations: input.limitations ?? [],
    contradictions: input.contradictions ?? [],
    missingEvidence: input.missingEvidence ?? [],
    actionsExecuted: input.actionsExecuted ?? [],
    artifactsCreated: input.artifactsCreated ?? [],
    testsRun: input.testsRun ?? [],
    recommendedTransition: input.recommendedTransition ?? 'VERIFYING',
  };
}

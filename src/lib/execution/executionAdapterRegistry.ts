import 'server-only';

export type ExecutionAdapterDefinition = {
  id: string;
  name: string;
  domain: string;
  actionsSupported: string[];
  inputContract: string;
  outputContract: string;
  requiredScopes: string[];
  authorityBoundary: 'governed_internal' | 'root_only' | 'external_specific';
  riskClass: 'low' | 'medium' | 'high';
  reversibility: 'reversible' | 'partially_reversible' | 'unknown';
  executorRef: string;
  route: string | null;
  runtimeBinding: 'BOUND' | 'EXTERNAL_PULL' | 'MISSING';
};

export const SFI_EXECUTION_ADAPTER_REGISTRY: ExecutionAdapterDefinition[] = [
  {
    id: 'ct_reentry_decision_transfer',
    name: 'Cognitive Twin Reentry · Decision Transfer',
    domain: 'cognitive_twin',
    actionsSupported: ['ct_reentry', 'decision_transfer', 'blind_decision_reconstruction', 'decision_reveal'],
    inputContract: 'SFI-DECISION-TRANSFER canonical/materialized request',
    outputContract: 'persisted run + evaluation + sfi_lab_analyses(mode=ct_reentry)',
    requiredScopes: ['ROOT session'],
    authorityBoundary: 'root_only',
    riskClass: 'low',
    reversibility: 'reversible',
    executorRef: 'decision_transfer_runtime',
    route: '/api/root/method-lab/decision-transfer',
    runtimeBinding: 'BOUND',
  },
  {
    id: 'method_lab_sociotechnical',
    name: 'Method Lab · Sociotechnical Simulation',
    domain: 'method_lab',
    actionsSupported: ['sociotechnical_simulation'],
    inputContract: 'protocolId + persisted evidenceIds + parameters',
    outputContract: 'lab run + result hash + observed runtime trace',
    requiredScopes: ['lab:run', 'root_delegate'],
    authorityBoundary: 'governed_internal',
    riskClass: 'low',
    reversibility: 'reversible',
    executorRef: 'external_method_lab_runtime',
    route: '/api/external/v1/lab',
    runtimeBinding: 'BOUND',
  },
  {
    id: 'method_lab_economic',
    name: 'Method Lab · Economic Simulation',
    domain: 'method_lab',
    actionsSupported: ['economic_simulation'],
    inputContract: 'protocolId + persisted evidenceIds + parameters',
    outputContract: 'lab run + result hash + observed runtime trace',
    requiredScopes: ['lab:run', 'root_delegate'],
    authorityBoundary: 'governed_internal',
    riskClass: 'low',
    reversibility: 'reversible',
    executorRef: 'external_method_lab_runtime',
    route: '/api/external/v1/lab',
    runtimeBinding: 'BOUND',
  },
  {
    id: 'case_intervention_recorder',
    name: 'Case Platform · Approved Intervention Recorder',
    domain: 'case_execution',
    actionsSupported: ['record_case_intervention', 'record_case_return'],
    inputContract: 'approved SFI-CASE-ACTION-1.0 proposal + observed intervention/return',
    outputContract: 'INTERVENTION/RETURN record; platformPerformedExternalAction=false',
    requiredScopes: ['case OWNER|ADMIN|OPERATOR'],
    authorityBoundary: 'governed_internal',
    riskClass: 'low',
    reversibility: 'reversible',
    executorRef: 'sfi_case_action_repository',
    route: null,
    runtimeBinding: 'BOUND',
  },
  {
    id: 'internal_site_development_executor',
    name: 'Internal Site / Repository Development Executor',
    domain: 'internal_site_development',
    actionsSupported: ['repository_change', 'site_change', 'adapter_build', 'deployment_change'],
    inputContract: 'bounded work package + repo target + tests + rollback + authority',
    outputContract: 'commit/PR/deploy evidence + observed verification + RETURN',
    requiredScopes: ['repository write capability', 'deployment capability when applicable'],
    authorityBoundary: 'external_specific',
    riskClass: 'medium',
    reversibility: 'partially_reversible',
    executorRef: 'external_technical_executor',
    route: null,
    runtimeBinding: 'EXTERNAL_PULL',
  },
];

export function executionAdapterById(id: string | null | undefined) {
  return id ? SFI_EXECUTION_ADAPTER_REGISTRY.find((item) => item.id === id) ?? null : null;
}

export function executionAdapterForAction(action: string | null | undefined) {
  const normalized = action?.trim().toLowerCase();
  if (!normalized) return null;
  return SFI_EXECUTION_ADAPTER_REGISTRY.find((adapter) => adapter.actionsSupported.some((candidate) => normalized.includes(candidate))) ?? null;
}

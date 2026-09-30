export const SFI_SUPABASE_READ_BUDGET_CONTRACT = 'SFI-SUPABASE-READ-BUDGET-1.0' as const;

function boundedEnvInt(name:string, fallback:number, hardMax:number) {
  const parsed=Number(process.env[name] ?? fallback);
  if(!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(hardMax, Math.floor(parsed)));
}

export const SFI_SUPABASE_READ_BUDGET = Object.freeze({
  graphNodes: boundedEnvInt('SFI_GRAPH_NODE_READ_LIMIT', 400, 1000),
  graphEdges: boundedEnvInt('SFI_GRAPH_EDGE_READ_LIMIT', 1200, 3000),
  fieldEpochSubjects: boundedEnvInt('SFI_FIELD_EPOCH_SUBJECT_LIMIT', 24, 60),
  fieldEpochRows: boundedEnvInt('SFI_FIELD_EPOCH_READ_LIMIT', 600, 1200),
  jrScientificTargets: boundedEnvInt('SFI_JR_SCIENTIFIC_TARGET_LIMIT', 12, 24),
  jrEpochWrites: boundedEnvInt('SFI_JR_EPOCH_WRITE_LIMIT', 16, 40),
  jrPhenomenonWrites: boundedEnvInt('SFI_JR_PHENOMENON_WRITE_LIMIT', 8, 20),
  jrMethodRuns: boundedEnvInt('SFI_JR_METHOD_RUN_LIMIT', 1, 2),
  jrReturnRuns: boundedEnvInt('SFI_JR_RETURN_RUN_LIMIT', 8, 16),
  jrReturnEpochRows: boundedEnvInt('SFI_JR_RETURN_EPOCH_READ_LIMIT', 400, 800),
  evidenceRefs: boundedEnvInt('SFI_EVIDENCE_REF_READ_LIMIT', 60, 100),
  worldRunCooldownMinutes: boundedEnvInt('SFI_WORLD_RUN_COOLDOWN_MINUTES', 30, 180),
});

export function supabaseReadBudgetExceeded(scope:string, observed:number, limit:number) {
  return {
    code:'SFI_EGRESS_BUDGET_EXCEEDED',
    message:`${scope}_budget_exceeded:observed=${observed}:limit=${limit}`,
  } as const;
}

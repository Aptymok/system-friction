import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_AGENT_EXECUTION_MAP } from '@/lib/sfi/cognitive-runtime/agentExecutionMap';
import { METHOD_LAB_CONTRACT_VERSION, type MethodLabProtocolId, type MethodLabProtocolStatus } from './contracts';
import { METHOD_LAB_PROTOCOLS } from './registry';

type Row = Record<string, unknown>;

const IMPLEMENTATION_GATES: Record<MethodLabProtocolId, () => boolean> = {
  chronos_olympics: () => false,
  cognitive_relational_lab: () => false,
  ct_reentry: () => true,
  sociotechnical_simulation: () => typeof SFI_AGENT_EXECUTION_MAP.social_field_simulator === 'function' && typeof SFI_AGENT_EXECUTION_MAP.friction_field_simulator === 'function',
  economic_simulation: () => typeof SFI_AGENT_EXECUTION_MAP.economic_field_simulator === 'function',
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

export async function readMethodLabState() {
  const db = createServiceSupabaseClient();
  const analyses = await db.from('sfi_lab_analyses')
    .select('id,mode,source,data_mode,limitations,raw_analysis,created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const tableWarning = analyses.error ? analyses.error.message : null;
  const rows = (analyses.data ?? []) as Row[];
  const protocols = METHOD_LAB_PROTOCOLS.map((definition) => {
    const relevant = rows.filter((item) => text(item.mode) === definition.id);
    const latest = relevant[0] ?? null;
    const raw = row(latest?.raw_analysis);
    const warnings = [
      ...(Array.isArray(latest?.limitations) ? latest.limitations.map(String) : []),
      ...(tableWarning ? [`sfi_lab_analyses:${tableWarning}`] : []),
    ];
    let status: MethodLabProtocolStatus;
    if (tableWarning) status = 'DEGRADED';
    else if (latest) status = 'OPERATIONAL';
    else if (IMPLEMENTATION_GATES[definition.id]()) status = 'GATED';
    else status = 'REGISTERED';
    return {
      ...definition,
      status,
      runCount: relevant.length,
      lastRunAt: text(latest?.created_at) || null,
      lastRunId: text(latest?.id) || null,
      lastValidationLevel: text(raw.validationLevel) || null,
      lastResultHash: text(raw.resultHash) || null,
      warnings,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    contractVersion: METHOD_LAB_CONTRACT_VERSION,
    status: tableWarning ? 'DEGRADED' : protocols.some((item) => item.status === 'OPERATIONAL') ? 'OPERATIONAL' : 'GATED',
    sharedPersistence: 'sfi_lab_analyses',
    epistemicRule: 'Every laboratory output remains SIMULATED until a later observed return supports a stronger validation state.',
    promotionRule: 'No protocol can mutate canonical state or promote its own result; ROOT/ACP evaluates promotion requests.',
    protocols,
    warnings: tableWarning ? [`sfi_lab_analyses:${tableWarning}`] : [],
  };
}

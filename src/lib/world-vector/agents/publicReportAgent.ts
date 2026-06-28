import { getWorldVectorToday } from '../readModel';
import { buildWorldVectorPublicReport } from '../reportBuilder';
import { getWorldVectorPersistenceStatus, persistWorldVectorReport } from '../persistence';
import type { ReportAgentData, WorldVectorAgentResult } from './types';

export async function runPublicReportAgent(input: { persist?: boolean } = {}): Promise<WorldVectorAgentResult<ReportAgentData>> {
  const today = await getWorldVectorToday();
  const memory = await getWorldVectorPersistenceStatus();
  const report = buildWorldVectorPublicReport({
    observation: today.observation,
    cycleRange: today.cycle_range,
  });
  const persistence = input.persist && memory.enabled
    ? await persistWorldVectorReport({
      report,
      cycleRange: today.cycle_range,
      observation: today.observation,
    })
    : memory;

  return {
    ok: true,
    agent: 'publicReportAgent',
    mode: input.persist ? 'persist_if_ready' : 'read_only',
    memory,
    data: { report, persistence },
    warnings: today.observation.warnings,
    blocked: memory.enabled ? [] : [memory.reason],
  };
}

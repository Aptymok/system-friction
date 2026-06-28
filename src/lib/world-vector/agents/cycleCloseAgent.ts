import { getWorldVectorToday } from '../readModel';
import { buildWorldVectorCycleCloseReport } from '../reportBuilder';
import { closeWorldVectorCycle, getWorldVectorPersistenceStatus } from '../persistence';
import type { WorldVectorAgentResult } from './types';

export async function runCycleCloseAgent(input: { force?: boolean } = {}): Promise<WorldVectorAgentResult> {
  const today = await getWorldVectorToday();
  const memory = await getWorldVectorPersistenceStatus();
  const report = buildWorldVectorCycleCloseReport({
    observation: today.observation,
    cycleRange: today.cycle_range,
  });

  if (!today.cycle_day.isCycleClose && !input.force) {
    return {
      ok: true,
      agent: 'cycleCloseAgent',
      mode: 'protected_action',
      memory,
      data: { report, current_cycle_day: today.cycle_day },
      warnings: today.observation.warnings,
      blocked: ['cycle_close_not_allowed_before_sunday'],
    };
  }

  const result = memory.enabled
    ? await closeWorldVectorCycle({
      cycleRange: today.cycle_range,
      report,
      observation: today.observation,
    })
    : { ok: false as const, blocked: true as const, reason: memory.reason, details: memory.details };

  return {
    ok: true,
    agent: 'cycleCloseAgent',
    mode: 'protected_action',
    memory,
    data: { report, result },
    warnings: today.observation.warnings,
    blocked: result.ok ? [] : [result.reason],
  };
}

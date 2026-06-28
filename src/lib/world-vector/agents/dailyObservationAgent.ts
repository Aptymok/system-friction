import { getWorldVectorToday } from '../readModel';
import { getWorldVectorPersistenceStatus, persistWorldVectorObservation } from '../persistence';
import type { DailyObservationAgentData, WorldVectorAgentResult } from './types';

export async function runDailyObservationAgent(input: { persist?: boolean } = {}): Promise<WorldVectorAgentResult<DailyObservationAgentData>> {
  const today = await getWorldVectorToday();
  const memory = await getWorldVectorPersistenceStatus();
  const persistence = input.persist && memory.enabled
    ? await persistWorldVectorObservation({
      observation: today.observation,
      cycleRange: today.cycle_range,
    })
    : memory;

  return {
    ok: true,
    agent: 'dailyObservationAgent',
    mode: input.persist ? 'persist_if_ready' : 'read_only',
    memory,
    data: {
      observation: today.observation,
      persistence,
    },
    warnings: today.observation.warnings,
    blocked: memory.enabled ? [] : [memory.reason],
  };
}

import 'server-only';

import { runInstitutionalCycle } from '@/lib/institution/institutionalCycle';
import { runInstitutionalEvolutionObservation } from '@/lib/institution/institutionalEvolution';
import { syncSfiInstitutionalStateToCognitiveTwin } from './institutionalIntegration';

export async function runIntegratedInstitutionalCycle(trigger = 'scheduled') {
  const preSync = await syncSfiInstitutionalStateToCognitiveTwin();
  const cycle = await runInstitutionalCycle(trigger);
  const evolution = await runInstitutionalEvolutionObservation({
    attractorRefresh: cycle.attractor,
    observedAt: cycle.completedAt,
  }).catch((error) => ({
    ok: false as const,
    contract: 'SFI-INSTITUTIONAL-EVOLUTION-1.0',
    observedAt: new Date().toISOString(),
    candidates: [],
    proposals: [],
    proposalRefs: [],
    createdCount: 0,
    reusedCount: 0,
    context: {},
    founderDependency: {
      pendingSovereignDecisions: 0,
      routineWorkRequiresFounder: false,
      rule: 'Evolution observation degraded; this does not transfer routine work back to the founder or authorize an alternate mutation path.',
    },
    warnings: [error instanceof Error ? error.message : String(error)],
    boundary: 'Evolution failure cannot authorize direct mutation, publication, spending, access changes or canon changes.',
  }));
  const postSync = await syncSfiInstitutionalStateToCognitiveTwin();

  return {
    ...cycle,
    institutionalEvolution: evolution,
    cognitiveTwinIntegration: {
      preSync,
      postSync,
      connected: postSync.integration.summary.fullyConnected,
      exercised: postSync.integration.summary.fullyExercised,
    },
    ok: cycle.ok && evolution.ok && postSync.ok,
    status: cycle.ok && evolution.ok && postSync.ok ? 'COMPLETED' : 'DEGRADED',
  };
}

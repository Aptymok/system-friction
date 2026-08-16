import 'server-only';

import { runInstitutionalCycle } from '@/lib/institution/institutionalCycle';
import { syncSfiInstitutionalStateToCognitiveTwin } from './institutionalIntegration';

export async function runIntegratedInstitutionalCycle(trigger = 'scheduled') {
  const preSync = await syncSfiInstitutionalStateToCognitiveTwin();
  const cycle = await runInstitutionalCycle(trigger);
  const postSync = await syncSfiInstitutionalStateToCognitiveTwin();

  return {
    ...cycle,
    cognitiveTwinIntegration: {
      preSync,
      postSync,
      connected: postSync.integration.summary.fullyConnected,
      exercised: postSync.integration.summary.fullyExercised,
    },
    ok: cycle.ok && postSync.ok,
    status: cycle.ok && postSync.ok ? 'COMPLETED' : 'DEGRADED',
  };
}

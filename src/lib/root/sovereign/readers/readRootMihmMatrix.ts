import 'server-only';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { bounded, dateValue, selectRows, source } from './readerSupport';
import { readRootMihmMatrix } from './readRootMihmMatrix';

export async function readRootSystemState() {
  const [governance, world, events, audits, matrix] = await Promise.all([
    bounded('governanceRuntime', () => readGovernanceRuntime()),
    selectRows({ table: 'world_vector_observations', select: 'id,cycle_id,observed_at,day_of_week,sector,status,dominant_signal,interpretation,confidence,source_snapshot_id,domain_values,dominant_sources,warnings,created_at', order: 'observed_at', limit: 1 }),
    selectRows({ table: 'epistemic_events', select: 'id,event_id,event_name,epistemic_class,confidence,source,payload,lineage,occurred_at,created_at', order: 'occurred_at', limit: 1 }),
    selectRows({ table: 'root_audit_events', select: 'id,actor_id,action,target,payload,created_at', order: 'created_at', limit: 1 }),
    bounded('mihmMatrix', () => readRootMihmMatrix()),
  ]);
  const observedAt = dateValue(world.rows[0]?.observed_at ?? events.rows[0]?.occurred_at ?? audits.rows[0]?.created_at);
  return source({ governance: governance.data, worldVector: world.rows[0] ?? null, latestEpistemicEvent: events.rows[0] ?? null, latestAudit: audits.rows[0] ?? null, matrix: matrix.data ?? [] }, 'governanceRuntime + world_vector + epistemic audit + mihm instrument matrix', [governance.error, world.error, events.error, audits.error, matrix.error], observedAt, !governance.data && !world.rows.length);
}
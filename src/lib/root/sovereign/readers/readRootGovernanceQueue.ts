import 'server-only';
import { dateValue, selectRows, source } from './readerSupport';

export async function readRootGovernanceQueue() {
  const [proposals, mutations, audits, events] = await Promise.all([
    selectRows({ table: 'action_proposals', select: 'id,title,description,objective,status,risk_level,approval_required,event_id,outcome,proposal_type,created_at,updated_at,approved_at,executed_at,payload,actor_id', order: 'created_at', limit: 60 }),
    selectRows({ table: 'logbook_mutations', select: 'id,event_id,mutation_key,target,current_state,proposed_state,coherence_delta,status,proposal_id,actor_id,mutation_type,payload,created_at,updated_at', order: 'created_at', limit: 50 }),
    selectRows({ table: 'root_audit_events', select: 'id,actor_id,action,target,payload,created_at', order: 'created_at', limit: 40 }),
    selectRows({ table: 'epistemic_events', select: 'id,event_id,event_name,logbook_id,epistemic_class,confidence,source,actor_id,node_id,payload,lineage,occurred_at,created_at', order: 'occurred_at', limit: 40 }),
  ]);
  const observedAt = dateValue(proposals.rows[0]?.updated_at ?? proposals.rows[0]?.created_at ?? audits.rows[0]?.created_at ?? events.rows[0]?.occurred_at);
  return source({ proposals: proposals.rows, mutations: mutations.rows, audits: audits.rows, events: events.rows }, 'governance persistence', [proposals.error, mutations.error, audits.error, events.error], observedAt, !proposals.rows.length && !mutations.rows.length && !events.rows.length);
}

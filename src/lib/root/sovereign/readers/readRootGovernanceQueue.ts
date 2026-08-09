import 'server-only';
import type { RootRow } from '../rootSovereignState';
import { humanEventLabel } from '../selectionNarrative';
import { dateValue, selectRows, source } from './readerSupport';

function readableTechnicalLabel(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  return trimmed.includes('.') || trimmed.includes('_') ? humanEventLabel(trimmed) : trimmed;
}

export async function readRootGovernanceQueue() {
  const [proposals, mutations, audits, events] = await Promise.all([
    selectRows({
      table: 'action_proposals',
      select: 'id,title,description,objective,status,risk_level,approval_required,event_id,outcome,proposal_type,expected_field_delta,proportionality_check,created_at,updated_at,approved_at,executed_at',
      order: 'created_at',
      limit: 40,
    }),
    selectRows({ table: 'logbook_mutations', select: 'id,event_id,mutation_key,target,current_state,proposed_state,coherence_delta,status,proposal_id,actor_id,mutation_type,payload,created_at,updated_at', order: 'created_at', limit: 30 }),
    selectRows({ table: 'root_audit_events', select: 'id,actor_id,action,target,payload,created_at', order: 'created_at', limit: 24 }),
    selectRows({ table: 'epistemic_events', select: 'id,event_id,event_name,logbook_id,epistemic_class,confidence,source,actor_id,node_id,payload,lineage,occurred_at,created_at', order: 'occurred_at', limit: 24 }),
  ]);

  const proposalRows: RootRow[] = proposals.rows.map((entry): RootRow => {
    const rawTitle = typeof entry.title === 'string' ? entry.title : null;
    const rawType = typeof entry.proposal_type === 'string' ? entry.proposal_type : null;
    return { ...entry, technical_title: rawTitle, title: readableTechnicalLabel(rawTitle) ?? readableTechnicalLabel(rawType) ?? rawTitle };
  });

  const eventRows: RootRow[] = events.rows.map((entry): RootRow => {
    const eventName = typeof entry.event_name === 'string' ? entry.event_name : null;
    return { ...entry, title: eventName ? humanEventLabel(eventName) : null, technical_event_name: eventName };
  });

  const auditRows: RootRow[] = audits.rows.map((entry): RootRow => {
    const action = typeof entry.action === 'string' ? entry.action : null;
    return { ...entry, display_action: readableTechnicalLabel(action) ?? action };
  });

  const observedAt = dateValue(proposalRows[0]?.updated_at ?? proposalRows[0]?.created_at ?? auditRows[0]?.created_at ?? eventRows[0]?.occurred_at);
  return source(
    { proposals: proposalRows, mutations: mutations.rows, audits: auditRows, events: eventRows },
    'governance persistence',
    [proposals.error, mutations.error, audits.error, events.error],
    observedAt,
    !proposalRows.length && !mutations.rows.length && !eventRows.length,
  );
}

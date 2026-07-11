import 'server-only';
import type { RootExecutionCapability } from '../rootSovereignState';
import { dateValue, selectRows, source } from './readerSupport';

const capabilities: RootExecutionCapability[] = [
  { id: 'daily', label: 'Run daily observation', state: 'available', endpoint: '/api/root/operational/trigger-observation?job=daily', method: 'POST', description: 'Runs the persisted daily World Vector observation.' },
  { id: 'reports', label: 'Run reports', state: 'available', endpoint: '/api/root/operational/trigger-observation?job=reports', method: 'POST', description: 'Generates governed internal and draft public reports.' },
  { id: 'audit', label: 'Run persistence audit', state: 'available', endpoint: '/api/root/operational/trigger-observation?job=audit', method: 'POST', description: 'Checks persistence and alert state.' },
  { id: 'all', label: 'Run all', state: 'available', endpoint: '/api/root/operational/trigger-observation?job=all', method: 'POST', description: 'Runs all supported observation jobs and preserves partial results.' },
  { id: 'evidence', label: 'Record evidence', state: 'available', endpoint: '/api/root/evidence', method: 'POST', description: 'Persists evidence, event, graph node, mutation and audit.' },
  { id: 'mutation', label: 'Close mutation', state: 'available', endpoint: '/api/root/mutations/:id/close', method: 'POST', description: 'Closes a selected persisted mutation.' },
  { id: 'amv-search', label: 'Search AMV', state: 'available', endpoint: '/api/root/agentic/amv', method: 'POST', description: 'Reads operational memory.' },
  { id: 'amv-ingest', label: 'Ingest AMV', state: 'available', endpoint: '/api/root/agentic/amv', method: 'POST', description: 'Persists declared memory; it does not verify truth.' },
  { id: 'graph', label: 'Query neural graph', state: 'available', endpoint: '/api/root/agentic/neural-graph', method: 'POST', description: 'Queries persisted graph and evidence.' },
  { id: 'report', label: 'Generate report', state: 'available', endpoint: '/api/root/agentic/report', method: 'POST', description: 'Generates or persists a report; never implies publication.' },
  { id: 'prediction', label: 'Approve valid ScoreFriction draft', state: 'partial', endpoint: '/api/root/predictions/approve', method: 'POST', description: 'Requires a valid draft plus a human probability from 0 to 1.' },
  { id: 'acp', label: 'Confirm ACP presence', state: 'available', endpoint: '/api/governance/acp-seen', method: 'POST', description: 'Records founder presence and its audit event.' },
  { id: 'simulation', label: 'Social simulation', state: 'gated', endpoint: null, method: null, description: 'NO PERSISTED SIMULATION RUN CONTRACT' },
];

export async function readRootExecution() {
  const actions = await selectRows({ table: 'root_audit_events', select: 'id,actor_id,action,target,payload,created_at', order: 'created_at', limit: 30 });
  return source({ capabilities, recentActions: actions.rows }, 'ROOT route contracts + root_audit_events', [actions.error], dateValue(actions.rows[0]?.created_at), false);
}

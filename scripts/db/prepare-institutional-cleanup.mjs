import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, nowStamp } from './sfi-db-client.mjs';

const PROTECTED = [
  'profiles',
  'root_evidence_entries',
  'sfi_evidence_ledger',
  'epistemic_events',
  'graph_nodes',
  'graph_edges',
  'sfi_graph_nodes',
  'sfi_graph_edges',
  'world_source_observations',
  'world_friction_readings',
  'world_hypotheses',
  'world_hypothesis_outcomes',
  'world_learning_events',
  'worldspect_snapshots',
  'sfi_reference_cases',
  'sfi_cognitive_twin_memory',
  'sfi_cognitive_twin_decisions',
  'sfi_cognitive_twin_models',
  'sfi_cognitive_twin_model_evaluations',
  'sfi_cognitive_twin_runs',
  'sfi_continuity_state',
  'sfi_continuity_runs',
  'sfi_capability_health_checks',
  'sfi_institutional_incidents',
  'sfi_founder_decision_queue',
  'sfi_continuity_reports',
  'root_audit_events',
];

const REVIEW = [
  'action_proposals',
  'logbook_mutations',
  'logbook_visible',
  'logbook_events',
  'logbook_signals',
  'logbook_regime',
  'logbook_knowledge',
  'logbook_frictions',
  'amv_learning',
  'evidence_ledger',
  'root_neural_nodes',
  'root_neural_edges',
  'scorefriction_sources',
  'scorefriction_observations',
  'scorefriction_vectors',
  'scorefriction_evidence',
];

const db = createAdminClient();
const rows = [];
for (const table of [...new Set([...PROTECTED, ...REVIEW])]) {
  const result = await db.from(table).select('*', { count: 'exact', head: true });
  rows.push({
    table,
    policy: PROTECTED.includes(table) ? 'PROTECT_BY_DEFAULT' : 'REVIEW_BEFORE_PURGE',
    available: !result.error,
    count: result.error ? null : result.count ?? 0,
    error: result.error?.message ?? null,
  });
}

const report = {
  ok: true,
  destructive: false,
  generatedAt: new Date().toISOString(),
  rule: 'This command never deletes data. It inventories preservation and review candidates before any purge.',
  nextGate: 'A purge plan must name exact tables/row predicates and reference a completed export before deletion is allowed.',
  rows,
};

await mkdir(path.join('docs', 'db'), { recursive: true });
const output = path.join('docs', 'db', `SFI_CLEANUP_PLAN_${nowStamp()}.json`);
await writeFile(output, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ ...report, output }, null, 2));

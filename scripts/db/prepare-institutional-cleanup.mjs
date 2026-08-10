import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, nowStamp } from './sfi-db-client.mjs';

// Cleanup policy is based on epistemic function, not fear of dependencies.
// A derived index can be rebuilt. A source-of-truth record cannot.
const TABLE_POLICY = {
  SOURCE_OF_TRUTH: [
    'profiles',
    'root_evidence_entries',
    'sfi_evidence_ledger',
    'world_source_observations',
    'world_hypotheses',
    'world_hypothesis_outcomes',
    'world_learning_events',
    'sfi_reference_cases',
    'sfi_cognitive_twin_decisions',
    'sfi_cognitive_twin_models',
    'sfi_cognitive_twin_model_evaluations',
    'sfi_continuity_state',
    'sfi_institutional_incidents',
    'sfi_founder_decision_queue',
  ],
  REVIEW_BY_ROW_STATUS: [
    // These tables contain a mix of durable knowledge and disposable candidates/runs.
    'sfi_cognitive_twin_memory',
    'sfi_cognitive_twin_runs',
    'epistemic_events',
    'world_friction_readings',
    'worldspect_snapshots',
    'sfi_continuity_runs',
    'sfi_capability_health_checks',
    'sfi_continuity_reports',
    'root_audit_events',
  ],
  REBUILDABLE_INDEX: [
    // These are projections/indices over evidence and institutional state. They are
    // allowed to disappear and be rebuilt from primary records after cleanup.
    'graph_nodes',
    'graph_edges',
    'sfi_graph_nodes',
    'sfi_graph_edges',
    'root_neural_nodes',
    'root_neural_edges',
  ],
  LEGACY_OR_EPHEMERAL_REVIEW: [
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
    'scorefriction_sources',
    'scorefriction_observations',
    'scorefriction_vectors',
    'scorefriction_evidence',
  ],
};

const ACTION = {
  SOURCE_OF_TRUTH: 'PRESERVE_UNLESS_EXPLICITLY_INVALID_WITH_PROVENANCE',
  REVIEW_BY_ROW_STATUS: 'PRESERVE_VERIFIED_CANONICAL_OR_AUDIT_VALUE_PURGE_REDUNDANT_CANDIDATE_NOISE',
  REBUILDABLE_INDEX: 'EXPORT_OPTIONAL_PURGE_ALLOWED_REBUILD_FROM_PRIMARY_EVIDENCE',
  LEGACY_OR_EPHEMERAL_REVIEW: 'PURGE_OR_MIGRATE_IF_NOT_REFERENCED_BY_CURRENT_RUNTIME',
};

const policyByTable = new Map();
for (const [policy, tables] of Object.entries(TABLE_POLICY)) {
  for (const table of tables) policyByTable.set(table, policy);
}

const db = createAdminClient();
const rows = [];
for (const table of policyByTable.keys()) {
  const result = await db.from(table).select('*', { count: 'exact', head: true });
  const policy = policyByTable.get(table);
  rows.push({
    table,
    policy,
    recommended_action: ACTION[policy],
    available: !result.error,
    count: result.error ? null : result.count ?? 0,
    error: result.error?.message ?? null,
  });
}

const report = {
  ok: true,
  destructive: false,
  generatedAt: new Date().toISOString(),
  rule: 'Preserve primary evidence and validated institutional knowledge; derived indices are rebuildable and must never be protected merely because code currently depends on them.',
  classifications: TABLE_POLICY,
  nextGate: 'Destructive cleanup should target exact row predicates for mixed tables and may whole-table purge REBUILDABLE_INDEX only after confirming a rebuild path from primary evidence.',
  rows,
};

await mkdir(path.join('docs', 'db'), { recursive: true });
const output = path.join('docs', 'db', `SFI_CLEANUP_PLAN_${nowStamp()}.json`);
await writeFile(output, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ ...report, output }, null, 2));

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  createAdminClient,
  nowStamp,
  classifyDbError,
  objectStatusFromError,
  INSECURE_LOCAL_TLS_ALLOWED,
} from './sfi-db-client.mjs';

const stamp = nowStamp();
await mkdir(path.join('docs', 'db'), { recursive: true });
const QUERY_TIMEOUT_MS = Number(process.env.SFI_DB_VERIFY_TIMEOUT_MS ?? 8000);

const CANONICAL_OBJECTS = [
  { name: 'action_proposals', kind: 'table', required: true },
  { name: 'sfi_execution_ledger', kind: 'table', required: true },
  { name: 'sfi_outcomes', kind: 'table', required: true },
  { name: 'sfi_declared_attractors', kind: 'table', required: true },
  { name: 'sfi_amv_memory', kind: 'table', required: true },
  { name: 'vw_sfi_closed_loop_state', kind: 'view', required: true },
  { name: 'vw_sfi_operational_cycle', kind: 'view', required: true },
  { name: 'vw_sfi_stability', kind: 'view', required: true },
  { name: 'vw_sfi_pipeline_loss', kind: 'view', required: true },
  { name: 'vw_sfi_execution_recovery_queue', kind: 'view', required: true },
  { name: 'vw_sfi_evidence_map', kind: 'view', required: true },
  { name: 'vw_sfi_attractor_alignment_queue', kind: 'view', required: true },
  { name: 'worldspect_snapshots', kind: 'table', required: true },
  { name: 'scorefriction_observations', kind: 'table', required: true },
  { name: 'scorefriction_vectors', kind: 'table', required: true },
  { name: 'scorefriction_evidence', kind: 'table', required: true },
  { name: 'scorefriction_proposal_verifications', kind: 'table', required: true },
];

const LEGACY_OBJECTS = [
  { name: 'audits', kind: 'table' },
  { name: 'external_reality_weights', kind: 'table' },
  { name: 'systemic_patterns', kind: 'table' },
];

function connectionFailure(error) {
  return {
    object: '__connection__',
    kind: 'connection',
    status: 'FETCH_BLOCKED',
    exists: false,
    count: null,
    error: error instanceof Error ? error.message : String(error),
    error_classification: classifyDbError(error),
  };
}

async function probeObject(supabase, object) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('sfi_db_verify_timeout')), QUERY_TIMEOUT_MS);
  try {
    const query = supabase
      .from(object.name)
      .select('*', { count: 'exact', head: true })
      .abortSignal(controller.signal);
    const { count, error } = await query;
    if (error) {
      return {
        object: object.name,
        kind: object.kind,
        required: Boolean(object.required),
        status: objectStatusFromError(error),
        exists: false,
        count: null,
        error: error.message,
        error_classification: classifyDbError(error),
      };
    }
    return {
      object: object.name,
      kind: object.kind,
      required: Boolean(object.required),
      status: 'CONFIRMED_IN_DB',
      exists: true,
      count: count ?? 0,
      error: null,
      error_classification: null,
    };
  } catch (error) {
    return {
      object: object.name,
      kind: object.kind,
      required: Boolean(object.required),
      status: 'FETCH_BLOCKED',
      exists: false,
      count: null,
      error: error instanceof Error ? error.message : String(error),
      error_classification: classifyDbError(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

let supabase;
let connection = { ok: false, error_classification: null };
try {
  supabase = createAdminClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('sfi_db_verify_timeout')), QUERY_TIMEOUT_MS);
  const ping = await supabase
    .from('action_proposals')
    .select('id', { count: 'exact', head: true })
    .abortSignal(controller.signal);
  clearTimeout(timer);
  if (ping.error) {
    connection = { ok: false, error_classification: classifyDbError(ping.error), error: ping.error.message };
  } else {
    connection = { ok: true, error_classification: null, error: null };
  }
} catch (error) {
  connection = { ok: false, error_classification: classifyDbError(error), error: error instanceof Error ? error.message : String(error) };
}

const canonical_objects = [];
const legacy_objects = [];

if (!supabase) {
  canonical_objects.push(connectionFailure(connection.error ?? 'client_create_failed'));
} else {
  for (const object of CANONICAL_OBJECTS) canonical_objects.push(await probeObject(supabase, object));
  for (const object of LEGACY_OBJECTS) legacy_objects.push(await probeObject(supabase, object));
}

for (const item of canonical_objects) {
  if (item.status === 'MISSING_IN_DB') item.status = 'MIGRATION_REQUIRED';
}
for (const item of legacy_objects) {
  if (item.status === 'MISSING_IN_DB') item.status = 'MIGRATION_REQUIRED';
}

const failures = canonical_objects
  .filter((item) => item.required !== false && item.status !== 'CONFIRMED_IN_DB')
  .map((item) => `${item.object}:${item.status}`);

const report = {
  ok: failures.length === 0 && connection.ok,
  verified_at: new Date().toISOString(),
  query_timeout_ms: QUERY_TIMEOUT_MS,
  insecure_local_tls_allowed: INSECURE_LOCAL_TLS_ALLOWED,
  tls_risk: INSECURE_LOCAL_TLS_ALLOWED
    ? 'SFI_ALLOW_INSECURE_LOCAL_TLS=true disables TLS certificate verification only for this Node process. Use local diagnostics only.'
    : null,
  connection,
  failures,
  canonical_objects,
  legacy_objects,
  classification_contract: [
    'CONFIRMED_IN_DB',
    'MISSING_IN_DB',
    'PERMISSION_BLOCKED',
    'FETCH_BLOCKED',
    'MIGRATION_REQUIRED',
  ],
  note: 'This verifies SFI DB object presence through Supabase using service-role credentials loaded from .env.local before validation.',
};

const outPath = path.join('docs', 'db', `SFI_DB_VERIFY_${stamp}.json`);
await writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;

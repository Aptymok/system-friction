import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, nowStamp, classifyDbError, INSECURE_LOCAL_TLS_ALLOWED } from './sfi-db-client.mjs';

const stamp = nowStamp();
await mkdir(path.join('docs', 'db'), { recursive: true });

const CASE_ID = `SFI_LIVE_PROOF_${stamp}`;
const MARKER = 'SFI_LIVE_PROOF';
const created = {
  case_id: CASE_ID,
  marker: MARKER,
  perturbation_id: null,
  proposal_id: null,
  execution_id: null,
  outcome_id: null,
  lesson_id: null,
};

function classify(error) {
  return classifyDbError(error);
}

async function safeStep(name, fn) {
  try {
    const data = await fn();
    return { name, ok: true, data, error: null, error_classification: null };
  } catch (error) {
    return {
      name,
      ok: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
      error_classification: classify(error),
    };
  }
}

function requireData(result, label) {
  if (result.error) throw result.error;
  if (!result.data) throw new Error(`${label}_missing`);
  return result.data;
}

const supabase = createAdminClient();
const steps = [];

steps.push(await safeStep('insert_perturbation', async () => {
  const result = await supabase
    .from('sfi_field_perturbations')
    .insert({
      case_id: CASE_ID,
      perturbation_type: MARKER,
      target_domain: 'live_proof',
      target_audience: 'runtime_audit',
      minimal_action: `${MARKER}: minimal closed-loop fixture`,
      expected_effect: `${MARKER}: prove proposal to ledger to outcome`,
      risk_level: 'low',
      status: 'candidate',
      source_pipeline: {
        marker: MARKER,
        test_safe: true,
        production_semantics: false,
        created_by: 'scripts/db/sfi-live-proof.mjs',
      },
    })
    .select('*')
    .single();
  const row = requireData(result, 'perturbation');
  created.perturbation_id = row.id;
  return row;
}));

if (steps.at(-1).ok) {
  steps.push(await safeStep('insert_action_proposal', async () => {
    const result = await supabase
      .from('action_proposals')
      .insert({
        title: `${MARKER}: closed-loop fixture`,
        description: `${MARKER}: test-safe proposal for runtime proof`,
        objective: `${MARKER}: prove closed-loop persistence without production semantic claim`,
        status: 'queued',
        risk_level: 'low',
        expected_field_delta: {
          marker: MARKER,
          test_safe: true,
          perturbation_id: created.perturbation_id,
          objective: 'prove closed-loop persistence',
        },
        proportionality_check: {
          marker: MARKER,
          approvalRequired: false,
          reason: 'runtime proof fixture only',
        },
        approval_required: false,
        outcome: {
          marker: MARKER,
          retained_for_audit: true,
        },
        approved_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    const row = requireData(result, 'action_proposal');
    created.proposal_id = row.id;
    return row;
  }));
}

if (steps.at(-1).ok) {
  steps.push(await safeStep('link_perturbation_to_proposal', async () => {
    const result = await supabase
      .from('sfi_field_perturbations')
      .update({ proposal_id: created.proposal_id, status: 'proposed' })
      .eq('id', created.perturbation_id)
      .select('*')
      .single();
    return requireData(result, 'linked_perturbation');
  }));
}

if (steps.at(-1).ok) {
  steps.push(await safeStep('insert_execution_ledger', async () => {
    const result = await supabase
      .from('sfi_execution_ledger')
      .insert({
        perturbation_id: created.perturbation_id,
        case_id: CASE_ID,
        actor: 'sfi_live_proof',
        artifact_type: 'runtime_fixture',
        artifact_hash: MARKER,
        execution_status: 'outcome_recorded',
        verification_status: 'observed',
        executed_at: new Date().toISOString(),
        source_payload: {
          marker: MARKER,
          test_safe: true,
          proposal_id: created.proposal_id,
          external_execution_allowed: false,
        },
      })
      .select('*')
      .single();
    const row = requireData(result, 'execution_ledger');
    created.execution_id = row.id;
    return row;
  }));
}

if (steps.at(-1).ok) {
  steps.push(await safeStep('insert_outcome', async () => {
    const result = await supabase
      .from('sfi_outcomes')
      .insert({
        execution_id: created.execution_id,
        case_id: CASE_ID,
        outcome_status: 'recorded',
        observed_effect: {
          marker: MARKER,
          effect: 'closed-loop fixture persisted',
          evidence: 'direct service-role insert plus view read',
        },
        unexpected_effects: [],
        prediction_accuracy: 1,
      })
      .select('*')
      .single();
    const row = requireData(result, 'outcome');
    created.outcome_id = row.id;
    return row;
  }));
}

if (steps.at(-1).ok) {
  steps.push(await safeStep('insert_lesson', async () => {
    const result = await supabase
      .from('sfi_lessons')
      .insert({
        outcome_id: created.outcome_id,
        case_id: CASE_ID,
        lesson: `${MARKER}: closed-loop fixture reached outcome persistence.`,
        updates_direction_engine: false,
        updates_risk_engine: false,
        updates_capability_engine: false,
        atlas_update: false,
      })
      .select('*')
      .single();
    const row = requireData(result, 'lesson');
    created.lesson_id = row.id;
    return row;
  }));
}

steps.push(await safeStep('read_closed_loop_view', async () => {
  const result = await supabase
    .from('vw_sfi_closed_loop_state')
    .select('*')
    .limit(1)
    .maybeSingle();
  return requireData(result, 'closed_loop_view');
}));

steps.push(await safeStep('verify_fixture_rows', async () => {
  const [proposal, ledger, outcome] = await Promise.all([
    supabase.from('action_proposals').select('id,title,status').eq('id', created.proposal_id).maybeSingle(),
    supabase.from('sfi_execution_ledger').select('id,case_id,execution_status,verification_status').eq('id', created.execution_id).maybeSingle(),
    supabase.from('sfi_outcomes').select('id,case_id,outcome_status').eq('id', created.outcome_id).maybeSingle(),
  ]);
  for (const [label, result] of Object.entries({ proposal, ledger, outcome })) {
    if (result.error) throw new Error(`${label}: ${result.error.message}`);
    if (!result.data) throw new Error(`${label}_missing`);
  }
  return { proposal: proposal.data, ledger: ledger.data, outcome: outcome.data };
}));

const ok = steps.every((step) => step.ok);
const report = {
  ok,
  verified_at: new Date().toISOString(),
  case_id: CASE_ID,
  marker: MARKER,
  insecure_local_tls_allowed: INSECURE_LOCAL_TLS_ALLOWED,
  created,
  steps,
  cleanup_command: `node scripts/db/cleanup-sfi-live-proof.mjs ${CASE_ID}`,
  retained_records: ok ? 'Fixture records retained as live proof evidence until cleanup command is executed.' : 'Partial fixture may exist; use cleanup command after inspecting created ids.',
};

const outPath = path.join('docs', 'db', `SFI_LIVE_PROOF_${stamp}.json`);
await writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

#!/usr/bin/env node

const HOST = process.env.QA_HOST || process.env.SFI_QA_HOST || 'http://localhost:3000';
const TIMEOUT = Number(process.env.QA_TIMEOUT_MS || 120000);
const CASE_ID = process.env.SFI_QA_CASE_ID || 'SFI-TEST';
const MEDIA_ASSETS = ['image', 'video', 'audio', 'markdown', 'json'];

function countState(state) {
  return {
    perturbations: Array.isArray(state?.perturbations) ? state.perturbations.length : 0,
    capabilityChecks: Array.isArray(state?.capabilityChecks) ? state.capabilityChecks.length : 0,
    ledgerEntries: Array.isArray(state?.ledgerEntries) ? state.ledgerEntries.length : 0,
    mediaAssets: Array.isArray(state?.mediaAssets) ? state.mediaAssets.length : 0,
  };
}

function delta(after, before, key) {
  return after[key] - before[key];
}

function persistenceOk(response) {
  const persistence = response?.json?.persistence;
  if (!persistence || typeof persistence !== 'object') return false;
  return persistence.supabaseOk === true || persistence.all_persisted === true;
}

async function timeoutFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function request(step, route, options = {}) {
  const url = `${HOST}${route}`;

  try {
    const response = await timeoutFetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const json = contentType.includes('application/json') ? await response.json() : null;
    const text = json ? null : await response.text().catch(() => null);
    const ok = response.ok && (json?.ok !== false);

    return {
      step,
      route,
      url,
      status: response.status,
      ok,
      blocked: !ok,
      json,
      text,
      error: ok ? null : json?.error || text || `http_${response.status}`,
    };
  } catch (error) {
    return {
      step,
      route,
      url,
      status: null,
      ok: false,
      blocked: true,
      json: null,
      text: null,
      error: error?.name === 'AbortError' ? 'timeout' : error?.message || 'fetch_failed',
    };
  }
}

async function main() {
  const executionRoute = `/api/sfi/execution-state?case_id=${encodeURIComponent(CASE_ID)}`;
  const steps = [];

  const initialState = await request('initial execution-state', executionRoute);
  steps.push(initialState);

  const runPayload = {
    text: 'SFI execution QA probe',
    case_id: CASE_ID,
    requested_assets: ['text'],
    perturbation_type: 'qa_probe',
    target_domain: 'sfi_execution',
    minimal_action: 'probe_execution_state_persistence',
    expected_effect: 'execution_state_records_increment',
    risk_level: 'low',
  };

  const run = await request('run text asset', '/api/sfi/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(runPayload),
  });
  steps.push(run);

  const afterRunState = await request('post-run execution-state', executionRoute);
  steps.push(afterRunState);

  const mediaPayload = {
    case_id: CASE_ID,
    assets: MEDIA_ASSETS,
    requested_assets: MEDIA_ASSETS,
    pipeline: run.json?.result || {},
    request: {
      text: runPayload.text,
      case_id: CASE_ID,
      assets: MEDIA_ASSETS,
      requested_assets: MEDIA_ASSETS,
    },
  };

  const media = await request('media render assets', '/api/sfi/media/render', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mediaPayload),
  });
  steps.push(media);

  const finalState = await request('final execution-state', executionRoute);
  steps.push(finalState);

  const initialCounts = countState(initialState.json);
  const afterRunCounts = countState(afterRunState.json);
  const finalCounts = countState(finalState.json);

  const blocked = steps.filter((step) => step.blocked);
  const runPersistence = persistenceOk(run);
  const mediaPersistence = persistenceOk(media);
  const countPersistence =
    delta(afterRunCounts, initialCounts, 'perturbations') > 0 &&
    delta(afterRunCounts, initialCounts, 'capabilityChecks') > 0 &&
    delta(afterRunCounts, initialCounts, 'ledgerEntries') > 0 &&
    delta(finalCounts, afterRunCounts, 'mediaAssets') > 0;
  const supabasePersistence = runPersistence && mediaPersistence && countPersistence;
  const ok = blocked.length === 0 && supabasePersistence;

  console.log('SFI execution QA summary');
  console.log(`ok: ${ok}`);
  console.log(`blocked: ${blocked.length}`);
  console.log(`supabase persistence: ${supabasePersistence}`);
  console.log('counts:');
  console.log(`- perturbations: ${finalCounts.perturbations}`);
  console.log(`- capabilityChecks: ${finalCounts.capabilityChecks}`);
  console.log(`- ledgerEntries: ${finalCounts.ledgerEntries}`);
  console.log(`- mediaAssets: ${finalCounts.mediaAssets}`);

  if (!ok) {
    console.log('details:');
    for (const step of steps) {
      console.log(`- ${step.step}: status=${step.status || 'ERR'} ok=${step.ok} error=${step.error || 'none'}`);
    }
    console.log(
      `- deltas: perturbations=${delta(afterRunCounts, initialCounts, 'perturbations')} capabilityChecks=${delta(afterRunCounts, initialCounts, 'capabilityChecks')} ledgerEntries=${delta(afterRunCounts, initialCounts, 'ledgerEntries')} mediaAssets=${delta(finalCounts, afterRunCounts, 'mediaAssets')}`
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('qa:sfi-execution failed', error);
  process.exit(1);
});

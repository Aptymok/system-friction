#!/usr/bin/env node

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const writeCheck = process.env.WRITE_CHECK === 'true';

function classifyFetchError(error) {
  const message = error instanceof Error ? error.message : String(error || 'unknown');
  if (/certificate|self-signed|unable to verify|tls|ssl/i.test(message)) return 'tls_or_proxy_failure';
  if (/fetch failed|network|ENOTFOUND|ECONN|ETIMEDOUT/i.test(message)) return 'fetch_failed';
  return 'unknown';
}

function fail(code, action, details = '') {
  console.error('SUPABASE_WORLDSPECT_QA_FAILED');
  console.error(`reason=${code}`);
  console.error(`action=${action}`);
  if (details) console.error(`details=${details}`);
  process.exit(1);
}

function ok(lines) {
  console.log('SUPABASE_WORLDSPECT_QA_OK');
  lines.forEach(([key, value]) => console.log(`${key}=${value}`));
}

if (!url || !serviceRole) {
  fail('missing_env', 'Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local shell. Do not commit them.');
}

let parsed;
try {
  parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Supabase URL must be https.');
} catch (error) {
  fail('invalid_url', 'Verify the Supabase project URL.', error instanceof Error ? error.message : String(error));
}

async function supabaseFetch(path, init = {}) {
  const response = await fetch(`${parsed.origin}${path}`, {
    ...init,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      ...(init.headers || {}),
    },
  }).catch((error) => {
    fail(classifyFetchError(error), 'Check corporate TLS/proxy configuration or local insecure TLS setting.', error instanceof Error ? error.message : String(error));
  });

  const bodyText = await response.text();
  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  if (response.status === 401) fail('auth_failed', 'Verify SUPABASE_SERVICE_ROLE_KEY.', JSON.stringify(body));
  if (response.status === 403) fail('permission_denied', 'Verify service role permissions and RLS context.', JSON.stringify(body));
  if (response.status === 404 || /does not exist|schema cache|not find|relation/i.test(JSON.stringify(body))) {
    fail('table_missing', 'Verify public.worldspect_snapshots exists before write checks.', JSON.stringify(body));
  }
  if (response.status === 409 || /constraint/i.test(JSON.stringify(body))) {
    fail('constraint_failure', 'Inspect table constraints and write payload.', JSON.stringify(body));
  }
  if (!response.ok) fail('unknown', `HTTP ${response.status}`, JSON.stringify(body));

  return body;
}

const readRows = await supabaseFetch('/rest/v1/worldspect_snapshots?select=id,observed_at&order=observed_at.desc&limit=1');

if (!writeCheck) {
  ok([
    ['mode', 'read_only'],
    ['write_check', 'false'],
    ['read_rows', Array.isArray(readRows) ? readRows.length : 0],
    ['message', 'No write performed. Set WRITE_CHECK=true only when the human explicitly wants a controlled write check.'],
  ]);
  process.exit(0);
}

const payload = {
  alert_type: 'write_failed',
  severity: 'info',
  message: 'Controlled Supabase write check for World Vector Pulse QA.',
  probable_cause: 'manual_write_check',
  recommended_action: 'Resolve or delete this test alert after confirming write path.',
  raw_payload: {
    script: 'scripts/qa-supabase-worldspect-write.mjs',
    write_check: true,
    created_by: 'human_explicit_execution',
  },
};

const written = await supabaseFetch('/rest/v1/world_vector_alerts', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify(payload),
});

ok([
  ['mode', 'controlled_write'],
  ['write_check', 'true'],
  ['read_rows', Array.isArray(readRows) ? readRows.length : 0],
  ['written_rows', Array.isArray(written) ? written.length : 0],
]);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

if (process.env.SFI_ALLOW_INSECURE_LOCAL_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const HOST = process.env.QA_HOST ?? 'http://localhost:3000';
const TIMEOUT = Number(process.env.QA_TIMEOUT_MS ?? 8000);

function timeoutFetch(url, opts = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error('sfi_live_proof_timeout')), TIMEOUT);
  return fetch(url, { signal: controller.signal, ...opts }).finally(() => clearTimeout(id));
}

async function fetchJson(route, opts = {}) {
  const url = `${HOST}${route}`;
  try {
    const res = await timeoutFetch(url, opts);
    let json = null;
    let text = null;
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      json = await res.json().catch(() => null);
    } else {
      text = await res.text().catch(() => null);
    }
    return { route, url, ok: res.ok, status: res.status, json, text, error: null };
  } catch (error) {
    return {
      route,
      url,
      ok: false,
      status: null,
      json: null,
      text: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function rootCookieHeader() {
  return process.env.SFI_ROOT_COOKIE_HEADER || process.env.ROOT_COOKIE_HEADER || null;
}

async function main() {
  const rootUnauth = await fetchJson('/api/root/state');
  const cookie = rootCookieHeader();
  const rootAuth = cookie
    ? await fetchJson('/api/root/state', { headers: { cookie } })
    : {
        route: '/api/root/state',
        url: `${HOST}/api/root/state`,
        ok: false,
        status: null,
        json: null,
        text: null,
        error: 'BLOCKED_BY_AUTH_FIXTURE: set SFI_ROOT_COOKIE_HEADER to a valid authenticated ROOT Supabase cookie header',
      };
  const operationalState = await fetchJson('/api/sfi/operational-state');
  const consolePage = await fetchJson('/sfi-console', { headers: { accept: 'text/html' } });

  const report = {
    ok: rootUnauth.status === 401 && operationalState.ok && consolePage.ok && (cookie ? rootAuth.ok : true),
    generated_at: new Date().toISOString(),
    host: HOST,
    timeout_ms: TIMEOUT,
    insecure_local_tls_allowed: process.env.SFI_ALLOW_INSECURE_LOCAL_TLS === 'true',
    root_unauthenticated: {
      status: rootUnauth.status,
      classification: rootUnauth.status === 401 ? 'CONFIRMED_401' : 'UNEXPECTED',
      body: rootUnauth.json,
      error: rootUnauth.error,
    },
    root_authenticated: {
      status: rootAuth.status,
      classification: cookie ? (rootAuth.ok ? 'CONFIRMED_AUTHORIZED_ROOT_STATE' : 'AUTH_REQUEST_FAILED') : 'BLOCKED_BY_AUTH_FIXTURE',
      body: rootAuth.json,
      error: rootAuth.error,
      required_fixture: cookie ? null : 'SFI_ROOT_COOKIE_HEADER with a valid authenticated ROOT actor session',
    },
    sfi_operational_state: {
      status: operationalState.status,
      ok: operationalState.ok,
      body_ok: operationalState.json?.ok ?? null,
      state: operationalState.json?.status ?? operationalState.json?.operational_state ?? null,
      closed_loop: operationalState.json?.closedLoop ?? operationalState.json?.closed_loop ?? null,
      error: operationalState.error,
    },
    sfi_console: {
      status: consolePage.status,
      ok: consolePage.ok,
      html_contains_sfi_console: typeof consolePage.text === 'string' ? /sfi console|SFI Console|operational/i.test(consolePage.text) : null,
      error: consolePage.error,
    },
  };

  const outPath = path.join('docs', 'db', `SFI_LIVE_SURFACE_PROOF_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

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

async function fetchResult(route, opts = {}) {
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

function pageSummary(result, expectedPattern = null) {
  return {
    status: result.status,
    ok: result.ok,
    expected_content_observed: expectedPattern && typeof result.text === 'string'
      ? expectedPattern.test(result.text)
      : null,
    error: result.error,
  };
}

async function main() {
  const rootUnauth = await fetchResult('/api/root/state');
  const loginPage = await fetchResult('/login', { headers: { accept: 'text/html' } });
  const continuityAccessPage = await fetchResult('/continuity-access', { headers: { accept: 'text/html' } });
  const operationalState = await fetchResult('/api/sfi/operational-state');

  const cookie = rootCookieHeader();
  const rootAuth = cookie
    ? await fetchResult('/api/root/state', { headers: { cookie } })
    : {
        route: '/api/root/state',
        url: `${HOST}/api/root/state`,
        ok: false,
        status: null,
        json: null,
        text: null,
        error: 'BLOCKED_BY_AUTH_FIXTURE: set SFI_ROOT_COOKIE_HEADER to a valid authenticated ROOT SFI session Cookie header (currently Neon-backed)',
      };

  const publicGuardPass =
    rootUnauth.status === 401
    && loginPage.ok
    && continuityAccessPage.ok
    && operationalState.ok;

  const authenticatedRootPass = cookie ? rootAuth.ok : null;
  const proofState = !publicGuardPass
    ? 'RETURN_FAIL'
    : !cookie
      ? 'BLOCKED_BY_AUTH_FIXTURE'
      : authenticatedRootPass
        ? 'RETURN_PASS'
        : 'RETURN_FAIL';

  const report = {
    contract: 'SFI-LIVE-SURFACE-PROOF-2.0',
    ok: proofState === 'RETURN_PASS',
    proof_state: proofState,
    generated_at: new Date().toISOString(),
    host: HOST,
    timeout_ms: TIMEOUT,
    insecure_local_tls_allowed: process.env.SFI_ALLOW_INSECURE_LOCAL_TLS === 'true',
    public_auth_guard: {
      ok: publicGuardPass,
      root_unauthenticated: {
        status: rootUnauth.status,
        classification: rootUnauth.status === 401 ? 'CONFIRMED_401' : 'UNEXPECTED',
        body: rootUnauth.json,
        error: rootUnauth.error,
      },
      login: pageSummary(loginPage, /Acceso al instituto|Sign in|correo|password/i),
      continuity_access: pageSummary(continuityAccessPage, /Activar continuidad|continuity|código temporal/i),
      operational_state: {
        status: operationalState.status,
        ok: operationalState.ok,
        body_ok: operationalState.json?.ok ?? null,
        state: operationalState.json?.status ?? operationalState.json?.operational_state ?? null,
        closed_loop: operationalState.json?.closedLoop ?? operationalState.json?.closed_loop ?? null,
        error: operationalState.error,
      },
    },
    root_authenticated: {
      status: rootAuth.status,
      classification: cookie
        ? (rootAuth.ok ? 'CONFIRMED_AUTHORIZED_ROOT_STATE' : 'AUTH_REQUEST_FAILED')
        : 'BLOCKED_BY_AUTH_FIXTURE',
      body: rootAuth.json,
      error: rootAuth.error,
      required_fixture: cookie
        ? null
        : 'SFI_ROOT_COOKIE_HEADER with a valid authenticated ROOT SFI session Cookie header (currently Neon-backed)',
    },
  };

  const outPath = path.join('docs', 'db', `SFI_LIVE_SURFACE_PROOF_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));

  if (proofState === 'BLOCKED_BY_AUTH_FIXTURE') {
    process.exitCode = 2;
  } else if (proofState !== 'RETURN_PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

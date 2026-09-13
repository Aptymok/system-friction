import assert from 'node:assert/strict';

const TARGET = (process.env.SFI_PRODUCTION_SMOKE_TARGET || 'https://www.systemfriction.org').replace(/\/$/, '');
const TIMEOUT_MS = 12000;

async function read(path, accept = '*/*') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${TARGET}${path}`, {
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        accept,
        'cache-control': 'no-cache',
        'user-agent': 'SFI-live-publication-case-surface-assurance/1.0',
      },
    });
    const bytes = await response.arrayBuffer();
    const text = Buffer.from(bytes).toString('utf8');
    return {
      path,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type') || '',
      text,
      bytes: bytes.byteLength,
    };
  } finally {
    clearTimeout(timer);
  }
}

const openapiResponse = await read('/openapi.json', 'application/json');
assert.equal(openapiResponse.status, 200, 'live_openapi_status_must_be_200');
const openapi = JSON.parse(openapiResponse.text);
const caseObject = openapi.paths?.['/api/external/v1/cases/object']?.post;
assert.ok(caseObject, 'live_case_object_path_required');
assert.equal(caseObject.operationId, 'addSfiCaseObject', 'live_case_object_operation_id_mismatch');
assert.deepEqual(caseObject.security, [{ sfiOAuth: ['cases:write'] }], 'live_case_object_oauth_scope_mismatch');

const notas = await read('/publications/notas-temporales-v1', 'text/html');
assert.equal(notas.status, 200, 'notas_temporales_page_status_must_be_200');
assert.match(notas.text, /Notas Temporales/i, 'notas_temporales_title_missing');
assert.match(notas.text, /notas-temporales-septiembre-2026\.webp/i, 'notas_temporales_cover_binding_missing');

const kavak = await read('/publications/kavak-estado-autoridad-ejecucion', 'text/html');
assert.equal(kavak.status, 200, 'kavak_page_status_must_be_200');
assert.match(kavak.text, /KAVAK/i, 'kavak_title_missing');
assert.match(kavak.text, /notas-de-caso\.webp/i, 'kavak_case_cover_binding_missing');

const notasCover = await read('/images/editorial/notas-temporales-septiembre-2026.webp', 'image/webp');
assert.equal(notasCover.status, 200, 'notas_temporales_cover_status_must_be_200');
assert.ok(notasCover.bytes > 1000, 'notas_temporales_cover_must_have_material_bytes');

const caseCover = await read('/images/editorial/notas-de-caso.webp', 'image/webp');
assert.equal(caseCover.status, 200, 'notas_de_caso_cover_status_must_be_200');
assert.ok(caseCover.bytes > 1000, 'notas_de_caso_cover_must_have_material_bytes');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-LIVE-PUBLICATION-CASE-SURFACE-1.0',
  target: TARGET,
  openapi: {
    version: openapi.info?.version ?? null,
    caseObjectPath: '/api/external/v1/cases/object',
    operationId: caseObject.operationId,
    oauthScope: caseObject.security,
  },
  publications: {
    notasTemporales: { status: notas.status, finalUrl: notas.finalUrl, coverBound: true },
    kavak: { status: kavak.status, finalUrl: kavak.finalUrl, coverBound: true },
  },
  assets: {
    notasTemporales: { status: notasCover.status, bytes: notasCover.bytes, contentType: notasCover.contentType },
    notasDeCaso: { status: caseCover.status, bytes: caseCover.bytes, contentType: caseCover.contentType },
  },
  mutation: false,
}, null, 2));

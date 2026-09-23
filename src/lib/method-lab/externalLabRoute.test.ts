import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { buildAuthenticatedGatewayRequest } from '../mcp/authenticatedGatewayProjection';

// Execute the actual route with in-memory dependency boundaries; no live DB or API writes.
function harness(runError?: string) {
  const events: Record<string, any>[] = [];
  const runs: Record<string, any>[] = [];
  const hash = (input: unknown) => createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const mocks: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    '@/lib/method-lab/readModel': { readMethodLabState: async () => ({}) },
    '@/lib/method-lab/simulationRun': { runMethodLabSimulation: async (input: Record<string, any>) => {
      if (runError) throw new Error(runError);
      runs.push(input);
      return { labAnalysisId: 'qa-analysis', run: { labRunId: 'qa-run', resultHash: 'qa-hash', epistemicClass: 'SIMULATED' } };
    } },
    '@/lib/operational/common': { sha256: hash, recordValue: (v: unknown) => v && typeof v === 'object' && !Array.isArray(v) ? v : {}, appendOperationalEvent: async (input: unknown) => ({ ok: true, data: input }) },
    '@/lib/sfi/externalAuth': {
      authorizeExternalRequest: (req: Request, scope: string) => ({ credential: req.headers.get('x-test-scope') === scope ? { label: 'qa', role: 'root_delegate', subjectId: 'qa-subject', tenantId: 'sfi', authMethod: 'oauth' } : null }),
      externalActor: () => 'external:qa',
    },
    '@/lib/events/eventStore': { appendEpistemicEvent: async (input: Record<string, any>) => {
      const event = { event_id: input.eventId, event_name: input.eventName, payload: input.payload, confidence: input.confidence, occurred_at: input.occurredAt, lineage: input.lineage, uncertainty: input.uncertainty ?? null, checksum: hash(input.payload), hash_prev: 'previous-event-hash', hash_self: hash(input), schema_version: '1.0', logbook_id: input.logbookId };
      events.push(event);
      return { ok: true, data: event };
    } },
    '@/runtime/supabase/server': { createServiceSupabaseClient: () => ({ from: (table: string) => {
      let commandId = '';
      let projection = '*';
      const query = { select: (columns: string) => { projection = columns; return query; }, eq: () => query, in: () => query, order: () => query, limit: () => query,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'epistemic_events' ? [...events].reverse() : [], error: null }).then(resolve),
        contains: (_: string, input: { commandId: string }) => { commandId = input.commandId; return query; },
        maybeSingle: async () => {
          const event = events.find(e => e.payload.commandId === commandId);
          return { data: !event ? null : projection === '*' ? event : Object.fromEntries(projection.split(',').map(key => [key, event[key]])), error: null };
        },
      };
      return query;
    } }) },
  };
  const source = readFileSync('src/app/api/external/v1/lab/route.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, any> = {};
  const require = createRequire(import.meta.url);
  const load = (path: string) => {
    const moduleExports: Record<string, any> = {};
    const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports: moduleExports, require: (id: string) => id === 'server-only' ? {} : id in mocks ? mocks[id] : id.startsWith('@/lib/sfi/') || id.startsWith('@/lib/governance/') ? {} : require(id), Response, Date });
    return moduleExports;
  };
  mocks['@/lib/method-lab/researchObjects'] = load('src/lib/method-lab/researchObjects.ts');
  vm.runInNewContext(compiled, { exports, require: (id: string) => id in mocks ? mocks[id] : require(id), Response, Date });
  return { events, runs, manifest: async () => (await load('src/app/api/external/v1/manifest/route.ts').GET()).json(), post: async (body: unknown, scope = 'lab:write') => exports.POST(new Request('https://sfi.test/api/external/v1/lab', { method: 'POST', headers: { 'x-test-scope': scope, 'content-type': 'application/json' }, body: JSON.stringify(body) })) as Promise<Response> };
}

test('persist rejects non-string title/content without coercing objects into evidence', async () => {
  for (const body of [{ title: {}, content: 'text' }, { title: 'title', content: { text: 'nested' } }]) {
    const h = harness();
    assert.equal((await h.post({ operation: 'persist', ...body })).status, 400);
    assert.equal(h.events.length, 0);
  }
});

test('persist and report(commandId) preserve retrospective provenance with idempotency', async () => {
  const h = harness();
  const body = { operation: 'persist', commandId: 'qa-retrospective', title: 'External research', content: 'Bounded source reconstruction', source: 'outside_sfi_method_lab', confidence: 0, refs: ['pdf:sha256:qa'], metadata: { origin: 'outside_sfi_method_lab', conductedAt: '2026-09-21', registrationType: 'RETROSPECTIVE', state: 'EXPERIMENTAL', canonicalPromotion: false, independentReproducibility: 'PENDING' } };
  const created = await h.post(body);
  assert.equal(created.status, 201);
  const receipt = await created.json();
  const replay = await h.post(body);
  assert.equal((await replay.json()).idempotent, true);
  assert.equal(h.events.length, 1);
  const report = await h.post({ operation: 'report', commandId: body.commandId }, 'lab:read');
  assert.equal(report.status, 200);
  const read = await report.json();
  assert.equal(read.event.event_id, receipt.event.event_id);
  assert.deepEqual(read.event, receipt.event, 'read-back must preserve the complete original receipt, including chain verification fields');
  assert.deepEqual(read.event.payload.metadata, body.metadata);
  assert.notEqual(read.event.occurred_at.slice(0, 10), body.metadata.conductedAt);
  assert.equal((await h.post({ ...body, content: 'changed' })).status, 409);
  assert.equal(h.events.length, 1);
});

test('receipt read requires lab:read and returns missing honestly', async () => {
  const h = harness();
  assert.equal((await h.post({ operation: 'report', commandId: 'absent' }, 'lab:write')).status, 401);
  assert.equal((await h.post({ operation: 'report', commandId: 'absent' }, 'lab:read')).status, 404);
});

test('published Lab run example passes MCP projection and runtime; every required field is enforced', async () => {
  const h = harness();
  const manifest = await h.manifest();
  const published = manifest.operations.find((op: any) => op.id === 'lab-run');
  assert.ok(published.body.example, 'manifest must publish the accepted payload');
  const schema = JSON.parse(readFileSync('public/openapi.json', 'utf8')).components.schemas.LabRequest;
  const required = schema.oneOf.find((branch: any) => branch.properties.operation.enum.includes('run')).required;
  assert.deepEqual(published.body.required, required);
  assert.deepEqual(published.body.protocolIds, schema.properties.protocolId.enum);
  for (const protocolId of published.body.protocolIds) {
    const request = buildAuthenticatedGatewayRequest({ operationId: 'operateSfiLab', body: { ...published.body.example, protocolId } });
    assert.equal(request.scope, 'lab:run');
    assert.equal((await h.post(request.body, request.scope)).status, 200);
  }
  for (const field of required) {
    const body = { ...published.body.example };
    delete body[field];
    assert.equal((await h.post(body, 'lab:run')).status, 400);
  }
  assert.equal((await h.post(published.body.example, 'lab:write')).status, 401);
  assert.equal(h.runs.length, published.body.protocolIds.length);
});

test('run rejects unsupported protocols and mixed/blank evidence IDs rather than dropping invalid entries', async () => {
  const h = harness();
  for (const evidenceIds of [[], [' '], ['valid', 7]]) {
    assert.equal((await h.post({ operation: 'run', protocolId: 'economic_simulation', evidenceIds }, 'lab:run')).status, 400);
  }
  const invalid = await h.post({ operation: 'run', protocolId: 'chronos_olympics', evidenceIds: ['valid'] }, 'lab:run');
  assert.equal(invalid.status, 400);
  assert.deepEqual((await invalid.json()).acceptedProtocolIds, ['sociotechnical_simulation', 'economic_simulation']);
  assert.equal(h.runs.length, 0);
});

test('Lab evidence resolver rejects missing persisted evidence instead of accepting caller IDs', async () => {
  const exports: Record<string, any> = {};
  const query = { select: () => query, in: async () => ({ data: [], error: null }) };
  const code = ts.transpileModule(readFileSync('src/lib/method-lab/persistedEvidenceResolver.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: (id: string) => id === 'server-only' ? {} : { createServiceSupabaseClient: () => ({ from: () => query }) } });
  await assert.rejects(exports.resolveMethodLabEvidence(['missing-row']), /METHOD_LAB_PERSISTED_EVIDENCE_NOT_FOUND:missing-row/);
  await assert.rejects(exports.resolveMethodLabEvidence([]), /METHOD_LAB_EVIDENCE_IDS_REQUIRED/);
});

test('published research metadata survives MCP, receipt and real object projection without duplicate creation', async () => {
  const h = harness();
  const researchMetadata = { kind: 'METHOD_LAB_RESEARCH_OBJECT', origin: 'outside_sfi_method_lab', conductedAt: '2026-09-21', registration: 'retrospective', canonicalPromotion: false, researchObject: { objectId: 'qa-research', title: 'Bounded research', state: 'EXPERIMENTAL', returnState: 'PENDING', evidenceRefs: ['source-pdf'], limitations: ['Independent reproducibility NOT ESTABLISHED'] } };
  const body = { operation: 'persist', commandId: 'qa-research-registration', title: 'Bounded research', content: 'Source reconstruction', researchMetadata };
  const projected = buildAuthenticatedGatewayRequest({ operationId: 'operateSfiLab', body });
  const schema = JSON.parse(readFileSync('public/openapi.json', 'utf8')).components.schemas.LabRequest;
  assert.equal(schema.properties.researchMetadata.type, 'object', 'legacy manifest payload must also be documented in OpenAPI');
  assert.deepEqual(schema.not.required, ['metadata', 'researchMetadata']);
  assert.equal((await h.post(projected.body, projected.scope)).status, 201);
  const receipt = await (await h.post({ operation: 'report', commandId: body.commandId }, 'lab:read')).json();
  assert.deepEqual(receipt.event.payload.metadata, researchMetadata);
  const report = await h.post({ operation: 'report', objectId: 'qa-research' }, 'lab:read');
  assert.equal(report.status, 200);
  const object = (await report.json()).researchObject;
  assert.equal(object.state, 'EXPERIMENTAL');
  assert.equal(object.source, 'EXTERNAL_AGENT');
  assert.equal(object.returnState, 'PENDING');
  const { researchMetadata: ignored, ...canonical } = body;
  assert.equal((await h.post({ ...canonical, metadata: researchMetadata })).status, 200);
  assert.equal(h.events.length, 1);
  assert.equal((await h.post({ ...canonical, metadata: { ...researchMetadata, conductedAt: '2026-09-22' } })).status, 409, 'metadata correction cannot silently rewrite an existing command');
  assert.equal(h.events.length, 1);
});

test('malformed or ambiguous metadata is rejected instead of silently discarded', async () => {
  for (const metadata of [[], 'text', null]) {
    const h = harness();
    assert.equal((await h.post({ operation: 'persist', title: 't', content: 'c', metadata })).status, 400);
    assert.equal(h.events.length, 0);
  }
  const h = harness();
  assert.equal((await h.post({ operation: 'persist', title: 't', content: 'c', metadata: { origin: 'one' }, researchMetadata: { origin: 'two' } })).status, 400);
  assert.equal(h.events.length, 0);
});

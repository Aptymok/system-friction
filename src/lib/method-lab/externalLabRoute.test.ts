import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual route with in-memory dependency boundaries; no live DB or API writes.
function harness() {
  const events: Record<string, any>[] = [];
  const hash = (input: unknown) => createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const mocks: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    '@/lib/method-lab/readModel': { readMethodLabState: async () => ({}) },
    '@/lib/method-lab/researchObjects': { readMethodLabResearchState: async () => ({ objects: [], warnings: [] }) },
    '@/lib/method-lab/simulationRun': { runMethodLabSimulation: () => { throw new Error('must_not_run'); } },
    '@/lib/operational/common': { sha256: hash, recordValue: (v: unknown) => v && typeof v === 'object' && !Array.isArray(v) ? v : {} },
    '@/lib/sfi/externalAuth': {
      authorizeExternalRequest: (req: Request, scope: string) => ({ credential: req.headers.get('x-test-scope') === scope ? { label: 'qa', role: 'root_delegate', subjectId: 'qa-subject', tenantId: 'sfi', authMethod: 'oauth' } : null }),
      externalActor: () => 'external:qa',
    },
    '@/lib/events/eventStore': { appendEpistemicEvent: async (input: Record<string, any>) => {
      const event = { event_id: input.eventId, event_name: input.eventName, payload: input.payload, confidence: input.confidence, occurred_at: input.occurredAt, lineage: input.lineage };
      events.push(event);
      return { ok: true, data: event };
    } },
    '@/runtime/supabase/server': { createServiceSupabaseClient: () => ({ from: () => {
      let commandId = '';
      const query = { select: () => query, eq: () => query, order: () => query, limit: () => query,
        contains: (_: string, input: { commandId: string }) => { commandId = input.commandId; return query; },
        maybeSingle: async () => ({ data: events.find(e => e.payload.commandId === commandId) ?? null, error: null }),
      };
      return query;
    } }) },
  };
  const source = readFileSync('src/app/api/external/v1/lab/route.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, any> = {};
  const require = createRequire(import.meta.url);
  vm.runInNewContext(compiled, { exports, require: (id: string) => id in mocks ? mocks[id] : require(id), Response, Date });
  return { events, post: async (body: unknown, scope = 'lab:write') => exports.POST(new Request('https://sfi.test/api/external/v1/lab', { method: 'POST', headers: { 'x-test-scope': scope, 'content-type': 'application/json' }, body: JSON.stringify(body) })) as Promise<Response> };
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

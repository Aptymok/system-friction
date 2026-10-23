import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual private function without adding a production test API.
// Only external effects (DB, ledger writer and model) are replaced.
const source = readFileSync('src/lib/sfi/universalEmpiricalContinuation.ts', 'utf8');
const compiled = ts.transpileModule(source + '\nexports.testContrast = contrastLatestReturn;\n', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
type Row = Record<string, any>;
function fixture() {
  const evidence = ['e1', 'e2'].map(event_id => ({
    event_id, event_name: 'FIELD_OBSERVATION', epistemic_class: 'observed',
    payload: { tenantId: 'qa-tenant', cycleId: 'qa-cycle' }, logbook_id: 'universal-evidence:qa-cycle',
  }));
  const returned = { event_id: 'return-1', lineage: [], payload: {
    outcome: { result: 'NOT_OBSERVED', count: 0 }, evidenceRefs: ['e1', 'e2'],
  }};
  const run = { payload: { hypotheses: [{ statement: 'H1' }, { statement: 'H2' }],
    predictions: [{ statement: 'P1', expectedSignals: ['yes'], contradictionSignals: ['no'], observationWindow: 'T1' }],
    discriminatingObservations: ['O1'], stoppingCondition: ['S1'] } };
  const prior = { event_id: 'contrast-1', lineage: ['return-1'], payload: {
    contract: 'SFI-RETURN-CONTRAST-1.2', cycleId: 'qa-cycle', tenantId: 'qa-tenant',
    observedReturn: { result: 'NOT_OBSERVED', count: 0 },
    primaryHypothesis: { statement: 'H1' }, rivalHypotheses: [{ statement: 'H2' }],
    predictions: [{ statement: 'P1', expectedSignals: ['yes'], contradictionSignals: ['no'], observationWindow: 'T1' }],
    discriminatingObservations: ['O1'], stoppingConditions: ['S1'],
    expectedSignals: ['yes'], contradictionSignals: ['no'], observationWindows: ['T1'],
    declaredReturnEvidenceRefs: ['e1', 'e2'], returnEvidenceRefs: ['e1', 'e2'],
    rejectedReturnEvidenceRefs: [], evidenceValidationWarning: null,
    calibrationStatus: 'REQUIRES_REVIEW', classification: 'INCONCLUSIVE',
  }};
  return { evidence, history: { events: [], returns: [returned], cognitiveRuns: [run],
    structuredResults: [], returnContrasts: [prior] } };
}
function harness(evidence: Row[], dbError: string | null = null) {
  const writes: Row[] = [];
  let modelCalls = 0;
  const query = { select: () => query, in: async (_key: string, refs: string[]) => ({
    data: evidence.filter(e => refs.includes(e.event_id)),
    error: dbError ? { message: dbError } : null,
  }) };
  const exports: Row = {};
  vm.runInNewContext(compiled, { exports, require: (id: string) => {
    if (id === 'server-only') return {};
    if (id === '@/runtime/supabase/server') return { createServiceSupabaseClient: () => ({ from: (table: string) => {
      assert.equal(table, 'epistemic_events'); return query;
    } }) };
    if (id === '@/lib/events/eventStore') return { appendEpistemicEvent: async (entry: Row) => {
      writes.push(entry); return { ok: true, data: { event_id: 'written-' + writes.length } };
    } };
    if (id === '@/lib/ai/providerRouter') return { runLlmTask: async () => {
      modelCalls++;
      return { ok: true, provider: 'synthetic', model: 'synthetic',
        result: '{"classification":"INCONCLUSIVE","reason":"synthetic fixture","confidence":null}', warnings: [] };
    } };
    return new Proxy({}, { get: () => () => { throw new Error('Unexpected dependency: ' + id); } });
  } });
  return { run: (history: Row) => exports.testContrast(history, 'qa-cycle', 'qa-tenant'),
    writes, modelCalls: () => modelCalls };
}
test('unchanged inconclusive RETURN skips classifier and all ledger writes', async () => {
  const { evidence, history } = fixture(); const h = harness(evidence);
  assert.equal((await h.run(history)).reused, true);
  assert.equal(h.modelCalls(), 0); assert.equal(h.writes.length, 0);
});
test('unchanged calibrated contrast is reused without side effects', async () => {
  const { evidence, history } = fixture();
  Object.assign(history.returnContrasts[0].payload, { calibrationStatus: 'CONTRAST_RECORDED', classification: 'CONFIRMED' });
  const h = harness(evidence); assert.equal((await h.run(history)).reused, true);
  assert.equal(h.modelCalls(), 0); assert.equal(h.writes.length, 0);
});
for (const change of ['prediction', 'RETURN', 'signal', 'verified evidence']) {
  test(change + ' change produces a fresh contrast through the real writer boundary', async () => {
    const { evidence, history } = fixture();
    if (change === 'prediction') history.cognitiveRuns[0].payload.predictions[0].statement = 'P2';
    if (change === 'RETURN') history.returns[0].payload.outcome.count = 1;
    if (change === 'signal') history.cognitiveRuns[0].payload.predictions[0].expectedSignals = ['new'];
    if (change === 'verified evidence') evidence.pop();
    const h = harness(evidence); await h.run(history);
    assert.equal(h.modelCalls(), 1);
    assert.equal(h.writes.filter(e => e.eventName === 'SFI_UNIVERSAL_RETURN_CONTRASTED').length, 1);
  });
}
test('evidence validation failure never reuses a prior contrast or calibrates', async () => {
  const { evidence, history } = fixture(); const h = harness(evidence, 'synthetic database unavailable');
  await h.run(history);
  const written = h.writes.find(e => e.eventName === 'SFI_UNIVERSAL_RETURN_CONTRASTED');
  assert.equal(written?.payload.calibrationStatus, 'RETURN_EVIDENCE_VALIDATION_DEGRADED');
  assert.equal(written?.payload.classification, 'INCONCLUSIVE');
});
test('evidence row ordering does not create another contrast', async () => {
  const { evidence, history } = fixture(); const h = harness(evidence.reverse());
  assert.equal((await h.run(history)).reused, true);
  assert.equal(h.modelCalls(), 0); assert.equal(h.writes.length, 0);
});
test('JSON object key ordering does not create another contrast', async () => {
  const { evidence, history } = fixture();
  history.returns[0].payload.outcome = { count: 0, result: 'NOT_OBSERVED' };
  const h = harness(evidence); assert.equal((await h.run(history)).reused, true);
  assert.equal(h.modelCalls(), 0); assert.equal(h.writes.length, 0);
});

test('concurrent stale-history callers expose missing semantic uniqueness at writer boundary', async () => {
  const { evidence, history } = fixture();
  const h = harness(evidence);
  const results = await Promise.all([h.run(history), h.run(history)]);
  assert.equal(results.length, 2);
  // Both callers observed the same history; the mocked append boundary has no
  // database-level semantic uniqueness guarantee. This is a documented failing
  // invariant, not proof that the production ledger is concurrency-safe.
  assert.equal(h.writes.filter(e => e.eventName === 'SFI_UNIVERSAL_RETURN_CONTRASTED').length, 2);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

type Event = { event_id: string; event_name: string; payload: Record<string, unknown>; lineage?: string[] };
const source = readFileSync('src/lib/sfi/universalSignalCycle.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

async function readHistory(events: Event[]) {
  const query = { select: () => query, or: () => query, order: () => query,
    range: async (from: number, to: number) => ({ data: events.slice(from, to + 1), error: null }) };
  const exports: Record<string, any> = {};
  vm.runInNewContext(compiled, { exports, require: (id: string) => {
    if (id === '@/runtime/supabase/server') return { createServiceSupabaseClient: () => ({ from: () => query }) };
    // All other dependencies are deliberately inert. Reading must not execute agents or write.
    return new Proxy({}, { get: () => () => { throw new Error(`Unexpected dependency call: ${id}`); } });
  } });
  return exports.readUniversalCycleHistory('qa-cycle');
}

const returned = (id = 'return-1'): Event => ({ event_id: id, event_name: 'SFI_UNIVERSAL_RETURN_RECORDED', payload: {} });
const contrasted = (status = 'CONTRAST_RECORDED', returnId = 'return-1', extra: Record<string, unknown> = {}): Event => ({
  event_id: 'contrast-1', event_name: 'SFI_UNIVERSAL_RETURN_CONTRASTED', lineage: [returnId, 'evidence-1'],
  payload: { calibrationStatus: status, classification: 'CONFIRMED', returnTraceability: 'VERIFIED_EVIDENCE_LINKED', returnEvidenceRefs: ['evidence-1'], ...extra },
});

test('failed contrasts never promote RETURN to CALIBRATED', async () => {
  for (const status of ['PREDICTION_MISSING', 'DISCRIMINATING_SIGNALS_MISSING', 'RETURN_EVIDENCE_VALIDATION_DEGRADED', 'RETURN_EVIDENCE_UNLINKED', 'RETURN_EVIDENCE_UNVERIFIED', 'REQUIRES_REVIEW']) {
    const result = await readHistory([returned(), contrasted(status)]);
    assert.equal(result.state, 'RETURN_RECORDED', status);
    assert.equal(result.returnContrasts.length, 1, 'failed contrast remains reconstructible');
  }
});

test('linked successful contrast of latest RETURN projects CALIBRATED', async () => {
  for (const classification of ['CONFIRMED', 'PARTIAL', 'CONTRADICTED']) {
    assert.equal((await readHistory([returned(), contrasted('CONTRAST_RECORDED', 'return-1', { classification })])).state, 'CALIBRATED');
  }
});

test('legacy or internally inconsistent contrasts do not imply calibration', async () => {
  for (const extra of [{ calibrationStatus: undefined }, { classification: 'INCONCLUSIVE' }, { classification: 'UNKNOWN' }, { returnTraceability: 'UNLINKED_OBSERVATION' }, { returnEvidenceRefs: [] }]) {
    assert.equal((await readHistory([returned(), contrasted('CONTRAST_RECORDED', 'return-1', extra)])).state, 'RETURN_RECORDED');
  }
});

test('a later RETURN requires its own contrast', async () => {
  assert.equal((await readHistory([returned(), contrasted(), returned('return-2')])).state, 'RETURN_RECORDED');
});

test('an unlinked or prematurely ordered contrast cannot calibrate a RETURN', async () => {
  assert.equal((await readHistory([returned(), contrasted('CONTRAST_RECORDED', 'other-return')])).state, 'RETURN_RECORDED');
  assert.equal((await readHistory([contrasted(), returned()])).state, 'RETURN_RECORDED');
  assert.equal((await readHistory([contrasted()])).state, 'OPEN');
});

test('latest linked contrast supersedes an earlier successful contrast without deleting it', async () => {
  const result = await readHistory([returned(), contrasted(), { ...contrasted('REQUIRES_REVIEW'), event_id: 'contrast-2' }]);
  assert.equal(result.state, 'RETURN_RECORDED');
  assert.equal(result.returnContrasts.length, 2);
});

test('existing OPEN, AWAITING_RETURN and CLOSED projections retain their meanings', async () => {
  assert.equal((await readHistory([])).state, 'OPEN');
  assert.equal((await readHistory([{ event_id: 'run', event_name: 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED', payload: {} }])).state, 'AWAITING_RETURN');
  assert.equal((await readHistory([returned(), contrasted('PREDICTION_MISSING'), { event_id: 'closed', event_name: 'SFI_UNIVERSAL_CYCLE_CLOSED', payload: {} }])).state, 'CLOSED');
});

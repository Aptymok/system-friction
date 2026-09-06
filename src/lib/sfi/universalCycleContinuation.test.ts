import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  runUniversalCycleContinuation,
  sanitizeUniversalContinuationError,
} from './universalCycleContinuation';

function completedCandidate(cycleId = 'cycle-test') {
  return {
    cycleId,
    resume: null,
    checkpoint: {
      sequence: 1,
      eventId: 'checkpoint-1',
      eventName: 'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT',
      payload: { cycleId },
      logbookId: `universal-cycle:${cycleId}`,
    },
    cognitive: {
      sequence: 2,
      eventId: 'cognitive-1',
      eventName: 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
      payload: { cycleId, completed: true },
      logbookId: `universal-cycle:${cycleId}`,
    },
    synthesis: null,
    syntheses: [],
    returnPlan: null,
    returnEvent: null,
    closed: null,
  };
}

test('ledger read success with zero candidates is AVAILABLE zero work with authoritative scheduling policy', async () => {
  let executions = 0;
  const result = await runUniversalCycleContinuation({}, {
    readTracks: async () => ({ ok: true as const, tracks: [], error: null }),
    continueCandidate: async () => { executions += 1; return { state: 'SHOULD_NOT_EXECUTE' }; },
    sleep: async () => {},
    random: () => 0,
  } as any);

  assert.equal(result.ok, true);
  assert.equal(result.availability, 'AVAILABLE');
  assert.equal(result.processed, 0);
  assert.deepEqual(result.results, []);
  assert.equal(result.schedulingPolicy, 'FAIR_OLDEST_PROGRESS_FIRST_ROUND_ROBIN');
  assert.equal(result.readRecovery.attempts, 1);
  assert.equal(result.readRecovery.retried, false);
  assert.equal(executions, 0);
});

test('one retryable ledger failure recovers before candidate selection and candidate executes at most once', async () => {
  let reads = 0;
  let executions = 0;
  let sleeps = 0;
  const result = await runUniversalCycleContinuation({}, {
    readTracks: async () => {
      reads += 1;
      if (reads === 1) {
        return {
          ok: false as const,
          tracks: [],
          error: {
            code: 'PGRST003',
            message: 'Timed out acquiring connection from connection pool Authorization: Bearer should-not-escape',
          },
        };
      }
      return { ok: true as const, tracks: [completedCandidate()], error: null };
    },
    continueCandidate: async (track: { cycleId: string }) => {
      executions += 1;
      return { cycleId: track.cycleId, state: 'TEST_CONTINUED' };
    },
    sleep: async () => { sleeps += 1; },
    random: () => 0,
  } as any);

  assert.equal(result.ok, true);
  assert.equal(result.availability, 'AVAILABLE');
  assert.equal(reads, 2);
  assert.equal(sleeps, 1);
  assert.equal(executions, 1);
  assert.equal(result.processed, 1);
  assert.equal(result.readRecovery.attempts, 2);
  assert.equal(result.readRecovery.retried, true);
  assert.equal(result.readRecovery.recovered, true);
  assert.equal(result.readRecovery.exhausted, false);
  assert.equal(result.readRecovery.lastFailure?.class, 'TRANSIENT_DATA_PLANE');
  assert.equal(result.readRecovery.lastFailure?.code, 'PGRST003');
  assert.doesNotMatch(result.readRecovery.lastFailure?.message ?? '', /should-not-escape/);
});

test('non-retryable ledger error fails immediately with sanitized cause and zero candidate execution', async () => {
  let reads = 0;
  let executions = 0;
  let sleeps = 0;
  const result = await runUniversalCycleContinuation({}, {
    readTracks: async () => {
      reads += 1;
      return {
        ok: false as const,
        tracks: [],
        error: {
          code: '42P01',
          message: 'relation missing Authorization: Bearer top-secret https://db.example/private?token=abc password=hunter2',
        },
      };
    },
    continueCandidate: async () => { executions += 1; return { state: 'SHOULD_NOT_EXECUTE' }; },
    sleep: async () => { sleeps += 1; },
    random: () => 0,
  } as any);

  assert.equal(result.ok, false);
  assert.equal(result.availability, 'UNAVAILABLE');
  assert.equal(result.processed, 0);
  assert.deepEqual(result.results, []);
  assert.equal(result.schedulingPolicy, null);
  assert.equal(reads, 1);
  assert.equal(sleeps, 0);
  assert.equal(executions, 0);
  assert.equal(result.readRecovery.attempts, 1);
  assert.equal(result.readRecovery.retried, false);
  assert.equal(result.error.class, 'NON_RETRYABLE_DATA_PLANE');
  assert.equal(result.error.code, '42P01');
  assert.equal(result.error.retryable, false);
  assert.doesNotMatch(result.error.message, /top-secret|db\.example|hunter2|token=abc/i);
});

test('exhausted retryable ledger reads fail closed with attempt count and no effects', async () => {
  let reads = 0;
  let executions = 0;
  let sleeps = 0;
  const result = await runUniversalCycleContinuation({}, {
    readTracks: async () => {
      reads += 1;
      return { ok: false as const, tracks: [], error: { code: '08006', message: 'connection failure' } };
    },
    continueCandidate: async () => { executions += 1; return { state: 'SHOULD_NOT_EXECUTE' }; },
    sleep: async () => { sleeps += 1; },
    random: () => 0,
  } as any);

  assert.equal(result.ok, false);
  assert.equal(result.availability, 'UNAVAILABLE');
  assert.equal(result.processed, 0);
  assert.equal(reads, 2);
  assert.equal(sleeps, 1);
  assert.equal(executions, 0);
  assert.equal(result.readRecovery.attempts, 2);
  assert.equal(result.readRecovery.maxAttempts, 2);
  assert.equal(result.readRecovery.retried, true);
  assert.equal(result.readRecovery.recovered, false);
  assert.equal(result.readRecovery.exhausted, true);
  assert.equal(result.error.class, 'TRANSIENT_DATA_PLANE');
  assert.equal(result.error.code, '08006');
});

test('unknown ledger errors are not retried until classification exists', async () => {
  let reads = 0;
  const result = await runUniversalCycleContinuation({}, {
    readTracks: async () => {
      reads += 1;
      return { ok: false as const, tracks: [], error: new Error('opaque unexpected ledger failure') };
    },
    sleep: async () => { throw new Error('sleep must not run'); },
  } as any);
  assert.equal(reads, 1);
  assert.equal(result.ok, false);
  const error = result.error;
  assert.ok(error);
  assert.equal(error.class, 'UNCLASSIFIED_DATA_PLANE');
  assert.equal(error.retryable, false);
});

test('sanitizer preserves useful code/class while removing credential-like material', () => {
  const receipt = sanitizeUniversalContinuationError({
    code: 'PGRST003',
    message: 'request_timeout Authorization=abc123 service_role_key=def456 https://private.example/path',
  });
  assert.equal(receipt.code, 'PGRST003');
  assert.equal(receipt.class, 'TRANSIENT_DATA_PLANE');
  assert.equal(receipt.retryable, true);
  assert.doesNotMatch(receipt.message, /abc123|def456|private\.example/i);
});

test('production receipt distinguishes core PASS from Universal FAIL while global gate remains fail-closed', () => {
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/cron/continuity-heartbeat/route.ts'), 'utf8');
  const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/sfi-continuity-hourly.yml'), 'utf8');

  assert.match(route, /CORE_HEARTBEAT_PASS/);
  assert.match(route, /UNIVERSAL_CONTINUATION_FAIL/);
  assert.match(route, /ok:\s*coreHeartbeatOk\s*&&\s*!laneFailure/);
  assert.match(workflow, /coreHeartbeat/);
  assert.match(workflow, /laneStatus/);
  assert.match(workflow, /UNIVERSAL_CONTINUATION_FAIL/);
  assert.match(workflow, /universal\.get\('error'\)/);
  assert.match(workflow, /universal\.get\('readRecovery'\)/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
});

test('full heartbeat client retry is absent so ledger-read recovery cannot duplicate material effects', () => {
  const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/sfi-continuity-hourly.yml'), 'utf8');
  const continuation = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/universalCycleContinuation.ts'), 'utf8');

  assert.doesNotMatch(workflow, /--retry-all-errors/);
  assert.doesNotMatch(workflow, /--retry\s+[1-9]/);
  assert.match(continuation, /const LEDGER_READ_MAX_ATTEMPTS = 2/);
  assert.match(continuation, /const scan = await readTracksWithRecovery\(dependencies\)/);
  assert.match(continuation, /const candidates = scan\.tracks/);
  assert.ok(continuation.indexOf('readTracksWithRecovery(dependencies)') < continuation.indexOf('const candidates = scan.tracks'));
  assert.match(continuation, /No cognitive completion, synthesis, RETURN plan, RETURN, closure or learning effect was retried or executed/);
});

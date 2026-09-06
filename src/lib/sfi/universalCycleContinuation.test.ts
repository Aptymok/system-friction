import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  deriveContinuityHeartbeatGateReceipt,
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

function assertSecretAbsent(value: unknown, secrets: string[]) {
  const serialized = JSON.stringify(value);
  for (const secret of secrets) {
    assert.doesNotMatch(serialized, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
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
  assert.equal(result.readRecovery.maxAttempts, 2);
  assert.equal(result.readRecovery.retried, false);
  assert.equal(result.readRecovery.recovered, false);
  assert.equal(result.readRecovery.exhausted, false);
  assert.equal(executions, 0);
});

test('one retryable ledger failure recovers on the second and final READ attempt before candidate selection', async () => {
  const recoverySecret = 'RECOVERY_SECRET_93a7';
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
            message: `Timed out acquiring connection from connection pool service_role=${recoverySecret}`,
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
  assert.equal(result.readRecovery.maxAttempts, 2);
  assert.equal(result.readRecovery.retried, true);
  assert.equal(result.readRecovery.recovered, true);
  assert.equal(result.readRecovery.exhausted, false);
  assert.equal(result.readRecovery.lastFailure?.class, 'TRANSIENT_DATA_PLANE');
  assert.equal(result.readRecovery.lastFailure?.code, 'PGRST003');
  assertSecretAbsent(result.readRecovery.lastFailure, [recoverySecret]);
});

test('non-retryable ledger error fails immediately with sanitized cause and zero candidate execution', async () => {
  const secrets = ['NONRETRY_BEARER_42', 'NONRETRY_PASSWORD_42'];
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
          message: `relation missing Authorization: Bearer ${secrets[0]}\npassword=${secrets[1]}`,
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
  const error = result.error;
  assert.ok(error);
  assert.equal(error.class, 'NON_RETRYABLE_DATA_PLANE');
  assert.equal(error.code, '42P01');
  assert.equal(error.retryable, false);
  assertSecretAbsent(error, secrets);
  assertSecretAbsent(result.readRecovery.lastFailure, secrets);
});

test('exhausted retryable ledger reads fail closed after exactly two READ attempts and no effects', async () => {
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
  const error = result.error;
  assert.ok(error);
  assert.equal(error.class, 'TRANSIENT_DATA_PLANE');
  assert.equal(error.code, '08006');
});

test('unclassified ledger errors fail immediately until a retry classification exists', async () => {
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
  assert.equal(result.readRecovery.attempts, 1);
  assert.equal(result.readRecovery.retried, false);
});

test('sanitizer adversarial matrix removes complete credential material while retaining useful diagnostics', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZHZlcnNhcmlhbC1zZWNyZXQifQ.signatureABCDEFGHIJ';
  const secrets = [
    'BEARER_SECRET_a91',
    jwt,
    'POSTGRES_PASSWORD_b82',
    'URL_TOKEN_c73',
    'APIKEY_d64',
    'API_KEY_e55',
    'SERVICE_ROLE_f46',
    'SERVICE_ROLE_DASH_g37',
    'SERVICE_ROLE_KEY_h28',
    'SUPABASE_ROLE_i19',
    'AUTH_BEARER_j10',
    'AUTH_BASIC_k01',
    'AUTH_DIGEST_l92',
    'TOKEN_m83',
    'SECRET_n74',
    'PASSWORD_o65',
  ];
  const lines = [
    `Bearer ${secrets[0]}`,
    jwt,
    `postgresql://user:${secrets[2]}@db.example/internal`,
    `https://private.example/path?token=${secrets[3]}&safe=no`,
    `apikey=${secrets[4]}`,
    `api_key=${secrets[5]}`,
    `service_role=${secrets[6]}`,
    `service-role=${secrets[7]}`,
    `service_role_key=${secrets[8]}`,
    `SUPABASE_SERVICE_ROLE_KEY=${secrets[9]}`,
    `Authorization: Bearer ${secrets[10]}`,
    `Authorization: Basic ${secrets[11]} trailing-private-material`,
    `Authorization: Digest username="probe", response="${secrets[12]}"`,
    `token=${secrets[13]}`,
    `secret=${secrets[14]}`,
    `password=${secrets[15]}`,
  ];
  const receipt = sanitizeUniversalContinuationError({
    code: 'PGRST003',
    message: `request_timeout\n${lines.join('\n')}\nledger read failed after bounded acquisition`,
  });

  assert.equal(receipt.stage, 'LEDGER_READ');
  assert.equal(receipt.code, 'PGRST003');
  assert.equal(receipt.class, 'TRANSIENT_DATA_PLANE');
  assert.equal(receipt.retryable, true);
  assert.match(receipt.message, /request_timeout/);
  assert.match(receipt.message, /ledger read failed after bounded acquisition/);
  assert.match(receipt.message, /Authorization: \[REDACTED\]/);
  assertSecretAbsent(receipt.message, secrets);
});

test('arbitrary error.code cannot become a secret side channel while safe diagnostic codes remain available', () => {
  const codeSecret = 'CODE_SECRET_p56';
  const unsafe = sanitizeUniversalContinuationError({
    code: `service_role=${codeSecret}`,
    message: 'ledger read rejected without a classified diagnostic code',
  });
  assert.equal(unsafe.code, null);
  assert.equal(unsafe.class, 'UNCLASSIFIED_DATA_PLANE');
  assert.equal(unsafe.retryable, false);
  assertSecretAbsent(unsafe, [codeSecret]);

  const postgres = sanitizeUniversalContinuationError({ code: '42P01', message: 'relation unavailable' });
  const postgrest = sanitizeUniversalContinuationError({ code: 'PGRST003', message: 'request_timeout' });
  const network = sanitizeUniversalContinuationError({ code: 'ECONNRESET', message: 'connection reset' });
  assert.equal(postgres.code, '42P01');
  assert.equal(postgrest.code, 'PGRST003');
  assert.equal(network.code, 'ECONNRESET');
});

test('recovery lastFailure uses the same sanitizer and cannot re-expose Authorization or service-role secrets', async () => {
  const secrets = ['LAST_FAILURE_BASIC_q47', 'LAST_FAILURE_ROLE_r38'];
  let reads = 0;
  const result = await runUniversalCycleContinuation({}, {
    readTracks: async () => {
      reads += 1;
      return reads === 1
        ? {
            ok: false as const,
            tracks: [],
            error: {
              code: 'PGRST003',
              message: `request_timeout Authorization: Basic ${secrets[0]} extra-credential-fragment\nservice_role=${secrets[1]}`,
            },
          }
        : { ok: true as const, tracks: [], error: null };
    },
    sleep: async () => {},
    random: () => 0,
  } as any);
  assert.equal(result.ok, true);
  assert.equal(result.readRecovery.recovered, true);
  assert.equal(result.readRecovery.attempts, 2);
  assertSecretAbsent(result.readRecovery.lastFailure, secrets);
  assert.doesNotMatch(result.readRecovery.lastFailure?.message ?? '', /extra-credential-fragment/);
});

test('CORE COMPLETED plus Universal FAIL preserves core PASS, lane FAIL and overall fail-closed behavior', () => {
  const receipt = deriveContinuityHeartbeatGateReceipt({
    runtimeStatus: 'COMPLETED',
    emergencyHalt: false,
    requiredLaneFailed: true,
    universalContinuationOk: false,
  });
  assert.deepEqual(receipt.coreHeartbeat, { ok: true, receipt: 'CORE_HEARTBEAT_PASS' });
  assert.equal(receipt.universalContinuation, 'UNIVERSAL_CONTINUATION_FAIL');
  assert.equal(receipt.overallOk, false);
});

test('CORE DEGRADED can never produce CORE_HEARTBEAT_PASS and fails overall even when every lane passes', () => {
  const receipt = deriveContinuityHeartbeatGateReceipt({
    runtimeStatus: 'DEGRADED',
    emergencyHalt: false,
    requiredLaneFailed: false,
    universalContinuationOk: true,
  });
  assert.deepEqual(receipt.coreHeartbeat, { ok: false, receipt: 'CORE_HEARTBEAT_FAIL' });
  assert.equal(receipt.universalContinuation, 'UNIVERSAL_CONTINUATION_PASS');
  assert.equal(receipt.overallOk, false);
});

test('required lane failure is never hidden by a healthy completed core', () => {
  const receipt = deriveContinuityHeartbeatGateReceipt({
    runtimeStatus: 'COMPLETED',
    emergencyHalt: false,
    requiredLaneFailed: true,
    universalContinuationOk: true,
  });
  assert.equal(receipt.coreHeartbeat.receipt, 'CORE_HEARTBEAT_PASS');
  assert.equal(receipt.overallOk, false);
});

test('EMERGENCY_HALT is explicit HALTED, never healthy PASS, and remains fail-closed', () => {
  const receipt = deriveContinuityHeartbeatGateReceipt({
    runtimeStatus: 'HALTED',
    emergencyHalt: true,
    requiredLaneFailed: false,
    universalContinuationOk: true,
  });
  assert.deepEqual(receipt.coreHeartbeat, { ok: false, receipt: 'CORE_HEARTBEAT_HALTED' });
  assert.equal(receipt.universalContinuation, 'UNIVERSAL_CONTINUATION_HALTED');
  assert.equal(receipt.overallOk, false);
});

test('production receipt workflow exposes core/lane diagnostics without weakening overall gate', () => {
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/cron/continuity-heartbeat/route.ts'), 'utf8');
  const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/sfi-continuity-hourly.yml'), 'utf8');

  assert.match(route, /deriveContinuityHeartbeatGateReceipt/);
  assert.match(route, /ok:\s*gateReceipt\.overallOk/);
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

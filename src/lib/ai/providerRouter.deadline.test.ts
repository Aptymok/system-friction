import test from 'node:test';
import assert from 'node:assert/strict';

import {
  boundedProviderTimeoutMs,
  runLlmTask,
  SFI_TRAJECTORY_DEADLINE_ERROR,
} from './providerRouter';

process.env.OPENAI_API_KEY = 'test-openai';
process.env.ANTHROPIC_API_KEY = 'test-anthropic';

type FetchImplementation = (url: string, init: RequestInit) => Promise<Response>;

async function withClockAndFetch<T>(input: {
  startMs: number;
  fetchImpl: FetchImplementation;
  run: (clock: { now: number; set: (value: number) => void }) => Promise<T>;
}) {
  const originalNow = Date.now;
  const originalFetch = globalThis.fetch;
  const clock = {
    now: input.startMs,
    set(value: number) { this.now = value; },
  };
  Date.now = () => clock.now;
  globalThis.fetch = (async (request: RequestInfo | URL, init?: RequestInit) => input.fetchImpl(String(request), init ?? {})) as typeof fetch;
  try {
    return await input.run(clock);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
}

function openAiSuccess(content = '{"summary":"ok"}', usage: Record<string, unknown> = { prompt_tokens: 2, completion_tokens: 3 }) {
  return new Response(JSON.stringify({
    choices: [{ message: { content } }],
    usage,
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function request(deadlineAtMs: number) {
  return {
    task: 'draft' as const,
    prompt: 'bounded runtime test',
    fallbackResult: '{"status":"LLM_UNAVAILABLE"}',
    preferredProvider: 'openai' as const,
    requirements: { providerAllowlist: ['openai', 'anthropic'] },
    maxProviderAttempts: 4,
    deadlineAtMs,
  };
}

test('F-406-06: provider timeout is deterministically bounded by remaining trajectory wall-clock', () => {
  assert.equal(boundedProviderTimeoutMs(20_000, 1_010, 1_000), 10);
  assert.equal(boundedProviderTimeoutMs(5, 1_010, 1_000), 5);
  assert.equal(boundedProviderTimeoutMs(20_000, 1_000, 1_000), 0);
  assert.equal(boundedProviderTimeoutMs(20_000, undefined, 1_000), 20_000);
  assert.throws(() => boundedProviderTimeoutMs(20_000, Number.NaN, 1_000), /TRAJECTORY_DEADLINE_INVALID/);
  assert.equal(SFI_TRAJECTORY_DEADLINE_ERROR, 'SFI_TRAJECTORY_DEADLINE_REACHED');
});

test('F-406-06/08 A/D/G: late semantic output is rejected while real provider usage remains available only on telemetry plane', async () => {
  let fetchCalls = 0;
  const result = await withClockAndFetch({
    startMs: 1_000,
    fetchImpl: async (_url, init) => {
      fetchCalls += 1;
      assert.ok(init.signal, 'existing provider fetch receives a bounded AbortSignal');
      Date.now = () => 1_011;
      return openAiSuccess('{"summary":"late"}', { prompt_tokens: 2, completion_tokens: 3, cost: 0.25, currency: 'USD' });
    },
    run: async () => runLlmTask(request(1_010)),
  });
  assert.equal(fetchCalls, 1);
  assert.equal(result.ok, false);
  assert.equal(result.result, '');
  assert.ok(result.warnings.includes('trajectory_deadline_reached'));
  assert.equal(result.provider, 'degraded');
  assert.equal(result.usage, null, 'semantic/degraded compatibility surface must not expose late usage as accepted result usage');
  assert.equal(result.telemetry.provider, 'openai');
  assert.equal(result.telemetry.source, 'PROVIDER_RESPONSE');
  assert.deepEqual(result.telemetry.usage, { prompt_tokens: 2, completion_tokens: 3, cost: 0.25, currency: 'USD' });
});

test('F-406-06 B: provider completion before deadline remains valid', async () => {
  let fetchCalls = 0;
  const result = await withClockAndFetch({
    startMs: 2_000,
    fetchImpl: async () => {
      fetchCalls += 1;
      Date.now = () => 2_005;
      return openAiSuccess('{"summary":"on-time"}');
    },
    run: async () => runLlmTask(request(2_010)),
  });
  assert.equal(fetchCalls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.provider, 'openai');
  assert.match(result.result, /on-time/);
  assert.equal(result.warnings.includes('trajectory_deadline_reached'), false);
  assert.equal(result.telemetry.provider, 'openai');
  assert.deepEqual(result.telemetry.usage, { prompt_tokens: 2, completion_tokens: 3 });
});

test('F-406-06 C: first provider attempt consuming remaining wall-clock prevents fallback attempt', async () => {
  const urls: string[] = [];
  const result = await withClockAndFetch({
    startMs: 3_000,
    fetchImpl: async (url) => {
      urls.push(url);
      Date.now = () => 3_010;
      return new Response(JSON.stringify({ error: { message: 'first attempt failed at deadline' } }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    },
    run: async () => runLlmTask(request(3_010)),
  });
  assert.equal(urls.length, 1, 'anthropic fallback must not start after deadline is consumed');
  assert.equal(result.ok, false);
  assert.ok(result.warnings.includes('trajectory_deadline_reached'));
  assert.equal(result.warnings.some((warning) => warning.startsWith('anthropic:')), false);
  assert.equal(result.telemetry.provider, 'openai');
  assert.equal(result.telemetry.usage, null);
  assert.equal(result.telemetry.source, 'PROVIDER_ATTEMPT');
});

test('F-406-06: no provider starts when remainingMs <= 0', async () => {
  let fetchCalls = 0;
  const result = await withClockAndFetch({
    startMs: 4_000,
    fetchImpl: async () => {
      fetchCalls += 1;
      return openAiSuccess();
    },
    run: async () => runLlmTask(request(4_000)),
  });
  assert.equal(fetchCalls, 0);
  assert.equal(result.ok, false);
  assert.ok(result.warnings.includes('trajectory_deadline_reached'));
  assert.equal(result.telemetry.source, 'NOT_AVAILABLE');
  assert.equal(result.telemetry.usage, null);
});

test('F-406-06 E: late provider return cannot be reclassified into success by another eligible candidate', async () => {
  const urls: string[] = [];
  const result = await withClockAndFetch({
    startMs: 5_000,
    fetchImpl: async (url) => {
      urls.push(url);
      Date.now = () => 5_020;
      return openAiSuccess('{"summary":"late-success-must-not-propagate"}');
    },
    run: async () => runLlmTask(request(5_010)),
  });
  assert.equal(urls.length, 1);
  assert.equal(result.ok, false);
  assert.equal(result.result, '');
  assert.ok(result.warnings.includes('trajectory_deadline_reached'));
  assert.deepEqual(result.telemetry.usage, { prompt_tokens: 2, completion_tokens: 3 });
});

test('F-406-08: deadline abort/timeout preserves attempted provider identity but never fabricates usage', async () => {
  const result = await withClockAndFetch({
    startMs: 6_000,
    fetchImpl: async () => {
      Date.now = () => 6_010;
      throw new Error(SFI_TRAJECTORY_DEADLINE_ERROR);
    },
    run: async () => runLlmTask(request(6_010)),
  });
  assert.equal(result.ok, false);
  assert.equal(result.result, '');
  assert.equal(result.telemetry.provider, 'openai');
  assert.equal(result.telemetry.source, 'PROVIDER_ATTEMPT');
  assert.equal(result.telemetry.usage, null);
  assert.ok(result.warnings.includes('trajectory_deadline_reached'));
});
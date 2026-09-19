import assert from 'node:assert/strict';
import test from 'node:test';
import { createReadPlaneCoalescer } from './readPlaneCache';

test('coalesces simultaneous reads and reuses warm process entries', async () => {
  let calls = 0;
  const coalescer = createReadPlaneCoalescer<[string], { value: string }>({
    namespace: 'test',
    ttlSeconds: 5,
    loader: async (key) => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { value: key };
    },
  });

  const burst = await Promise.all([
    coalescer.read('same'),
    coalescer.read('same'),
    coalescer.read('same'),
  ]);

  assert.equal(calls, 1);
  assert.equal(burst.filter((entry) => entry.cache.status === 'COALESCED').length, 2);
  assert.equal(burst[0].value.value, 'same');

  const warm = await coalescer.read('same');
  assert.equal(calls, 1);
  assert.equal(warm.cache.status, 'MEMORY_HIT');

  await coalescer.read('other');
  assert.equal(calls, 2);

  const diagnostics = coalescer.diagnostics();
  assert.equal(diagnostics.loader_calls, 2);
  assert.equal(diagnostics.coalesced_reads, 2);
  assert.equal(diagnostics.memory_hits, 1);

  coalescer.clear();
  await coalescer.read('same');
  assert.equal(calls, 3);
});

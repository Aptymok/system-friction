export type ReadPlaneCacheStatus = 'MEMORY_HIT' | 'COALESCED' | 'DATA_CACHE_OR_SOURCE';

export type ReadPlaneCacheMeta = {
  status: ReadPlaneCacheStatus;
  namespace: string;
  ttl_seconds: number;
};

type Entry<TResult> = {
  expiresAt: number;
  value: TResult;
};

export function createReadPlaneCoalescer<TArgs extends unknown[], TResult>(input: {
  namespace: string;
  ttlSeconds: number;
  loader: (...args: TArgs) => Promise<TResult>;
  maxEntries?: number;
}) {
  const ttlMs = Math.max(1, input.ttlSeconds) * 1000;
  const maxEntries = Math.max(4, input.maxEntries ?? 32);
  const memory = new Map<string, Entry<TResult>>();
  const inFlight = new Map<string, Promise<TResult>>();

  let memoryHits = 0;
  let coalescedReads = 0;
  let loaderCalls = 0;

  function key(args: TArgs) {
    return JSON.stringify(args);
  }

  function prune(now: number) {
    for (const [cacheKey, entry] of memory.entries()) {
      if (entry.expiresAt <= now) memory.delete(cacheKey);
    }
    while (memory.size > maxEntries) {
      const oldest = memory.keys().next().value as string | undefined;
      if (!oldest) break;
      memory.delete(oldest);
    }
  }

  async function read(...args: TArgs): Promise<{ value: TResult; cache: ReadPlaneCacheMeta }> {
    const now = Date.now();
    prune(now);
    const cacheKey = key(args);
    const cached = memory.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      memoryHits += 1;
      return {
        value: cached.value,
        cache: { status: 'MEMORY_HIT', namespace: input.namespace, ttl_seconds: input.ttlSeconds },
      };
    }

    const existing = inFlight.get(cacheKey);
    if (existing) {
      coalescedReads += 1;
      return {
        value: await existing,
        cache: { status: 'COALESCED', namespace: input.namespace, ttl_seconds: input.ttlSeconds },
      };
    }

    loaderCalls += 1;
    const promise = input.loader(...args)
      .then((value) => {
        memory.set(cacheKey, { expiresAt: Date.now() + ttlMs, value });
        prune(Date.now());
        return value;
      })
      .finally(() => {
        inFlight.delete(cacheKey);
      });

    inFlight.set(cacheKey, promise);
    return {
      value: await promise,
      cache: { status: 'DATA_CACHE_OR_SOURCE', namespace: input.namespace, ttl_seconds: input.ttlSeconds },
    };
  }

  function clear() {
    memory.clear();
    inFlight.clear();
  }

  function diagnostics() {
    return {
      namespace: input.namespace,
      ttl_seconds: input.ttlSeconds,
      memory_entries: memory.size,
      in_flight: inFlight.size,
      memory_hits: memoryHits,
      coalesced_reads: coalescedReads,
      loader_calls: loaderCalls,
    };
  }

  return { read, clear, diagnostics };
}

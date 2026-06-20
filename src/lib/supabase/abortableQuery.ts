type AbortablePromiseLike<T> = PromiseLike<T> & {
  abortSignal?: (signal: AbortSignal) => PromiseLike<T>;
};

export const DEFAULT_SUPABASE_READ_TIMEOUT_MS = Number(process.env.SUPABASE_READ_TIMEOUT_MS ?? 1800);

export async function executeAbortableQuery<T>(
  query: AbortablePromiseLike<T>,
  timeoutMs = DEFAULT_SUPABASE_READ_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const executable = typeof query.abortSignal === 'function'
      ? query.abortSignal(controller.signal)
      : query;
    return await executable;
  } finally {
    clearTimeout(timeout);
  }
}

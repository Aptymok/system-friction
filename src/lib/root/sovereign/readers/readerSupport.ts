import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { DEFAULT_SUPABASE_READ_TIMEOUT_MS, executeAbortableQuery } from '@/lib/supabase/abortableQuery';
import type { RootDataStatus, RootRow, RootSource } from '../rootSovereignState';

export function row(value: unknown): RootRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {};
}

export function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function numberValue(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function dateValue(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (parts.length) return [...new Set(parts)].join(' | ');
  }
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'unknown_source_error';
}

export async function bounded<T>(label: string, task: () => Promise<T>, timeoutMs = 3200): Promise<{ data: T | null; error: string | null }> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const data = await Promise.race([
      task(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs); }),
    ]);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: `${label}:${errorMessage(error)}` };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function selectRows(input: { table: string; select: string; limit?: number; order?: string; timeoutMs?: number }): Promise<{ rows: RootRow[]; error: string | null }> {
  try {
    const service = createServiceSupabaseClient();
    let query = service.from(input.table).select(input.select).limit(input.limit ?? 30);
    if (input.order) query = query.order(input.order, { ascending: false });
    const { data, error } = await executeAbortableQuery(query, input.timeoutMs ?? DEFAULT_SUPABASE_READ_TIMEOUT_MS);
    if (error) throw error;
    return { rows: (data ?? []) as unknown as RootRow[], error: null };
  } catch (error) {
    const message = errorMessage(error);
    const timedOut = /abort|timeout/i.test(message);
    return { rows: [], error: `${input.table}:${timedOut ? `${input.table}_timeout` : message}` };
  }
}

export function source<T>(data: T, label: string, errors: Array<string | null>, observedAt: string | null, empty = false): RootSource<T> {
  const error = errors.filter((item): item is string => Boolean(item)).join(' | ') || null;
  const dataClass: RootDataStatus = error ? 'degraded' : empty ? 'missing' : 'observed';
  return { data, source: label, dataClass, observedAt, error };
}

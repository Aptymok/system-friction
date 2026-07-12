import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
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

export async function bounded<T>(label: string, task: () => Promise<T>, timeoutMs = 5500): Promise<{ data: T | null; error: string | null }> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const data = await Promise.race([
      task(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs); }),
    ]);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: `${label}:${error instanceof Error ? error.message : 'failed'}` };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function selectRows(input: { table: string; select: string; limit?: number; order?: string }): Promise<{ rows: RootRow[]; error: string | null }> {
  const result = await bounded(input.table, async () => {
    const service = createServiceSupabaseClient();
    let query = service.from(input.table).select(input.select).limit(input.limit ?? 30);
    if (input.order) query = query.order(input.order, { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as RootRow[];
  });
  return { rows: result.data ?? [], error: result.error };
}

export function source<T>(data: T, label: string, errors: Array<string | null>, observedAt: string | null, empty = false): RootSource<T> {
  const error = errors.filter((item): item is string => Boolean(item)).join(' | ') || null;
  const dataClass: RootDataStatus = error ? 'degraded' : empty ? 'missing' : 'observed';
  return { data, source: label, dataClass, observedAt, error };
}

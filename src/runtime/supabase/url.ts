export function tryNormalizeSupabaseUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function normalizeSupabaseUrl(value: string) {
  const normalized = tryNormalizeSupabaseUrl(value);
  if (!normalized) throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.');
  return normalized;
}

import 'server-only';

import type { WorldSpectIngestMode } from '../../../packages/api-contracts/src';
import type { WorldSpectReadBundle } from './readBundle';

type BundleIngestMode = WorldSpectIngestMode | 'all';

export async function fetchWorldSpectReadBundle(
  request: Request,
  input: { days: number; ingestMode: BundleIngestMode; limit: number },
): Promise<WorldSpectReadBundle> {
  const url = new URL('/api/worldspect/read-bundle', request.url);
  url.searchParams.set('days', String(input.days));
  url.searchParams.set('ingest_mode', input.ingestMode);
  url.searchParams.set('limit', String(input.limit));

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    cache: 'force-cache',
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`worldspect_read_bundle_http_${response.status}`);
  }

  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('worldspect_read_bundle_invalid_payload');
  }

  return payload as WorldSpectReadBundle;
}

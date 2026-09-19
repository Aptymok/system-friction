import { NextResponse } from 'next/server';
import type { WorldSpectIngestMode } from '../../../../../packages/api-contracts/src';
import { loadWorldSpectReadBundle } from '@/lib/worldspect/readBundle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_CDN_CACHE = {
  'Vercel-CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
} as const;

function numberParam(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

function ingestModeParam(value: string | null): WorldSpectIngestMode | 'all' {
  if (
    value === 'daily_cron'
    || value === 'manual'
    || value === 'diagnostic'
    || value === 'fallback_runtime'
  ) {
    return value;
  }
  return 'all';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = numberParam(url.searchParams.get('days'), 90, 3650);
  const limit = numberParam(url.searchParams.get('limit'), 120, 120);
  const ingestMode = ingestModeParam(url.searchParams.get('ingest_mode'));

  try {
    const bundle = await loadWorldSpectReadBundle({ days, ingestMode, limit });
    return NextResponse.json(bundle, { headers: PUBLIC_CDN_CACHE });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      days,
      ingest_mode: ingestMode,
      sample_count: 0,
      observed_from: null,
      observed_to: null,
      read_plane: 'UNAVAILABLE',
      primary_diagnostic: error instanceof Error ? error.message : 'worldspect_read_bundle_failed',
      read_cache: {},
      health: {
        observed_ats: [],
        empty_snapshots: 0,
        active_sources: 0,
        total_sources: 0,
        source_coverage: 0,
        degraded_sources: [],
        latest_error: 'worldspect_read_bundle_failed',
        trend_quality: 'missing',
      },
      trend: {
        domains: [],
        extraction_counts: {
          observations_samples: 0,
          legacy_vector_samples: 0,
          persisted_source_samples: 0,
          empty_snapshots: 0,
        },
      },
      latest: null,
    }, { status: 503, headers: PUBLIC_CDN_CACHE });
  }
}

import { NextResponse } from 'next/server';
import type { WorldSpectIngestMode } from '../../../../../packages/api-contracts/src';
import { WORLDSPECT_DOMAINS } from '@/lib/worldspect/vector-contract';
import { fetchWorldSpectReadBundle } from '@/lib/worldspect/readBundleClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_CDN_CACHE = { 'Vercel-CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } as const;

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : fallback;
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
  const generatedAt = new Date().toISOString();
  const url = new URL(request.url);
  const days = numberParam(url.searchParams.get('days'), 90);
  const ingestMode = ingestModeParam(url.searchParams.get('ingest_mode'));
  const debug = url.searchParams.get('debug') === '1';

  try {
    const bundle = await fetchWorldSpectReadBundle(request, { days, ingestMode, limit: 120 });

    return NextResponse.json({
      ok: bundle.sample_count > 0,
      source: 'worldspect_trend',
      generated_at: generatedAt,
      days,
      sample_count: bundle.sample_count,
      observed_from: bundle.observed_from,
      observed_to: bundle.observed_to,
      trend_quality: bundle.health.trend_quality,
      read_plane: bundle.read_plane,
      primary_diagnostic: bundle.primary_diagnostic,
      read_cache: bundle.read_cache,
      domains: bundle.trend.domains,
      ...(debug ? { debug: bundle.trend.extraction_counts } : {}),
    }, {
      headers: {
        ...PUBLIC_CDN_CACHE,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: 'worldspect_trend',
      generated_at: generatedAt,
      days,
      sample_count: 0,
      observed_from: null,
      observed_to: null,
      trend_quality: 'missing',
      read_plane: 'UNAVAILABLE',
      primary_diagnostic: null,
      domains: WORLDSPECT_DOMAINS.map((domain) => ({
        domain,
        sample_count: 0,
        current_value: null,
        previous_value: null,
        delta: null,
        velocity_per_day: null,
        acceleration_per_day: null,
        direction: 'unknown',
        status: 'missing',
      })),
      error: error instanceof Error ? error.message : 'worldspect_trend_failed',
    }, { status: 200, headers: PUBLIC_CDN_CACHE });
  }
}

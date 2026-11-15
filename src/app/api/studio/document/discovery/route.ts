import { NextResponse } from 'next/server';
import { requireSfiMember, AccessDeniedError } from '@/lib/system/access/server';
import { runZeroKeyDiscoveryResearch } from '@/lib/agents/publicResearch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

/**
 * Metadata-only, opt-in external discovery for Studio documents and podcasts.
 * The original files, manuscript bodies, audio and local readings are never
 * submitted to the server or the news index. No DB writes or paid APIs.
 */
export async function POST(request: Request) {
  try {
    const { profile } = await requireSfiMember();
    const access = profile.module_access && typeof profile.module_access === 'object'
      ? profile.module_access as Record<string,unknown> : {};
    const role = String(profile.role ?? '').toLowerCase();
    if (access.studio !== true && role !== 'root' && role !== 'system') {
      return NextResponse.json({ok:false,error:'STUDIO_ACCESS_REQUIRED'}, {status:403});
    }
    const body = await request.json().catch(() => null) as Record<string,unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ok:false,error:'INVALID_REQUEST'}, {status:400});
    }
    const topic = typeof body.topic === 'string'
      ? body.topic.trim().replace(/[()"'\[\]{}]/g,' ').replace(/\s+/g,' ').slice(0,180)
      : '';
    if (topic.length < 3) {
      return NextResponse.json({ok:false,error:'TOPIC_REQUIRED'}, {status:400});
    }
    const discovery = await runZeroKeyDiscoveryResearch(topic);
    const sources = discovery.sources.slice(0,12).map(source => ({
      title:source.title,
      url:source.url,
      publisher:source.publisher,
      publishedAt:source.publishedAt,
      retrievedAt:source.retrievedAt,
      evidenceStatus:'INDEXED_SOURCE_CANDIDATE_NOT_INDEPENDENTLY_VERIFIED',
    }));
    return NextResponse.json({
      ok:true,
      scope:'PUBLIC_INDEX_METADATA_ONLY',
      topic,
      provider:discovery.provider,
      retrievedAt:new Date().toISOString(),
      sources,
      warnings:discovery.warnings,
      findingsValidated:false,
      articlesRead:false,
      audienceMeasured:false,
      noPaidProviders:true,
      serverPersistence:false,
      originalUploaded:false,
      note:'Indexed headlines identify potential references. Their claims and source bodies have not been evaluated or verified.',
    });
  } catch(error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ok:false,error:error.code}, {status:error.status});
    }
    return NextResponse.json({ok:false,error:'PUBLIC_DISCOVERY_UNAVAILABLE'}, {status:503});
  }
}

import { NextResponse } from 'next/server';
import { requireSfiMember, AccessDeniedError } from '@/lib/system/access/server';
import { runZeroKeyDiscoveryResearch } from '@/lib/agents/publicResearch';
import { resolveMihmMethod } from '@/lib/mihm/methodSelectionResolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

// Only editorial metadata is ever sent here, never uploaded audio or local acoustic frames.
// Explicit opt-in; zero API keys, no LLM and no database writes.
function bounded(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireSfiMember();
    const access = profile.module_access && typeof profile.module_access === 'object'
      ? profile.module_access as Record<string, unknown> : {};
    const role = String(profile.role ?? '').toLowerCase();
    if (access.studio !== true && role !== 'root' && role !== 'system') {
      return NextResponse.json({ ok:false, error:'STUDIO_ACCESS_REQUIRED' }, { status:403 });
    }
    const body = await request.json().catch(() => null) as Record<string,unknown> | null;
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      return NextResponse.json({ ok:false, error:'INVALID_REQUEST' }, { status:400 });
    }
    const title = bounded(body.title, 90);
    const artist = bounded(body.artist, 80);
    const sector = bounded(body.sector, 180);
    if (!title || !artist) {
      return NextResponse.json({ ok:false, error:'TITLE_AND_ARTIST_REQUIRED' }, { status:400 });
    }
    // A bounded external *discovery*, not a measurement of listeners or an extrapolation of reach.
    // GDELT is a news index: its absence is never absence of a cultural audience.
    const subject = sector || 'independent electronic music';
    const safeSubject = subject.replace(/[()"'\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
    const query = safeSubject.length < 3 ? 'independent music' : safeSubject;
    const discovery = await runZeroKeyDiscoveryResearch(query);
    // The existing canonical method selector can recommend an instrument, but it does not
    // execute FAD or MIHM measurements from acoustic data. Keep these states separate.
    const method = resolveMihmMethod({
      subject: 'ARTIFACT',
      temporalScope: 'POINT_IN_TIME',
      evidenceModalities: ['AUDIO'],
      subjectId: 'studio-private-audio-artifact',
      ownerId: user.id,
      worldContextRequested: discovery.sources.length > 0,
      requiresInterventionTracking: false,
    });
    const sources = discovery.sources.slice(0, 10).map(source => ({
      title:source.title,
      url:source.url,
      publisher:source.publisher,
      publishedAt:source.publishedAt,
      retrievedAt:source.retrievedAt,
      epistemicClass:'SOURCE_CLAIM_UNVERIFIED' as const,
    }));
    return NextResponse.json({
      ok:true,
      scope:'METADATA_ONLY_ZERO_KEY_DISCOVERY',
      originalUploaded:false,
      writesPerformed:false,
      noPaidProviders:true,
      title,artist,
      targetSector:{name:sector || null,epistemicClass:'USER_HYPOTHESIS'},
      marketEvidence:{
        provider:discovery.provider,
        status:sources.length?'INDEXED_SOURCES_FOUND':'NOT_OBSERVED',
        query, sources,
        warnings:discovery.warnings,
        audienceSize:null, listenerDemographics:null, engagementRate:null,
      },
      methodologicalRouting:{
        state:'SELECTED_NOT_EXECUTED',
        selectorVersion:method.version,
        status:method.status,
        primary:method.primary?.methodId ?? null,
        supporting:method.supporting.map(x=>x.methodId),
        blockers:method.blockers,
        FAD:'NOT_OBSERVED',MIHM:'NOT_OBSERVED',
      },
      publication:{status:'NOT_AUTHORIZED',scheduled:false},
      note:'Indexed news sources are candidate context, not evidence of audience affinity. No demographic inference or campaign optimization is claimed.',
    });
  } catch(error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ok:false,error:error.code}, {status:error.status});
    }
    return NextResponse.json({ok:false,error:'STUDIO_DISCOVERY_UNAVAILABLE',
      details:error instanceof Error?error.message:'Unknown error'}, {status:503});
  }
}

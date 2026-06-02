import { NextRequest, NextResponse } from 'next/server';
import { createScoreFrictionPrototype, evaluateScoreFrictionCase, evaluateScoreFrictionObservation, recordScoreFrictionAudioObservation } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

function fallbackAudioVector(file: { size: number; type: string }) {
  const sizeFactor = Math.max(0, Math.min(1, file.size / 12000000));
  const mimeSeed = file.type.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100;
  return {
    duration_sec: null,
    file_size_bytes: file.size,
    mime_type: file.type,
    spectral_density: Math.max(0.12, Math.min(1, sizeFactor * 0.72 + mimeSeed / 500)),
    percussive_load: Math.max(0.1, Math.min(1, sizeFactor * 0.55 + 0.21)),
    harmonic_stability: Math.max(0.1, Math.min(1, 0.72 - sizeFactor * 0.22 + mimeSeed / 1000)),
    dynamic_range: Math.max(0.1, Math.min(1, 0.35 + sizeFactor * 0.45)),
  };
}

async function analyzerVector(file: File, warnings: string[]): Promise<Record<string, unknown>> {
  const analyzerUrl = process.env.SCOREFRICTION_AUDIO_ANALYZER_URL;
  if (!analyzerUrl) {
    warnings.push('audio_analyzer_unavailable');
    return fallbackAudioVector({ size: file.size, type: file.type });
  }

  const form = new FormData();
  form.set('file', file);
  const response = await fetch(analyzerUrl, { method: 'POST', body: form }).catch(() => null);
  if (!response?.ok) {
    warnings.push('audio_analyzer_failed');
    return fallbackAudioVector({ size: file.size, type: file.type });
  }
  const json = await response.json().catch(() => null);
  const vector = json?.audio_vector ?? json?.data ?? json;
  return vector && typeof vector === 'object' ? vector as Record<string, unknown> : fallbackAudioVector({ size: file.size, type: file.type });
}

async function worldspectContext(request: NextRequest, warnings: string[]) {
  const url = new URL('/api/worldspect/real', request.url);
  const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
  if (!response?.ok) {
    warnings.push('worldspect_context_unavailable');
    return null;
  }
  return response.json().catch(() => null);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const warnings: string[] = [];
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'audio_file_required' }, { status: 400 });
    const caseId = String(form.get('case_id') ?? '');
    const sourceName = String(form.get('source_name') ?? 'manual_upload');
    const territory = String(form.get('territory') ?? 'MX');
    const title = String(form.get('title') ?? file.name);
    const artist = form.get('artist') ? String(form.get('artist')) : null;
    const acousticVector = await analyzerVector(file, warnings);
    const recorded = await recordScoreFrictionAudioObservation({
      case_id: caseId,
      source_name: sourceName,
      territory,
      title,
      artist,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
      acoustic_vector: acousticVector,
      warnings,
    });

    if (!recorded.ok) return NextResponse.json(recorded, { status: 400 });

    const culturalVector = caseId ? await evaluateScoreFrictionCase(caseId) : null;
    const ws = await worldspectContext(request, warnings);
    const proposal = caseId
      ? await createScoreFrictionPrototype({
        case_id: caseId,
        producer: 'Edwing',
        platform_targets: ['soundcloud', 'tiktok', 'youtube'],
        mihm_cultural_vector: culturalVector?.cultural_vector ?? {},
      }).catch((error) => ({ ok: false as const, error: error instanceof Error ? error.message : 'scorefriction_proposal_failed' }))
      : null;

    return NextResponse.json({
      ok: true,
      observation_id: recorded.data.observation.id,
      evidence_hash: recorded.data.evidence_hash,
      acoustic_vector: acousticVector,
      cultural_vector: culturalVector?.cultural_vector ?? null,
      worldspect_context: ws,
      proposal,
      warnings,
    });
  }

  const body = await request.json().catch(() => ({}));
  const audioMetadata = body.audioMetadata && typeof body.audioMetadata === 'object' ? body.audioMetadata : {};
  const result = await evaluateScoreFrictionObservation({
    raw_payload: {
      title: body.title ?? null,
      artist: body.artist ?? null,
      audioMetadata,
      comments: body.comments ?? [],
      lyrics: body.lyrics ?? null,
    },
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

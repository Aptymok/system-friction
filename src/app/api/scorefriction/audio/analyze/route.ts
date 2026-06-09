import { NextRequest, NextResponse } from 'next/server';
import { createScoreFrictionPrototype, evaluateScoreFrictionCase, evaluateScoreFrictionObservation, recordScoreFrictionAudioObservation } from '@/lib/scorefriction/store';
import { buildScoreFrictionAudioFallbackVector } from '@/lib/scorefriction/evidence-vector-mapper';

export const dynamic = 'force-dynamic';

function parseAudioMetadata(form: FormData) {
  const jsonValue = form.get('audio_metadata');
  if (typeof jsonValue === 'string' && jsonValue.trim()) {
    try {
      const parsed = JSON.parse(jsonValue);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // ignore malformed JSON and fall back to flat fields
    }
  }

  const metadata: Record<string, unknown> = {};
  for (const key of ['bpm', 'density', 'noise_floor', 'duration', 'duration_sec', 'tempo_bpm', 'rms_energy', 'spectral_density', 'percussive_load', 'harmonic_stability', 'dynamic_range']) {
    const value = form.get(key);
    if (value !== null && String(value).trim()) metadata[key] = value;
  }
  return metadata;
}

function buildFallback(file: File, sourceName: string, evidenceType: string, audioMetadata: Record<string, unknown>) {
  return buildScoreFrictionAudioFallbackVector({
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSizeBytes: file.size,
    sourceName,
    evidenceType,
    audioMetadata,
  });
}

async function analyzerVector(file: File, sourceName: string, evidenceType: string, audioMetadata: Record<string, unknown>, warnings: string[], state: { mode: string; message: string }) {
  const analyzerUrl = process.env.SCOREFRICTION_AUDIO_ANALYZER_URL;
  if (!analyzerUrl) {
    warnings.push('audio_analyzer_unavailable');
    const fallback = buildFallback(file, sourceName, evidenceType, audioMetadata);
    state.mode = fallback.analysis_mode;
    state.message = fallback.analysis_message;
    if (!fallback.has_declared_metadata) warnings.push('audio_metadata_missing');
    return fallback.acoustic_vector;
  }

  const form = new FormData();
  form.set('file', file);
  const response = await fetch(analyzerUrl, { method: 'POST', body: form }).catch(() => null);
  if (!response?.ok) {
    warnings.push('audio_analyzer_failed');
    const fallback = buildFallback(file, sourceName, evidenceType, audioMetadata);
    state.mode = fallback.analysis_mode;
    state.message = 'Audio analyzer failed. Using deterministic fallback from metadata.';
    if (!fallback.has_declared_metadata) warnings.push('audio_metadata_missing');
    return fallback.acoustic_vector;
  }

  const json = await response.json().catch(() => null);
  const vector = json?.audio_vector ?? json?.data ?? json;
  if (vector && typeof vector === 'object') {
    state.mode = 'analyzer';
    state.message = 'Audio analyzer connected. Acoustic vector recorded.';
    return vector as Record<string, unknown>;
  }

  const fallback = buildFallback(file, sourceName, evidenceType, audioMetadata);
  state.mode = fallback.analysis_mode;
  state.message = fallback.analysis_message;
  if (!fallback.has_declared_metadata) warnings.push('audio_metadata_missing');
  return fallback.acoustic_vector;
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
    const evidenceType = String(form.get('evidence_type') ?? 'audio_file_analysis');
    const audioMetadata = parseAudioMetadata(form);
    const responseState = { mode: 'fallback_heuristic', message: 'Audio analyzer no conectado. Se genero vector fallback con metadata declarada.' };
    const acousticVector = await analyzerVector(file, sourceName, evidenceType, audioMetadata, warnings, responseState);
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
      analysis_mode: responseState.mode,
      analysis_message: responseState.message,
      audio_analyzer_url_present: Boolean(process.env.SCOREFRICTION_AUDIO_ANALYZER_URL),
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

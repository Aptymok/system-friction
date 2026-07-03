import { NextRequest, NextResponse } from 'next/server';
import { buildScoreFrictionEvaluationContract } from '@/lib/scorefriction/evaluationContract';
import { createScoreFrictionPrototype, evaluateScoreFrictionCase, evaluateScoreFrictionObservation, recordScoreFrictionAudioObservation } from '@/lib/scorefriction/store';
import { buildScoreFrictionAudioFallbackVector } from '@/lib/scorefriction/evidence-vector-mapper';
import { runPythonScoreFrictionAnalysis } from '@/lib/scorefriction/python/pythonBridge';
import { buildScoreFrictionOperationalReading } from '@/lib/scorefriction/python/pythonMihmToOperational';

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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAudioSubstrateContract(input: { hasText: boolean; evidenceType: string }) {
  return buildScoreFrictionEvaluationContract(input.hasText
    ? {
      substrate: 'multimodal',
      subtype: input.evidenceType.toLowerCase().includes('lyrics') ? 'lyrics' : 'unknown',
      modalities: ['audio', 'text'],
      confidence: 0.86,
      notes: ['audio_route', 'audio_text_coupling_enabled', 'lyrics_is_text_subtype_when_declared'],
    }
    : {
      substrate: 'audio',
      confidence: 0.8,
      notes: ['audio_route', 'audio_file_analysis'],
    });
}

function buildPythonVectors(payload: Record<string, unknown>) {
  const mihm = record(payload.mihm_vector);
  return {
    acoustic_vector: {
      F_s: mihm.F_s ?? null,
      D_i: mihm.D_i ?? null,
      G_f: mihm.G_f ?? null,
      C_s: mihm.C_s ?? null,
      D_cog: mihm.D_cog ?? null,
      E_r: mihm.E_r ?? null,
      V_i: mihm.V_i ?? null,
      I_mc: mihm.I_mc ?? null,
      Phi: mihm.Phi ?? null,
      duration_sec: payload.duration_sec ?? null,
      ihg_raw: payload.ihg_raw ?? null,
      ihg_final: payload.ihg_final ?? null,
    },
    semantic_vector: {
      R_sem: mihm.R_sem ?? null,
      C_sem: mihm.C_sem ?? null,
    },
    mihm_cultural_vector: {
      ...mihm,
      ihg_raw: payload.ihg_raw ?? null,
      ihg_final: payload.ihg_final ?? null,
      nti_used: payload.nti_used ?? null,
      emission_valid: payload.emission_valid ?? payload.status === 'OK',
    },
  };
}

async function analyzerVector(file: File, sourceName: string, evidenceType: string, audioMetadata: Record<string, unknown>, warnings: string[], state: { mode: string; message: string; pythonPayload?: Record<string, unknown>; semanticVector?: Record<string, unknown>; mihmCulturalVector?: Record<string, unknown>; operationalReading?: Record<string, unknown> }, input: { text?: string | null; nti?: number | null; caseId?: string | null }) {
  const pythonResult = await runPythonScoreFrictionAnalysis({
    audioFile: file,
    text: input.text,
    nti: input.nti,
    caseId: input.caseId,
    evidenceType,
    metadata: audioMetadata,
  });

  if (pythonResult.ok) {
    const vectors = buildPythonVectors(pythonResult.data);
    state.mode = 'local_python';
    state.message = 'Audio analizado con nucleo Python MIHM.';
    state.pythonPayload = pythonResult.data;
    state.semanticVector = vectors.semantic_vector;
    state.mihmCulturalVector = vectors.mihm_cultural_vector;
    state.operationalReading = buildScoreFrictionOperationalReading({
      mihmVector: vectors.mihm_cultural_vector,
      ihgFinal: pythonResult.data.ihg_final,
      emissionValid: pythonResult.data.emission_valid ?? pythonResult.data.status === 'OK',
      ntiUsed: pythonResult.data.nti_used,
    }) as unknown as Record<string, unknown>;
    if (record(pythonResult.data.mihm_vector).R_sem === null || record(pythonResult.data.mihm_vector).C_sem === null) warnings.push('python_mihm_semantic_not_measured');
    return vectors.acoustic_vector;
  }

  warnings.push(`python_mihm_not_ready:${pythonResult.error}`);
  const analyzerUrl = process.env.SCOREFRICTION_AUDIO_ANALYZER_URL;
  if (!analyzerUrl) {
    warnings.push('audio_analyzer_not_ready');
    const fallback = buildFallback(file, sourceName, evidenceType, audioMetadata);
    state.mode = fallback.analysis_mode;
    state.message = 'Python MIHM no disponible; se uso vector minimo de emergencia.';
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
    state.message = 'Python MIHM no disponible; se uso vector minimo de emergencia.';
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
  state.message = 'Python MIHM no disponible; se uso vector minimo de emergencia.';
  if (!fallback.has_declared_metadata) warnings.push('audio_metadata_missing');
  return fallback.acoustic_vector;
}

async function worldspectContext(request: NextRequest, warnings: string[]) {
  const url = new URL('/api/worldspect/real', request.url);
  const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
  if (!response?.ok) {
    warnings.push('worldspect_context_not_ready');
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
    const text = String(form.get('text') ?? form.get('lyrics') ?? '').trim();
    const nti = numberOrNull(form.get('nti')) ?? 0.5;
    const audioMetadata = parseAudioMetadata(form);
    const substrateContract = buildAudioSubstrateContract({ hasText: Boolean(text), evidenceType });
    const responseState: { mode: string; message: string; pythonPayload?: Record<string, unknown>; semanticVector?: Record<string, unknown>; mihmCulturalVector?: Record<string, unknown>; operationalReading?: Record<string, unknown> } = { mode: 'fallback_heuristic', message: 'Audio analyzer no conectado. Se genero vector fallback con metadata declarada.' };
    const acousticVector = await analyzerVector(file, sourceName, evidenceType, audioMetadata, warnings, responseState, { text, nti, caseId });
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
      semantic_vector: responseState.semanticVector,
      mihm_cultural_vector: responseState.mihmCulturalVector,
      raw_payload: responseState.pythonPayload ? {
        type: 'audio_file_analysis',
        analyzer: 'python_mihm',
        title,
        artist,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        text_supplied: Boolean(text),
        substrate_contract: substrateContract,
        python_output: responseState.pythonPayload,
        operational_reading: responseState.operationalReading,
      } : { substrate_contract: substrateContract },
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
      substrate_contract: substrateContract,
      acoustic_vector: acousticVector,
      semantic_vector: responseState.semanticVector ?? null,
      mihm_vector: responseState.pythonPayload?.mihm_vector ?? null,
      mihm_cultural_vector: responseState.mihmCulturalVector ?? null,
      ihg_final: responseState.pythonPayload?.ihg_final ?? null,
      duration_sec: responseState.pythonPayload?.duration_sec ?? null,
      analyzer: responseState.mode === 'local_python' ? 'python_mihm' : 'fallback',
      mode: responseState.mode,
      operational_reading: responseState.operationalReading ?? null,
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
  const substrateContract = buildAudioSubstrateContract({ hasText: Boolean(body.lyrics), evidenceType: 'audio_metadata_analysis' });
  const result = await evaluateScoreFrictionObservation({
    raw_payload: {
      title: body.title ?? null,
      artist: body.artist ?? null,
      audioMetadata,
      comments: body.comments ?? [],
      lyrics: body.lyrics ?? null,
      substrate_contract: substrateContract,
    },
  });
  return NextResponse.json({ ...result, substrate_contract: substrateContract }, { status: result.ok ? 200 : 400 });
}

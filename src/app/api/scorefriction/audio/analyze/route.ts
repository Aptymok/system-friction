import { NextRequest, NextResponse } from 'next/server';
import { buildScoreFrictionEvaluationContract } from '@/lib/scorefriction/evaluationContract';
import { evaluateScoreFrictionCase, evaluateScoreFrictionObservation, recordScoreFrictionAudioObservation } from '@/lib/scorefriction/store';
import { runPythonScoreFrictionAnalysis } from '@/infrastructure/python/scorefrictionClient';
import { buildScoreFrictionOperationalReading } from '@/lib/scorefriction/python/pythonMihmToOperational';

export const dynamic = 'force-dynamic';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseAudioMetadata(form: FormData) {
  const jsonValue = form.get('audio_metadata');
  if (typeof jsonValue === 'string' && jsonValue.trim()) {
    try {
      const parsed = JSON.parse(jsonValue);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const metadata: Record<string, unknown> = {};
  for (const key of ['bpm', 'density', 'noise_floor', 'duration', 'duration_sec', 'tempo_bpm', 'rms_energy', 'spectral_density', 'percussive_load', 'harmonic_stability', 'dynamic_range']) {
    const value = form.get(key);
    if (value !== null && String(value).trim()) metadata[key] = value;
  }
  return metadata;
}

function buildAudioSubstrateContract(input: { hasText: boolean; evidenceType: string }) {
  return buildScoreFrictionEvaluationContract(input.hasText
    ? { substrate: 'multimodal', subtype: input.evidenceType.toLowerCase().includes('lyrics') ? 'lyrics' : 'unknown', modalities: ['audio', 'text'], confidence: null, notes: ['audio_route', 'measured_audio_text_coupling'] }
    : { substrate: 'audio', confidence: null, notes: ['audio_route', 'measured_audio_required'] });
}

function buildPythonVectors(payload: Record<string, unknown>) {
  const mihm = record(payload.mihm_vector);
  return {
    acoustic_vector: {
      F_s: mihm.F_s ?? null, D_i: mihm.D_i ?? null, G_f: mihm.G_f ?? null, C_s: mihm.C_s ?? null,
      D_cog: mihm.D_cog ?? null, E_r: mihm.E_r ?? null, V_i: mihm.V_i ?? null, I_mc: mihm.I_mc ?? null,
      Phi: mihm.Phi ?? null, duration_sec: payload.duration_sec ?? null, ihg_raw: payload.ihg_raw ?? null, ihg_final: payload.ihg_final ?? null,
    },
    semantic_vector: { R_sem: mihm.R_sem ?? null, C_sem: mihm.C_sem ?? null },
    mihm_cultural_vector: {
      ...mihm,
      ihg_raw: payload.ihg_raw ?? null,
      ihg_final: payload.ihg_final ?? null,
      nti_used: payload.nti_used ?? null,
      emission_valid: payload.emission_valid ?? payload.status === 'OK',
    },
  };
}

async function analyzeAudio(file: File, input: { text?: string | null; nti?: number | null; caseId: string; evidenceType: string; metadata: Record<string, unknown> }) {
  const python = await runPythonScoreFrictionAnalysis({
    audioFile: file,
    text: input.text,
    nti: input.nti,
    caseId: input.caseId,
    evidenceType: input.evidenceType,
    metadata: input.metadata,
  });
  if (python.ok) return { ok: true as const, mode: 'python_mihm', payload: python.data, ...buildPythonVectors(python.data) };

  const analyzerUrl = process.env.SCOREFRICTION_AUDIO_ANALYZER_URL;
  if (!analyzerUrl) return { ok: false as const, error: `audio_analyzer_unavailable:${python.error}` };
  const form = new FormData();
  form.set('file', file);
  const response = await fetch(analyzerUrl, { method: 'POST', body: form }).catch(() => null);
  if (!response?.ok) return { ok: false as const, error: `audio_analyzer_failed:${response?.status ?? 'network'}` };
  const json = record(await response.json().catch(() => null));
  const acoustic = record(json.audio_vector ?? json.data ?? json);
  if (!Object.keys(acoustic).length) return { ok: false as const, error: 'audio_analyzer_returned_no_vector' };
  return { ok: true as const, mode: 'external_analyzer', payload: json, acoustic_vector: acoustic, semantic_vector: undefined, mihm_cultural_vector: undefined };
}

async function worldspectContext(request: NextRequest) {
  const url = new URL('/api/worldspect/real', request.url);
  const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
  return response?.ok ? response.json().catch(() => null) : null;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'audio_file_required' }, { status: 400 });

    const caseId = requiredString(form, 'case_id');
    const sourceName = requiredString(form, 'source_name');
    const provenanceNotes = requiredString(form, 'provenance_notes');
    const reliabilityScore = numberOrNull(form.get('reliability_score'));
    const coverage = numberOrNull(form.get('source_coverage_contribution'));
    if (!caseId || !sourceName || !provenanceNotes || reliabilityScore === null || coverage === null) {
      return NextResponse.json({ ok: false, error: 'case_id_source_name_provenance_reliability_and_coverage_required' }, { status: 400 });
    }

    const territory = requiredString(form, 'territory');
    const title = requiredString(form, 'title') ?? file.name;
    const artist = requiredString(form, 'artist');
    const evidenceType = requiredString(form, 'evidence_type') ?? 'audio_file_analysis';
    const text = String(form.get('text') ?? form.get('lyrics') ?? '').trim();
    const nti = numberOrNull(form.get('nti'));
    const audioMetadata = parseAudioMetadata(form);
    if (audioMetadata === null) return NextResponse.json({ ok: false, error: 'audio_metadata_invalid_json' }, { status: 400 });
    const substrateContract = buildAudioSubstrateContract({ hasText: Boolean(text), evidenceType });
    const analysis = await analyzeAudio(file, { text, nti, caseId, evidenceType, metadata: audioMetadata });
    if (!analysis.ok) return NextResponse.json({ ok: false, error: analysis.error, degraded: true }, { status: 503 });

    const operationalReading = analysis.mihm_cultural_vector
      ? buildScoreFrictionOperationalReading({
          mihmVector: analysis.mihm_cultural_vector,
          ihgFinal: analysis.payload.ihg_final,
          emissionValid: analysis.payload.emission_valid ?? analysis.payload.status === 'OK',
          ntiUsed: analysis.payload.nti_used,
        }) as unknown as Record<string, unknown>
      : null;

    const recorded = await recordScoreFrictionAudioObservation({
      case_id: caseId,
      source_name: sourceName,
      territory,
      title,
      artist,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
      acoustic_vector: analysis.acoustic_vector,
      semantic_vector: analysis.semantic_vector,
      mihm_cultural_vector: analysis.mihm_cultural_vector,
      reliability_score: reliabilityScore,
      source_coverage_contribution: coverage,
      provenance_notes: provenanceNotes,
      raw_payload: {
        type: 'audio_file_analysis', analyzer: analysis.mode, title, artist, file_name: file.name,
        file_size_bytes: file.size, mime_type: file.type || 'application/octet-stream', text_supplied: Boolean(text),
        substrate_contract: substrateContract, analyzer_output: analysis.payload, operational_reading: operationalReading,
      },
    });
    if (!recorded.ok) return NextResponse.json(recorded, { status: 400 });

    const [culturalVector, ws] = await Promise.all([evaluateScoreFrictionCase(caseId), worldspectContext(request)]);
    return NextResponse.json({
      ok: true,
      observation_id: recorded.data.observation.id,
      evidence_hash: recorded.data.evidence_hash,
      substrate_contract: substrateContract,
      acoustic_vector: analysis.acoustic_vector,
      semantic_vector: analysis.semantic_vector ?? null,
      mihm_cultural_vector: analysis.mihm_cultural_vector ?? null,
      analyzer: analysis.mode,
      operational_reading: operationalReading,
      cultural_vector: culturalVector?.cultural_vector ?? null,
      worldspect_context: ws,
      proposal: null,
      proposal_reason: 'No automatic artifact proposal is generated from observation. Proposal requires an explicit production brief and governance path.',
    });
  }

  const body = record(await request.json().catch(() => ({})));
  const caseId = typeof body.case_id === 'string' ? body.case_id : null;
  const sourceName = typeof body.source_name === 'string' ? body.source_name : null;
  if (!caseId || !sourceName) return NextResponse.json({ ok: false, error: 'case_id_and_source_name_required' }, { status: 400 });
  const substrateContract = buildAudioSubstrateContract({ hasText: Boolean(body.lyrics), evidenceType: 'audio_metadata_analysis' });
  const result = await evaluateScoreFrictionObservation({ ...body, case_id: caseId, source_name: sourceName, raw_payload: { ...record(body.raw_payload), substrate_contract: substrateContract } });
  return NextResponse.json({ ...result, substrate_contract: substrateContract }, { status: result.ok ? 200 : 400 });
}

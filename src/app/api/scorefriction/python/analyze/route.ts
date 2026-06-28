import { NextRequest, NextResponse } from 'next/server';
import { buildScoreFrictionOperationalReading } from '@/lib/scorefriction/python/pythonMihmToOperational';
import {
  runMonteCarlo,
  runPythonScoreFrictionAnalysis,
  scoreFrictionPythonBridgeConfig,
  type PythonBridgeFile,
} from '@/lib/scorefriction/python/pythonBridge';
import { isScoreFrictionEvidenceType } from '@/lib/scorefriction/evidence-contract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return record(parsed);
  } catch {
    return {};
  }
}

function fileFrom(value: FormDataEntryValue | null): PythonBridgeFile | null {
  return value instanceof File ? value : null;
}

function buildVectors(payload: Record<string, unknown>) {
  const mihm = record(payload.mihm_vector);
  const semantic = {
    R_sem: mihm.R_sem ?? payload.R_sem ?? null,
    C_sem: mihm.C_sem ?? payload.C_sem ?? null,
    word_count: payload.word_count ?? null,
    conflict_ratio: payload.conflict_ratio ?? null,
  };
  const acoustic = {
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
  };
  const mihmCultural = {
    ...mihm,
    ihg_raw: payload.ihg_raw ?? null,
    ihg_final: payload.ihg_final ?? null,
    nti_used: payload.nti_used ?? null,
    emission_valid: payload.emission_valid ?? payload.status === 'OK',
  };
  return { acoustic, semantic, mihmCultural };
}

function responseFrom(payload: Record<string, unknown>, input: { caseId: string; sourceName: string; evidenceType: string; metadata: Record<string, unknown> }) {
  const mihm = record(payload.mihm_vector);
  const operational = buildScoreFrictionOperationalReading({
    mihmVector: mihm,
    ihgFinal: payload.ihg_final,
    emissionValid: payload.emission_valid ?? payload.status === 'OK',
    ntiUsed: payload.nti_used,
  });
  const vectors = buildVectors(payload);
  const warnings = [
    typeof payload.warning === 'string' ? payload.warning : null,
    payload.status === 'INSUFFICIENT_DATA' ? 'python_mihm_insufficient_core' : null,
    mihm.R_sem === null || mihm.C_sem === null ? 'python_mihm_semantic_not_measured' : null,
  ].filter((warning): warning is string => Boolean(warning));

  return {
    ok: true,
    analyzer: payload.analyzer ?? 'python_mihm',
    mode: payload.mode ?? 'local_python',
    status: payload.status ?? 'OK',
    case_id: input.caseId,
    evidence_type: input.evidenceType,
    mihm_vector: mihm,
    acoustic_vector: vectors.acoustic,
    semantic_vector: vectors.semantic,
    mihm_cultural_vector: vectors.mihmCultural,
    ihg_raw: payload.ihg_raw ?? null,
    ihg_final: payload.ihg_final ?? null,
    nti_used: payload.nti_used ?? null,
    duration_sec: payload.duration_sec ?? null,
    emission_valid: payload.emission_valid ?? payload.status === 'OK',
    operational_reading: operational,
    warnings,
    analysis_message: 'Audio analizado con nucleo Python MIHM.',
    ingest_payload: {
      case_id: input.caseId,
      source_name: input.sourceName,
      source_url: `python://scorefriction/${String(payload.file ?? input.evidenceType)}`,
      territory: 'MX',
      evidence_type: isScoreFrictionEvidenceType(input.evidenceType) ? input.evidenceType : 'audio_file_analysis',
      reliability_score: 0.72,
      provenance_notes: 'local python MIHM analysis',
      raw_payload: payload,
      normalized_payload: operational,
      vector_overrides: {
        acoustic_vector: vectors.acoustic,
        semantic_vector: vectors.semantic,
        mihm_cultural_vector: vectors.mihmCultural,
        platform_vector: { source_coverage: input.evidenceType === 'lyrics' ? 0.12 : 0.18, reliability_score: 0.72 },
      },
      acoustic_vector: vectors.acoustic,
      semantic_vector: vectors.semantic,
      mihm_cultural_vector: vectors.mihmCultural,
    },
    technical: {
      timeoutMs: scoreFrictionPythonBridgeConfig.timeoutMs,
      maxFileSizeBytes: scoreFrictionPythonBridgeConfig.maxFileSizeBytes,
      allowedAudioExtensions: scoreFrictionPythonBridgeConfig.audioExtensions,
      allowedTextExtensions: scoreFrictionPythonBridgeConfig.textExtensions,
    },
  };
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  const action = request.nextUrl.searchParams.get('action');

  if (action === 'montecarlo') {
    const result = await runMonteCarlo(await request.json().catch(() => ({})));
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const caseId = String(form.get('case_id') ?? 'PY-MIHM');
    const sourceName = String(form.get('source_name') ?? 'manual_upload');
    const evidenceType = String(form.get('evidence_type') ?? (form.get('audio') || form.get('file') ? 'audio_file_analysis' : 'lyrics'));
    const metadata = parseMetadata(form.get('metadata'));
    const textValue = String(form.get('text') ?? '').trim();
    const nti = numeric(form.get('nti')) ?? 0.5;

    const result = await runPythonScoreFrictionAnalysis({
      audioFile: fileFrom(form.get('audio')) ?? fileFrom(form.get('file')),
      textFile: fileFrom(form.get('lyrics_file')) ?? fileFrom(form.get('text_file')),
      text: textValue || null,
      metadata,
      nti,
      caseId,
      evidenceType,
    });

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error,
        message: result.error === 'python_not_available'
          ? 'Python MIHM no disponible; instala Python y dependencias de python/scorefriction/requirements.txt.'
          : 'No se pudo ejecutar el nucleo Python MIHM.',
        stderr: result.stderr,
      }, { status: 503 });
    }

    return NextResponse.json(responseFrom(result.data, { caseId, sourceName, evidenceType, metadata }));
  }

  const body = record(await request.json().catch(() => ({})));
  const caseId = String(body.case_id ?? 'PY-MIHM');
  const sourceName = String(body.source_name ?? 'manual_upload');
  const evidenceType = String(body.evidence_type ?? 'lyrics');
  const result = await runPythonScoreFrictionAnalysis({
    text: typeof body.text === 'string' ? body.text : null,
    metadata: record(body.metadata),
    nti: numeric(body.nti) ?? 0.5,
    caseId,
    evidenceType,
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.error,
      message: 'No se pudo ejecutar el nucleo Python MIHM.',
      stderr: result.stderr,
    }, { status: 503 });
  }

  return NextResponse.json(responseFrom(result.data, { caseId, sourceName, evidenceType, metadata: record(body.metadata) }));
}


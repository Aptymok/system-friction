import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildAudioIdempotencyKey } from './audioChecksum';
import { decodeStudioAudio } from './audioDecode';
import { isStudioAudioError, StudioAudioError } from './audioErrors';
import {
  createStudioAudioJob,
  findExistingStudioAudioAnalysis,
  markStudioObjectAnalyzing,
  markStudioObjectAnalysisFinished,
  payloadWithError,
  persistStudioAudioAnalysis,
  updateStudioAudioJob,
} from './audioPersistence';
import { loadStudioAudioBytes } from './audioStorage';
import {
  STUDIO_AUDIO_ENGINE_NAME,
  STUDIO_AUDIO_ENGINE_VERSION,
  type StudioAudioAnalysisOptions,
  type StudioAudioAnalysisResult,
  type StudioAudioProbe,
  type TimeRegion,
} from './audioTypes';
import { extractStudioAudioFeatures } from './features/featureRegistry';
import { detectOnsets } from './segmentation/onsetDetection';
import { detectSections } from './segmentation/sectionDetection';
import { detectSilenceRegions } from './segmentation/silenceDetection';
import { buildWaveformPeaks } from './segmentation/waveformPeaks';
import { probeMediaBytes, transcodeAudioToFloatWav, type MediaProbeResult } from '@/lib/studio/multimodal/mediaRuntime';

function maxDurationSeconds(options: StudioAudioAnalysisOptions) {
  const fromEnv = Number(process.env.STUDIO_AUDIO_MAX_DURATION_SECONDS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return options.maxDurationSeconds ?? 20 * 60;
}

function buildRegionsFromMarkers(markers: ReturnType<typeof detectSilenceRegions>): TimeRegion[] {
  return markers.map((marker) => ({
    id: marker.id,
    type: marker.type,
    label: marker.label,
    startSeconds: marker.startSeconds,
    endSeconds: marker.endSeconds,
    confidence: marker.confidence,
    payload: marker.payload,
  }));
}

function probeOnly(decoded: StudioAudioProbe): StudioAudioProbe {
  return {
    container: decoded.container,
    codec: decoded.codec,
    sampleRate: decoded.sampleRate,
    channels: decoded.channels,
    bitsPerSample: decoded.bitsPerSample,
    byteRate: decoded.byteRate,
    blockAlign: decoded.blockAlign,
    durationSeconds: decoded.durationSeconds,
    dataOffset: decoded.dataOffset,
    dataLength: decoded.dataLength,
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function extensionFromStored(stored: Awaited<ReturnType<typeof loadStudioAudioBytes>>) {
  const metadata = record(stored.object.metadata);
  const source = String(metadata.originalFileName ?? stored.upload.storage_path ?? stored.object.source_uri ?? 'audio.bin');
  const index = source.lastIndexOf('.');
  return index >= 0 ? source.slice(index + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
}

function isWaveBytes(bytes: Buffer) {
  return bytes.byteLength >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE';
}

export async function analyzeStudioAudioObject(objectId: string, options: StudioAudioAnalysisOptions = {}) {
  const supabase = createServiceSupabaseClient();
  const stored = await loadStudioAudioBytes(objectId, options, supabase);
  const idempotencyKey = buildAudioIdempotencyKey(objectId, stored.checksumSha256, STUDIO_AUDIO_ENGINE_VERSION);

  if (!options.force) {
    const existing = await findExistingStudioAudioAnalysis(supabase, objectId, idempotencyKey);
    if (existing) {
      return {
        ok: true,
        reused: true,
        status: 'COMPLETE',
        objectId,
        jobId: String(existing.id),
        idempotencyKey,
        checksumSha256: stored.checksumSha256,
      };
    }
  }

  const extension = extensionFromStored(stored);
  const requiresTranscode = !isWaveBytes(stored.bytes);
  let originalProbe: MediaProbeResult | null = null;
  const job = await createStudioAudioJob(supabase, objectId, idempotencyKey, {
    engine: STUDIO_AUDIO_ENGINE_NAME,
    engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
    checksumSha256: stored.checksumSha256,
    byteLength: stored.byteLength,
    requestedByUserId: options.requestedByUserId ?? null,
    sourceExtension: extension,
    transcodeRequired: requiresTranscode,
  });
  const jobId = String(job.id);
  const basePayload = {
    idempotencyKey,
    engine: STUDIO_AUDIO_ENGINE_NAME,
    engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
    checksumSha256: stored.checksumSha256,
    byteLength: stored.byteLength,
    requestedByUserId: options.requestedByUserId ?? null,
    sourceExtension: extension,
    transcodeRequired: requiresTranscode,
  };

  try {
    await markStudioObjectAnalyzing(supabase, objectId);
    await updateStudioAudioJob(supabase, jobId, 'running', null, { ...basePayload, startedAt: new Date().toISOString() });

    let analysisBytes = stored.bytes;
    const transcodeWarnings: string[] = [];
    if (requiresTranscode) {
      originalProbe = await probeMediaBytes(stored.bytes, extension);
      analysisBytes = await transcodeAudioToFloatWav(stored.bytes, extension);
      transcodeWarnings.push('SOURCE_TRANSCODED_TO_PCM_FLOAT_WAV', 'ORIGINAL_CONTAINER_PRESERVED_IN_STORAGE');
    }

    const decoded = decodeStudioAudio(analysisBytes, maxDurationSeconds(options));
    const extraction = extractStudioAudioFeatures(decoded);
    const waveform = buildWaveformPeaks(decoded);
    const silence = buildRegionsFromMarkers(detectSilenceRegions(extraction.energySegments));
    const onsets = buildRegionsFromMarkers(detectOnsets(extraction.energySegments));
    const sections = buildRegionsFromMarkers(detectSections(extraction.energySegments));
    const timeRegions = [...silence, ...onsets, ...sections];
    const warnings = [...transcodeWarnings, ...extraction.features.flatMap((feature) => feature.warnings)]
      .filter((warning, index, all) => all.indexOf(warning) === index);
    const hasMissingRequired = extraction.features.some((feature) => feature.status === 'MISSING');
    const probe = probeOnly(decoded);
    const result: StudioAudioAnalysisResult = {
      objectId,
      jobId,
      idempotencyKey,
      engine: STUDIO_AUDIO_ENGINE_NAME,
      engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
      checksumSha256: stored.checksumSha256,
      probe,
      features: extraction.features,
      waveform,
      energySegments: extraction.energySegments,
      timeRegions,
      warnings,
      status: hasMissingRequired ? 'DEGRADED' : 'COMPLETE',
    };

    await persistStudioAudioAnalysis(result, stored.object, probe, extraction.frequencyBands, supabase);
    await updateStudioAudioJob(supabase, jobId, 'complete', null, {
      ...basePayload,
      completedAt: new Date().toISOString(),
      semanticStatus: result.status,
      featureCount: result.features.length,
      waveformPeaks: result.waveform.length,
      timeRegions: result.timeRegions.length,
      warnings,
      sourceProbe: originalProbe,
      decodedByteLength: analysisBytes.byteLength,
    });
    await markStudioObjectAnalysisFinished(supabase, objectId, 'ready', {
      ...record(stored.object.metadata),
      studioAudioEngine: {
        idempotencyKey,
        jobId,
        engine: STUDIO_AUDIO_ENGINE_NAME,
        engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
        status: result.status,
        checksumSha256: stored.checksumSha256,
        sourceExtension: extension,
        transcoded: requiresTranscode,
        sourceProbe: originalProbe,
        completedAt: new Date().toISOString(),
      },
    });

    return {
      ok: true,
      reused: false,
      status: result.status,
      objectId,
      jobId,
      idempotencyKey,
      checksumSha256: stored.checksumSha256,
      probe: result.probe,
      sourceProbe: originalProbe,
      transcoded: requiresTranscode,
      featureCount: result.features.length,
      waveformPeaks: result.waveform.length,
      timeRegions: result.timeRegions.length,
      warnings,
    };
  } catch (error) {
    const reason = isStudioAudioError(error)
      ? error.code
      : error instanceof Error && error.name === 'StudioMultimodalError'
        ? (error as Error & { code?: string }).code ?? 'ANALYSIS_FAILED'
        : 'ANALYSIS_FAILED';
    const dbStatus = ['UNSUPPORTED_CODEC', 'INVALID_AUDIO_CONTAINER', 'DURATION_TOO_LONG', 'EXTRACTION_RUNTIME_UNAVAILABLE', 'FILE_TOO_LARGE'].includes(reason) ? 'blocked' : 'failed';
    await updateStudioAudioJob(supabase, jobId, dbStatus, reason, payloadWithError({ ...basePayload, sourceProbe: originalProbe }, error));
    await markStudioObjectAnalysisFinished(supabase, objectId, dbStatus === 'blocked' ? 'blocked' : 'failed', {
      ...record(stored.object.metadata),
      studioAudioEngine: {
        idempotencyKey,
        jobId,
        engine: STUDIO_AUDIO_ENGINE_NAME,
        engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
        status: dbStatus.toUpperCase(),
        reason,
        sourceExtension: extension,
        sourceProbe: originalProbe,
        failedAt: new Date().toISOString(),
      },
    });

    if (error instanceof StudioAudioError) throw error;
    throw new StudioAudioError('ANALYSIS_FAILED', error instanceof Error ? error.message : 'Studio audio analysis failed.', 500, {
      objectId,
      jobId,
      reason,
    });
  }
}

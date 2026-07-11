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

  const job = await createStudioAudioJob(supabase, objectId, idempotencyKey, {
    engine: STUDIO_AUDIO_ENGINE_NAME,
    engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
    checksumSha256: stored.checksumSha256,
    byteLength: stored.byteLength,
    requestedByUserId: options.requestedByUserId ?? null,
  });
  const jobId = String(job.id);
  const basePayload = {
    idempotencyKey,
    engine: STUDIO_AUDIO_ENGINE_NAME,
    engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
    checksumSha256: stored.checksumSha256,
    byteLength: stored.byteLength,
    requestedByUserId: options.requestedByUserId ?? null,
  };

  try {
    await markStudioObjectAnalyzing(supabase, objectId);
    await updateStudioAudioJob(supabase, jobId, 'running', null, { ...basePayload, startedAt: new Date().toISOString() });

    const decoded = decodeStudioAudio(stored.bytes, maxDurationSeconds(options));
    const extraction = extractStudioAudioFeatures(decoded);
    const waveform = buildWaveformPeaks(decoded);
    const silence = buildRegionsFromMarkers(detectSilenceRegions(extraction.energySegments));
    const onsets = buildRegionsFromMarkers(detectOnsets(extraction.energySegments));
    const sections = buildRegionsFromMarkers(detectSections(extraction.energySegments));
    const timeRegions = [...silence, ...onsets, ...sections];
    const warnings = extraction.features.flatMap((feature) => feature.warnings).filter((warning, index, all) => all.indexOf(warning) === index);
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
    });
    await markStudioObjectAnalysisFinished(supabase, objectId, 'ready', {
      ...(stored.object.metadata ?? {}),
      studioAudioEngine: {
        idempotencyKey,
        jobId,
        engine: STUDIO_AUDIO_ENGINE_NAME,
        engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
        status: result.status,
        checksumSha256: stored.checksumSha256,
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
      featureCount: result.features.length,
      waveformPeaks: result.waveform.length,
      timeRegions: result.timeRegions.length,
      warnings,
    };
  } catch (error) {
    const reason = isStudioAudioError(error) ? error.code : 'ANALYSIS_FAILED';
    const dbStatus = reason === 'UNSUPPORTED_CODEC' || reason === 'INVALID_AUDIO_CONTAINER' || reason === 'DURATION_TOO_LONG' ? 'blocked' : 'failed';
    await updateStudioAudioJob(supabase, jobId, dbStatus, reason, payloadWithError(basePayload, error));
    await markStudioObjectAnalysisFinished(supabase, objectId, dbStatus === 'blocked' ? 'blocked' : 'failed', {
      ...(stored.object.metadata ?? {}),
      studioAudioEngine: {
        idempotencyKey,
        jobId,
        engine: STUDIO_AUDIO_ENGINE_NAME,
        engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
        status: dbStatus.toUpperCase(),
        reason,
        failedAt: new Date().toISOString(),
      },
    });

    if (error instanceof StudioAudioError) throw error;
    throw new StudioAudioError('ANALYSIS_FAILED', error instanceof Error ? error.message : 'Studio audio analysis failed.', 500, {
      objectId,
      jobId,
    });
  }
}

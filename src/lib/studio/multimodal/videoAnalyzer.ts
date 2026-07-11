import 'server-only';

import { probeMediaBytes, sampleVideoGrayFrames } from './mediaRuntime';
import type { StudioGenericFeature } from './types';
import { StudioMultimodalError } from './types';

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function frameRate(value: string | undefined) {
  if (!value) return null;
  if (value.includes('/')) {
    const [left, right] = value.split('/').map(Number);
    if (Number.isFinite(left) && Number.isFinite(right) && right !== 0) return left / right;
  }
  return numeric(value);
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values: number[], average: number) {
  if (!values.length) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}

function analyzeFrameMotion(frames: Buffer[]) {
  const brightness = frames.map((frame) => {
    let sum = 0;
    for (const value of frame.values()) sum += value;
    return frame.length ? sum / frame.length / 255 : 0;
  });

  const differences: number[] = [];
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1];
    const current = frames[index];
    if (!previous || !current || previous.length !== current.length) continue;
    let total = 0;
    for (let offset = 0; offset < current.length; offset += 1) total += Math.abs((current[offset] ?? 0) - (previous[offset] ?? 0));
    differences.push(total / current.length / 255);
  }

  const motionIntensity = mean(differences);
  const deviation = standardDeviation(differences, motionIntensity);
  const threshold = Math.max(0.12, motionIntensity + deviation * 1.35);
  const transitions = differences.filter((value) => value >= threshold).length;

  return {
    brightness,
    differences,
    motionIntensity,
    transitionThreshold: threshold,
    transitions,
  };
}

export async function analyzeStudioVideo(bytes: Buffer, extension: string) {
  try {
    const probe = await probeMediaBytes(bytes, extension);
    const video = probe.streams?.find((stream) => stream.codec_type === 'video') ?? null;
    const audioStreams = probe.streams?.filter((stream) => stream.codec_type === 'audio') ?? [];
    if (!video) throw new StudioMultimodalError('VIDEO_ANALYSIS_FAILED', 'No video stream exists in the uploaded container.', 422);

    const durationSeconds = numeric(video.duration) ?? numeric(probe.format?.duration) ?? 0;
    const fps = frameRate(video.avg_frame_rate) ?? frameRate(video.r_frame_rate);
    const samples = await sampleVideoGrayFrames(bytes, extension, durationSeconds || 1, 24, 64, 36);
    const motion = analyzeFrameMotion(samples.frames);
    const shots = motion.transitions + (samples.frames.length ? 1 : 0);
    const transitionRhythm = durationSeconds > 0 ? motion.transitions / durationSeconds : null;
    const source = 'studio_video:ffprobe_ffmpeg_sample_v1';
    const warnings = [
      'MOTION_FROM_BOUNDED_GRAYSCALE_SAMPLES',
      'SCENE_COUNT_IS_THRESHOLD_BASED',
      'NO_VISUAL_MOTIF_MODEL',
    ];

    const features: StudioGenericFeature[] = [
      { key: 'video_duration_seconds', label: 'VIDEO DURATION', numericValue: durationSeconds || null, textValue: null, unit: 's', source, confidence: durationSeconds > 0 ? 1 : null, status: durationSeconds > 0 ? 'OBSERVED' : 'MISSING', explanation: 'Duration reported by ffprobe.', warnings: [] },
      { key: 'video_width_px', label: 'VIDEO WIDTH', numericValue: numeric(video.width), textValue: null, unit: 'px', source, confidence: video.width ? 1 : null, status: video.width ? 'OBSERVED' : 'MISSING', explanation: 'Decoded video stream width.', warnings: [] },
      { key: 'video_height_px', label: 'VIDEO HEIGHT', numericValue: numeric(video.height), textValue: null, unit: 'px', source, confidence: video.height ? 1 : null, status: video.height ? 'OBSERVED' : 'MISSING', explanation: 'Decoded video stream height.', warnings: [] },
      { key: 'video_frame_rate', label: 'FRAME RATE', numericValue: fps, textValue: null, unit: 'fps', source, confidence: fps === null ? null : 1, status: fps === null ? 'MISSING' : 'OBSERVED', explanation: 'Average or reported stream frame rate.', warnings: [] },
      { key: 'video_codec', label: 'VIDEO CODEC', numericValue: null, textValue: video.codec_name ?? null, unit: null, source, confidence: video.codec_name ? 1 : null, status: video.codec_name ? 'OBSERVED' : 'MISSING', explanation: 'Codec reported by ffprobe.', warnings: [] },
      { key: 'video_bitrate_bps', label: 'VIDEO BITRATE', numericValue: numeric(video.bit_rate) ?? numeric(probe.format?.bit_rate), textValue: null, unit: 'bps', source, confidence: video.bit_rate || probe.format?.bit_rate ? 1 : null, status: video.bit_rate || probe.format?.bit_rate ? 'OBSERVED' : 'MISSING', explanation: 'Stream or container bitrate reported by ffprobe.', warnings: [] },
      { key: 'video_audio_tracks', label: 'AUDIO TRACKS', numericValue: audioStreams.length, textValue: null, unit: 'tracks', source, confidence: 1, status: 'OBSERVED', explanation: 'Number of audio streams in the media container.', warnings: [] },
      { key: 'sampled_frame_count', label: 'SAMPLED FRAMES', numericValue: samples.frames.length, textValue: null, unit: 'frames', source, confidence: 1, status: 'OBSERVED', explanation: 'Number of bounded grayscale frames decoded for motion inspection.', warnings },
      { key: 'motion_intensity', label: 'MOTION INTENSITY', numericValue: motion.motionIntensity, textValue: null, unit: 'ratio', source, confidence: samples.frames.length > 1 ? 0.78 : null, status: samples.frames.length > 1 ? 'DERIVED' : 'MISSING', explanation: 'Mean absolute grayscale difference across sampled frames.', warnings },
      { key: 'transition_rhythm', label: 'TRANSITION RHYTHM', numericValue: transitionRhythm, textValue: null, unit: 'transitions/s', source, confidence: transitionRhythm === null ? null : 0.68, status: transitionRhythm === null ? 'MISSING' : 'DERIVED', explanation: 'Threshold transitions per second from bounded frame samples.', warnings },
      { key: 'estimated_shots', label: 'ESTIMATED SHOTS', numericValue: shots || null, textValue: null, unit: 'shots', source, confidence: shots ? 0.62 : null, status: shots ? 'DERIVED' : 'MISSING', explanation: 'Threshold-separated sampled frame groups; not an editorial scene annotation.', warnings },
      { key: 'mean_video_brightness', label: 'MEAN VIDEO BRIGHTNESS', numericValue: motion.brightness.length ? mean(motion.brightness) : null, textValue: null, unit: 'ratio', source, confidence: motion.brightness.length ? 0.8 : null, status: motion.brightness.length ? 'DERIVED' : 'MISSING', explanation: 'Mean luminance across sampled frames.', warnings },
    ];

    return {
      features,
      row: {
        shots: shots || null,
        scenes: shots || null,
        motion_intensity: samples.frames.length > 1 ? motion.motionIntensity : null,
        transition_rhythm: transitionRhythm,
        visual_motifs: [],
        payload: {
          engine: source,
          probe,
          sample: {
            width: samples.width,
            height: samples.height,
            frameCount: samples.frames.length,
            requestedSamples: samples.requestedSamples,
            sampleFps: samples.fps,
            transitionThreshold: motion.transitionThreshold,
            frameDifferences: motion.differences,
            frameBrightness: motion.brightness,
          },
          visualMotifsStatus: 'MISSING_NO_VISION_MODEL',
          warnings,
        },
      },
      warnings,
    };
  } catch (error) {
    if (error instanceof StudioMultimodalError) throw error;
    throw new StudioMultimodalError('VIDEO_ANALYSIS_FAILED', 'Video probing or sampled analysis failed.', 422, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

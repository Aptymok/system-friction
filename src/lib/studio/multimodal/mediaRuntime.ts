import 'server-only';

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { StudioMultimodalError } from './types';

type ProcessResult = { stdout: Buffer; stderr: string };

type ProbeStream = {
  index?: number;
  codec_name?: string;
  codec_type?: string;
  width?: number;
  height?: number;
  sample_rate?: string;
  channels?: number;
  duration?: string;
  bit_rate?: string;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  nb_frames?: string;
  pix_fmt?: string;
};

export type MediaProbeResult = {
  streams?: ProbeStream[];
  format?: {
    filename?: string;
    format_name?: string;
    format_long_name?: string;
    duration?: string;
    size?: string;
    bit_rate?: string;
    tags?: Record<string, string>;
  };
};

function timeoutMs() {
  const value = Number(process.env.STUDIO_MEDIA_PROCESS_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 240_000;
}

function binary(kind: 'ffmpeg' | 'ffprobe') {
  const value = kind === 'ffmpeg' ? ffmpegPath : ffprobeStatic?.path;
  if (!value) {
    throw new StudioMultimodalError('EXTRACTION_RUNTIME_UNAVAILABLE', `${kind} binary is not available in this deployment.`, 503, { kind });
  }
  return value;
}

function processLaunchFailure(error: Error, executable: string) {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === 'ENOENT' || code === 'EACCES') {
    return new StudioMultimodalError(
      'EXTRACTION_RUNTIME_UNAVAILABLE',
      'The deployed media binary is missing or not executable.',
      503,
      { code, binary: executable.includes('ffprobe') ? 'ffprobe' : 'ffmpeg' },
    );
  }
  return new StudioMultimodalError('TRANSCODE_FAILED', error.message, 500, { code: code ?? null });
}

async function runBinary(
  executable: string,
  args: string[],
  options: { stdin?: Buffer; maxStdoutBytes?: number; maxStderrBytes?: number } = {},
): Promise<ProcessResult> {
  const maxStdoutBytes = options.maxStdoutBytes ?? 32 * 1024 * 1024;
  const maxStderrBytes = options.maxStderrBytes ?? 2 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;

    const finishError = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill('SIGKILL');
      reject(error);
    };

    const timer = setTimeout(() => {
      finishError(new StudioMultimodalError('TRANSCODE_FAILED', 'Media process exceeded the configured execution timeout.', 504, {
        timeoutMs: timeoutMs(),
      }));
    }, timeoutMs());

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > maxStdoutBytes) {
        finishError(new StudioMultimodalError('TRANSCODE_FAILED', 'Media process produced excessive output.', 413, { maxStdoutBytes }));
        return;
      }
      stdout.push(Buffer.from(chunk));
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes <= maxStderrBytes) stderr.push(Buffer.from(chunk));
    });

    child.on('error', (error) => finishError(processLaunchFailure(error, executable)));
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const stderrText = Buffer.concat(stderr).toString('utf8').trim();
      if (code !== 0) {
        reject(new StudioMultimodalError('TRANSCODE_FAILED', stderrText || `Media process exited with code ${code}.`, 422, {
          code,
          args: args.filter((item) => !item.includes(tmpdir())),
        }));
        return;
      }
      resolve({ stdout: Buffer.concat(stdout), stderr: stderrText });
    });

    if (options.stdin) child.stdin.end(options.stdin);
    else child.stdin.end();
  });
}

async function withTemporaryMedia<T>(bytes: Buffer, extension: string, action: (inputPath: string, directory: string) => Promise<T>) {
  const directory = await mkdtemp(join(tmpdir(), 'sfi-studio-media-'));
  const safeExtension = extension.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'bin';
  const inputPath = join(directory, `input.${safeExtension}`);
  await writeFile(inputPath, bytes);
  try {
    return await action(inputPath, directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function probeMediaBytes(bytes: Buffer, extension: string): Promise<MediaProbeResult> {
  return withTemporaryMedia(bytes, extension, async (inputPath) => {
    const result = await runBinary(binary('ffprobe'), [
      '-v', 'error',
      '-show_format',
      '-show_streams',
      '-of', 'json',
      inputPath,
    ], { maxStdoutBytes: 4 * 1024 * 1024 });

    try {
      return JSON.parse(result.stdout.toString('utf8')) as MediaProbeResult;
    } catch (error) {
      throw new StudioMultimodalError('TRANSCODE_FAILED', 'ffprobe returned invalid JSON.', 422, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export async function transcodeAudioToFloatWav(bytes: Buffer, extension: string) {
  return withTemporaryMedia(bytes, extension, async (inputPath, directory) => {
    const outputPath = join(directory, 'decoded.wav');
    await runBinary(binary('ffmpeg'), [
      '-hide_banner',
      '-loglevel', 'error',
      '-nostdin',
      '-y',
      '-i', inputPath,
      '-map', '0:a:0',
      '-vn',
      '-ac', '2',
      '-ar', '48000',
      '-c:a', 'pcm_f32le',
      outputPath,
    ]);
    const wav = await readFile(outputPath);
    const maxOutputBytes = Number(process.env.STUDIO_AUDIO_DECODED_MAX_MB || 300) * 1024 * 1024;
    if (wav.byteLength > maxOutputBytes) {
      throw new StudioMultimodalError('FILE_TOO_LARGE', 'Decoded WAV exceeds the configured Studio limit.', 413, {
        byteLength: wav.byteLength,
        maxOutputBytes,
      });
    }
    return wav;
  });
}

export async function sampleVideoGrayFrames(
  bytes: Buffer,
  extension: string,
  durationSeconds: number,
  sampleCount = 24,
  width = 64,
  height = 36,
) {
  const boundedSamples = Math.max(2, Math.min(sampleCount, 60));
  const fps = Math.max(0.01, boundedSamples / Math.max(durationSeconds, 1));
  const frameBytes = width * height;

  return withTemporaryMedia(bytes, extension, async (inputPath) => {
    const result = await runBinary(binary('ffmpeg'), [
      '-hide_banner',
      '-loglevel', 'error',
      '-nostdin',
      '-i', inputPath,
      '-an',
      '-vf', `fps=${fps.toFixed(6)},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=gray`,
      '-frames:v', String(boundedSamples),
      '-f', 'rawvideo',
      'pipe:1',
    ], { maxStdoutBytes: frameBytes * boundedSamples + frameBytes });

    const frames: Buffer[] = [];
    for (let offset = 0; offset + frameBytes <= result.stdout.byteLength; offset += frameBytes) {
      frames.push(result.stdout.subarray(offset, offset + frameBytes));
    }
    return { frames, width, height, requestedSamples: boundedSamples, fps };
  });
}

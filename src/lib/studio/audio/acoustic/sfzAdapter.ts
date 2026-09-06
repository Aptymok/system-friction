import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import {
  SFI_SFZ_ADAPTER_ID,
  SFI_SFZ_ADAPTER_VERSION,
  assertAcousticPackageManifest,
  assertAudioPerformance,
  assertSafePackageRelativePath,
  sha256Bytes,
  type SfiAcousticInstrumentManifest,
  type SfiAudioPerformance,
  type SfiAudioRenderMetrics,
  type SfiPerformanceEvent,
} from './acousticPackageContract';
import { decodePcm24Wav, encodePcm24Wav, pcmMetrics, type SfiDecodedPcm24 } from './wavPcm';

export type SfiSfzRegion = {
  sample: string;
  lokey: number;
  hikey: number;
  lovel: number;
  hivel: number;
  pitchKeycenter: number;
  volumeDb: number;
};

export type SfiResolvedSfzEvent = {
  event: SfiPerformanceEvent;
  region: SfiSfzRegion;
};

export type SfiSfzRenderResult = {
  wav: Buffer;
  metrics: SfiAudioRenderMetrics;
  resolvedEvents: SfiResolvedSfzEvent[];
};

type OpcodeMap = Record<string, string>;

export const SFI_SFZ_SUPPORTED_OPCODES = ['sample', 'key', 'lokey', 'hikey', 'lovel', 'hivel', 'pitch_keycenter', 'volume'] as const;
const SUPPORTED_OPCODES = new Set<string>(SFI_SFZ_SUPPORTED_OPCODES);

function stripSfzComments(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function parseOpcodes(fragment: string): OpcodeMap {
  const opcodes: OpcodeMap = {};
  const regex = /([a-zA-Z0-9_]+)=("[^"]*"|'[^']*'|[^\s<]+)/g;
  for (const match of fragment.matchAll(regex)) {
    const key = match[1].toLowerCase();
    if (!SUPPORTED_OPCODES.has(key)) throw new Error(`SFI_AUDIO_SFZ_OPCODE_UNSUPPORTED:${key}`);
    const raw = match[2];
    opcodes[key] = raw.startsWith('"') || raw.startsWith("'") ? raw.slice(1, -1) : raw;
  }
  return opcodes;
}

function toMidi(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 127) throw new Error(`SFI_AUDIO_SFZ_MIDI_OPCODE_INVALID:${value}`);
  return numeric;
}

function toVelocity(value: string | undefined, fallback: number) {
  const numeric = toMidi(value, fallback);
  return numeric === 0 && fallback !== 0 ? 1 : numeric;
}

function toDb(value: string | undefined) {
  if (value === undefined) return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < -144 || numeric > 24) throw new Error(`SFI_AUDIO_SFZ_VOLUME_INVALID:${value}`);
  return numeric;
}

function regionFrom(opcodes: OpcodeMap): SfiSfzRegion {
  const sample = opcodes.sample;
  if (!sample) throw new Error('SFI_AUDIO_SFZ_REGION_SAMPLE_REQUIRED');
  assertSafePackageRelativePath(sample);
  const key = opcodes.key === undefined ? null : toMidi(opcodes.key, 60);
  const lokey = key ?? toMidi(opcodes.lokey, 0);
  const hikey = key ?? toMidi(opcodes.hikey, 127);
  const pitchKeycenter = toMidi(opcodes.pitch_keycenter, key ?? lokey);
  const lovel = toVelocity(opcodes.lovel, 1);
  const hivel = toVelocity(opcodes.hivel, 127);
  if (lokey > hikey || lovel > hivel) throw new Error('SFI_AUDIO_SFZ_REGION_RANGE_INVALID');
  return { sample, lokey, hikey, lovel, hivel, pitchKeycenter, volumeDb: toDb(opcodes.volume) };
}

export function parseSfz(text: string): SfiSfzRegion[] {
  const source = stripSfzComments(text);
  const header = /<(global|group|region)>/gi;
  const matches = [...source.matchAll(header)];
  if (matches.length === 0) throw new Error('SFI_AUDIO_SFZ_REGION_REQUIRED');

  let globalOpcodes: OpcodeMap = {};
  let groupOpcodes: OpcodeMap = {};
  const regions: SfiSfzRegion[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const kind = current[1].toLowerCase();
    const start = (current.index ?? 0) + current[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? source.length : source.length;
    const opcodes = parseOpcodes(source.slice(start, end));
    if (kind === 'global') {
      globalOpcodes = { ...globalOpcodes, ...opcodes };
      groupOpcodes = {};
    } else if (kind === 'group') {
      groupOpcodes = { ...opcodes };
    } else {
      regions.push(regionFrom({ ...globalOpcodes, ...groupOpcodes, ...opcodes }));
    }
  }
  if (regions.length === 0) throw new Error('SFI_AUDIO_SFZ_REGION_REQUIRED');
  return regions;
}

function safeResolve(root: string, relativePath: string) {
  assertSafePackageRelativePath(relativePath);
  const rootAbsolute = resolve(root);
  const absolute = resolve(rootAbsolute, relativePath);
  if (absolute !== rootAbsolute && !absolute.startsWith(`${rootAbsolute}${sep}`)) {
    throw new Error('SFI_AUDIO_PACKAGE_PATH_TRAVERSAL_FORBIDDEN');
  }
  return absolute;
}

async function readVerified(root: string, relativePath: string, expectedHash: string) {
  const absolute = safeResolve(root, relativePath);
  const bytes = await readFile(absolute);
  const actualHash = sha256Bytes(bytes);
  if (actualHash !== expectedHash) throw new Error(`SFI_AUDIO_PACKAGE_FILE_HASH_MISMATCH:${relativePath}`);
  return bytes;
}

export async function loadAndVerifyAcousticPackage(packageRoot: string) {
  const manifestPath = safeResolve(packageRoot, 'manifest.json');
  const manifestBytes = await readFile(manifestPath);
  const manifest = assertAcousticPackageManifest(JSON.parse(manifestBytes.toString('utf8')) as SfiAcousticInstrumentManifest);
  const mappingBytes = await readVerified(packageRoot, manifest.mapping.path, manifest.mapping.sha256);
  for (const sample of manifest.samples) await readVerified(packageRoot, sample.path, sample.sha256);
  if (manifest.roomIr) await readVerified(packageRoot, manifest.roomIr.path, manifest.roomIr.sha256);
  return {
    manifest,
    manifestPath,
    manifestHash: sha256Bytes(manifestBytes),
    mappingText: mappingBytes.toString('utf8'),
  };
}

export function resolveSfzEvents(regions: SfiSfzRegion[], performance: SfiAudioPerformance): SfiResolvedSfzEvent[] {
  return performance.events.map((event) => {
    const region = regions.find(
      (candidate) => event.note >= candidate.lokey && event.note <= candidate.hikey && event.velocity >= candidate.lovel && event.velocity <= candidate.hivel,
    );
    if (!region) throw new Error(`SFI_AUDIO_SFZ_NO_REGION_FOR_EVENT:${event.eventId}`);
    return { event, region };
  });
}

async function resolveSampleBank(packageRoot: string, manifest: SfiAcousticInstrumentManifest, resolvedEvents: SfiResolvedSfzEvent[]) {
  const byPath = new Map(manifest.samples.map((sample) => [sample.path, sample]));
  const decoded = new Map<string, SfiDecodedPcm24>();
  for (const { region } of resolvedEvents) {
    if (decoded.has(region.sample)) continue;
    const declared = byPath.get(region.sample);
    if (!declared) throw new Error(`SFI_AUDIO_SFZ_SAMPLE_NOT_DECLARED_IN_MANIFEST:${region.sample}`);
    const bytes = await readVerified(packageRoot, region.sample, declared.sha256);
    const wav = decodePcm24Wav(bytes);
    if (wav.channels !== declared.format.channels) throw new Error(`SFI_AUDIO_SAMPLE_CHANNEL_MISMATCH:${region.sample}`);
    decoded.set(region.sample, wav);
  }
  return decoded;
}

function dbToGain(db: number) {
  return 10 ** (db / 20);
}

function sampleLinear(channel: Float64Array, position: number) {
  const index = Math.floor(position);
  if (index < 0 || index >= channel.length) return 0;
  const next = Math.min(channel.length - 1, index + 1);
  const fraction = position - index;
  return channel[index] * (1 - fraction) + channel[next] * fraction;
}

function edgeEnvelope(frame: number, totalFrames: number, sampleRate: number) {
  const fadeFrames = Math.max(1, Math.round(sampleRate * 0.003));
  const attack = Math.min(1, frame / fadeFrames);
  const release = Math.min(1, (totalFrames - 1 - frame) / fadeFrames);
  return Math.max(0, Math.min(attack, release, 1));
}

export class SfiSfzAdapter {
  readonly id = SFI_SFZ_ADAPTER_ID;
  readonly version = SFI_SFZ_ADAPTER_VERSION;

  supports(manifest: SfiAcousticInstrumentManifest) {
    return manifest.contract === 'SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0'
      && manifest.instrument.engine === 'SFZ'
      && manifest.mapping.format === 'SFZ'
      && manifest.roomIr === null;
  }

  resolveEvents(mappingText: string, performance: SfiAudioPerformance) {
    return resolveSfzEvents(parseSfz(mappingText), performance);
  }

  async render(packageRoot: string, manifest: SfiAcousticInstrumentManifest, mappingText: string, performance: SfiAudioPerformance): Promise<SfiSfzRenderResult> {
    if (!this.supports(manifest)) {
      if (manifest.roomIr) throw new Error('SFI_AUDIO_SFZ_ROOM_IR_UNSUPPORTED_V1');
      throw new Error('SFI_AUDIO_SFZ_PACKAGE_UNSUPPORTED');
    }
    assertAudioPerformance(performance, manifest);
    for (const event of performance.events) {
      if (event.articulation && event.articulation !== 'sustain') {
        throw new Error(`SFI_AUDIO_SFZ_ARTICULATION_UNSUPPORTED_V1:${event.articulation}`);
      }
      if (event.roomSend !== 0) throw new Error('SFI_AUDIO_SFZ_ROOM_SEND_UNSUPPORTED_V1');
    }
    const resolvedEvents = this.resolveEvents(mappingText, performance);
    const sampleBank = await resolveSampleBank(packageRoot, manifest, resolvedEvents);
    const sampleRate = 48000 as const;
    const totalSeconds = Math.max(...performance.events.map((event) => event.startSeconds + event.microtimingSeconds + event.durationSeconds));
    const frameCount = Math.max(1, Math.ceil(totalSeconds * sampleRate));
    const outputChannels: 1 | 2 = Math.max(...[...sampleBank.values()].map((sample) => sample.channels)) as 1 | 2;
    const output = Array.from({ length: outputChannels }, () => new Float64Array(frameCount));

    for (const { event, region } of resolvedEvents) {
      const sample = sampleBank.get(region.sample);
      if (!sample) throw new Error(`SFI_AUDIO_SFZ_SAMPLE_RESOLUTION_FAILED:${region.sample}`);
      const eventFrames = Math.max(1, Math.round(event.durationSeconds * sampleRate));
      const startFrame = Math.max(0, Math.round((event.startSeconds + event.microtimingSeconds) * sampleRate));
      const baseSemitones = event.note - region.pitchKeycenter + event.controls.pitchBendCents / 100;
      const gain = (event.velocity / 127) * dbToGain(region.volumeDb + event.controls.gainDb);
      let sourcePosition = 0;
      for (let frame = 0; frame < eventFrames && startFrame + frame < frameCount; frame += 1) {
        if (sourcePosition >= sample.frames - 1) break;
        const envelope = edgeEnvelope(frame, eventFrames, sampleRate);
        for (let channel = 0; channel < outputChannels; channel += 1) {
          const sourceChannel = sample.samples[Math.min(channel, sample.channels - 1)];
          output[channel][startFrame + frame] += sampleLinear(sourceChannel, sourcePosition) * gain * envelope;
        }
        const vibratoCents = event.controls.vibratoDepthCents === 0
          ? 0
          : event.controls.vibratoDepthCents * Math.sin((2 * Math.PI * event.controls.vibratoHz * frame) / sampleRate);
        sourcePosition += 2 ** ((baseSemitones + vibratoCents / 100) / 12);
      }
    }

    // Deterministic hard limiter only prevents invalid PCM overflow. No mastering/FAD semantics are introduced here.
    for (const channel of output) {
      for (let frame = 0; frame < channel.length; frame += 1) channel[frame] = Math.max(-1, Math.min(1 - 1 / 8388608, channel[frame]));
    }

    const { peak, rms } = pcmMetrics(output);
    const wav = encodePcm24Wav(output, sampleRate);
    return {
      wav,
      resolvedEvents,
      metrics: {
        sampleRate,
        bitDepth: 24,
        channels: outputChannels,
        frameCount,
        durationSeconds: Number((frameCount / sampleRate).toFixed(9)),
        peak,
        rms,
        renderedEventCount: resolvedEvents.length,
      },
    };
  }
}

export function sfzPackageDirectory(manifestPath: string) {
  return dirname(manifestPath);
}

import 'server-only';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import {
  SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT,
  assertAcousticPackageManifest,
  computePackageHash,
  sha256Bytes,
  type SfiAcousticInstrumentManifest,
} from './acousticPackageContract';
import type { SfiProductionInstrumentRow } from './productionInstrumentResolver';

type RemoteRegion = { sample: string; lokey: number; hikey: number; pitchKeycenter: number; lovel: number; hivel: number };
type RequiredEvent = { note: number; velocity: number };
const MAX_ASSET_BYTES = 80 * 1024 * 1024;

function parseMidi(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 127 ? parsed : fallback;
}

function parseRemoteRegions(sfz: string): RemoteRegion[] {
  const regions: RemoteRegion[] = [];
  for (const chunk of sfz.replace(/\/\/.*$/gm, '').split(/(?=<region>)/gi)) {
    if (!chunk.trim().toLowerCase().startsWith('<region>')) continue;
    const opcodes: Record<string, string> = {};
    for (const match of chunk.matchAll(/([a-zA-Z0-9_]+)=([^\s<]+)/g)) opcodes[match[1].toLowerCase()] = match[2];
    if (!opcodes.sample) continue;
    const key = opcodes.key === undefined ? null : parseMidi(opcodes.key, 60);
    regions.push({
      sample: opcodes.sample.replaceAll('\\', '/'),
      lokey: key ?? parseMidi(opcodes.lokey, 0),
      hikey: key ?? parseMidi(opcodes.hikey, 127),
      pitchKeycenter: parseMidi(opcodes.pitch_keycenter, key ?? parseMidi(opcodes.lokey, 60)),
      lovel: parseMidi(opcodes.lovel, 1),
      hivel: parseMidi(opcodes.hivel, 127),
    });
  }
  if (!regions.length) throw new Error('SFI_AUDIO_REMOTE_SFZ_REGION_REQUIRED');
  return regions;
}

function rawGitHubDescriptor(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.hostname !== 'raw.githubusercontent.com') throw new Error('SFI_AUDIO_REMOTE_PACKAGE_HOST_FORBIDDEN');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length < 4 || !/^[0-9a-f]{40}$/i.test(parts[2] || '')) throw new Error('SFI_AUDIO_REMOTE_PACKAGE_IMMUTABLE_REF_REQUIRED');
  return { url, owner: parts[0], repo: parts[1], commit: parts[2], sourcePath: parts.slice(3).join('/') };
}

function encodedRawUrl(input: { owner: string; repo: string; commit: string; sourcePath: string }, relative: string) {
  const dir = input.sourcePath.split('/').slice(0, -1);
  const segments = [...dir, ...relative.replaceAll('\\', '/').split('/')];
  if (segments.some((segment) => segment === '..' || segment === '.' || !segment)) throw new Error('SFI_AUDIO_REMOTE_SAMPLE_PATH_INVALID');
  return `https://raw.githubusercontent.com/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/${input.commit}/${segments.map(encodeURIComponent).join('/')}`;
}

async function boundedFetch(raw: string) {
  const response = await fetch(raw, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60_000) });
  if (!response.ok || !response.body) throw new Error(`SFI_AUDIO_REMOTE_ASSET_FETCH_FAILED:${response.status}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > MAX_ASSET_BYTES) throw new Error('SFI_AUDIO_REMOTE_ASSET_TOO_LARGE');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_ASSET_BYTES) { await reader.cancel('sfi_audio_asset_limit'); throw new Error('SFI_AUDIO_REMOTE_ASSET_TOO_LARGE'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}

function runFfmpeg(args: string[]) {
  const executable = ffmpegPath;
  if (!executable) throw new Error('SFI_FFMPEG_UNAVAILABLE');
  return new Promise<void>((resolve, reject) => {
    const child = spawn(executable, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (value: Buffer | string) => { stderr += String(value); });
    child.on('error', reject);
    child.on('close', (code: number | null) => code === 0 ? resolve() : reject(new Error(`SFI_AUDIO_FFMPEG_CONVERSION_FAILED:${code}:${stderr.slice(-1200)}`)));
  });
}

function regionIdentity(region: RemoteRegion) {
  return `${region.sample}|${region.lokey}|${region.hikey}|${region.lovel}|${region.hivel}|${region.pitchKeycenter}`;
}

export async function materializeRemoteAcousticPackage(input: { instrument: SfiProductionInstrumentRow; requiredEvents: RequiredEvent[]; workspace: string }) {
  if (input.instrument.engine.toUpperCase() !== 'SFZ') throw new Error('SFI_AUDIO_PRODUCTION_ENGINE_MUST_BE_SFZ');
  const source = rawGitHubDescriptor(input.instrument.packageRef);
  if (input.instrument.packageHash !== `git:${source.commit}`) throw new Error('SFI_AUDIO_UPSTREAM_PACKAGE_HASH_MISMATCH');
  const sfzBytes = await boundedFetch(input.instrument.packageRef);
  const regions = parseRemoteRegions(sfzBytes.toString('utf8'));
  const requirements = [...new Map(input.requiredEvents.map((event) => [`${event.note}:${event.velocity}`, event])).values()]
    .sort((a, b) => a.note - b.note || a.velocity - b.velocity);
  if (!requirements.length) throw new Error('SFI_AUDIO_REQUIRED_EVENT_MISSING');

  const selectedByIdentity = new Map<string, RemoteRegion>();
  for (const event of requirements) {
    const region = regions.find((candidate) =>
      event.note >= candidate.lokey && event.note <= candidate.hikey &&
      event.velocity >= candidate.lovel && event.velocity <= candidate.hivel);
    if (!region) throw new Error(`SFI_AUDIO_REMOTE_REGION_MISSING:${event.note}:${event.velocity}`);
    selectedByIdentity.set(regionIdentity(region), region);
  }
  const selected = [...selectedByIdentity.values()];

  const root = path.join(input.workspace, 'canonical-packages', input.instrument.id);
  const samplesDir = path.join(root, 'samples');
  await fs.mkdir(samplesDir, { recursive: true });
  const sampleBySource = new Map<string, { path: string; sha256: `sha256:${string}` }>();

  for (const region of selected) {
    if (sampleBySource.has(region.sample)) continue;
    const sourceUrl = encodedRawUrl(source, region.sample);
    const sourceBytes = await boundedFetch(sourceUrl);
    const inputPath = path.join(root, `source-${sampleBySource.size}.bin`);
    const outputRel = `samples/sample-${String(sampleBySource.size).padStart(3, '0')}.wav`;
    const outputPath = path.join(root, outputRel);
    await fs.writeFile(inputPath, sourceBytes);
    await runFfmpeg(['-i', inputPath, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', outputPath]);
    await fs.rm(inputPath, { force: true });
    const wav = await fs.readFile(outputPath);
    sampleBySource.set(region.sample, { path: outputRel, sha256: sha256Bytes(wav) });
  }

  const mappingLines = selected.map((region) => {
    const sample = sampleBySource.get(region.sample)!;
    return `<region> sample=${sample.path} lokey=${region.lokey} hikey=${region.hikey} lovel=${region.lovel} hivel=${region.hivel} pitch_keycenter=${region.pitchKeycenter}`;
  });
  const mappingText = `${mappingLines.join('\n')}\n`;
  const mappingPath = path.join(root, 'instrument.sfz');
  await fs.writeFile(mappingPath, mappingText, 'utf8');
  const mappingHash = sha256Bytes(Buffer.from(mappingText, 'utf8'));
  const samples = [...sampleBySource.values()].map((sample) => ({
    path: sample.path,
    sha256: sample.sha256,
    format: { container: 'WAV' as const, sampleRate: 48000 as const, bitDepth: 24 as const, channels: 1 as const },
    rightsAssertionRef: input.instrument.rightsEvidenceRef,
  }));
  const packageHash = computePackageHash([{ path: 'instrument.sfz', sha256: mappingHash }, ...samples.map((sample) => ({ path: sample.path, sha256: sample.sha256 }))]);
  const manifest: SfiAcousticInstrumentManifest = {
    contract: SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT,
    packageId: `sfi.production.${input.instrument.id}`,
    packageVersion: `1.0.0+${source.commit.slice(0, 12)}`,
    packageHash,
    packageHashAlgorithm: 'sha256:path-sha256-v1',
    instrument: { instrumentRef: input.instrument.id, name: input.instrument.name, family: input.instrument.family, engine: 'SFZ', rangeLow: input.instrument.rangeLow, rangeHigh: input.instrument.rangeHigh },
    mapping: { format: 'SFZ', path: 'instrument.sfz', sha256: mappingHash, adapterMinimumVersion: '1.0.0' },
    samples,
    roomIr: null,
    rights: { status: input.instrument.rightsStatus as 'EXECUTION_ALLOWED' | 'DERIVATIVE_ALLOWED', assertionId: input.instrument.rightsEvidenceRef, evidenceRefs: [input.instrument.rightsEvidenceRef], publicAccessUsedAsRightsEvidence: false },
    lineage: { sourceReferenceId: null, parentPackageRef: input.instrument.packageRef, materializationRefs: [`upstream-git:${source.owner}/${source.repo}@${source.commit}`, `upstream-sfz:${sha256Bytes(sfzBytes)}`] },
  };
  assertAcousticPackageManifest(manifest);
  await fs.writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { packageRoot: root, manifest, sourceCommit: source.commit };
}

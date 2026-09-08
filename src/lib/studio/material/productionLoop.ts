import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { executeSfzAcousticRender } from '@/lib/studio/audio/acoustic/executeSfzRender';
import { materializeRemoteAcousticPackage } from '@/lib/studio/audio/acoustic/remotePackageMaterializer';
import { resolveProductionInstrument, getProductionInstrumentById, type SfiProductionInstrumentRow } from '@/lib/studio/audio/acoustic/productionInstrumentResolver';
import type { SfiAudioPerformance, SfiAudioRenderReceipt, SfiPerformanceEvent } from '@/lib/studio/audio/acoustic/acousticPackageContract';
import type { MaterialProductionMode, MaterialProductionReceipt } from './types';

function sha256File(filePath: string) { return `sha256:${createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`; }
function runFfmpeg(args: string[]) {
  if (!ffmpegPath) throw new Error('SFI_FFMPEG_UNAVAILABLE');
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = ''; child.stderr.on('data', (chunk) => { stderr += String(chunk); }); child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`SFI_FFMPEG_FAILED:${code}:${stderr.slice(-1500)}`)));
  });
}
async function mixFiles(inputs: Array<{ file: string; gainDb: number }>, outputPath: string) {
  const args: string[] = []; inputs.forEach((item) => args.push('-i', item.file));
  const filters = inputs.map((item, index) => `[${index}:a]volume=${item.gainDb.toFixed(3)}dB[a${index}]`).join(';');
  const labels = inputs.map((_, index) => `[a${index}]`).join('');
  args.push('-filter_complex', `${filters};${labels}amix=inputs=${inputs.length}:normalize=0,aresample=48000[mix]`, '-map', '[mix]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', outputPath);
  await runFfmpeg(args);
}
async function masterFile(inputPath: string, outputPath: string) { await runFfmpeg(['-i', inputPath, '-af', 'highpass=f=28,loudnorm=I=-12:LRA=8:TP=-1.0,alimiter=limit=0.891:attack=5:release=50', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', outputPath]); }
function probeDurationSeconds(inputPath: string) {
  if (!ffmpegPath) throw new Error('SFI_FFMPEG_UNAVAILABLE'); const sink = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const result = spawnSync(ffmpegPath, ['-hide_banner', '-i', inputPath, '-f', 'null', sink], { encoding: 'utf8' });
  const match = `${result.stderr || ''}`.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/); if (!match) throw new Error('SFI_AUDIO_DURATION_UNAVAILABLE');
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}
const NOTE_NAMES: Record<string, number> = { C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5, 'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11 };
function keyRootMidi(key: string) { const pitch = NOTE_NAMES[key.trim().toUpperCase().replace(/\s+(MAJOR|MINOR).*/, '')]; if (pitch === undefined) throw new Error(`SFI_AUDIO_KEY_UNSUPPORTED:${key}`); return 60 + pitch; }
function fit(note: number, instrument: SfiProductionInstrumentRow) { let result = note; while (result < instrument.rangeLow) result += 12; while (result > instrument.rangeHigh) result -= 12; if (result < instrument.rangeLow || result > instrument.rangeHigh) throw new Error(`SFI_AUDIO_NOTE_OUT_OF_RANGE:${instrument.id}:${note}`); return result; }
function perfEvent(id: string, startSeconds: number, durationSeconds: number, note: number, velocity: number, sourceRef: string): SfiPerformanceEvent {
  return { eventId: id, startSeconds, durationSeconds, note, velocity, articulation: null, microtimingSeconds: 0, controls: { gainDb: 0, pitchBendCents: 0, vibratoDepthCents: 0, vibratoHz: 0 }, roomSend: 0, provenance: { sourceRef, plannerRef: 'SFI-RANCHERO-POP-PLANNER-1.0' } };
}
function createPerformance(input: { instrument: SfiProductionInstrumentRow; role: 'harmony' | 'bass'; bpm: number; key: string; duration: number; sourceRef: string }) {
  const beat = 60 / input.bpm; const bar = beat * 4; const bars = Math.max(1, Math.ceil(input.duration / bar)); const tonic = keyRootMidi(input.key);
  const chords = [{ root: 0, intervals: [0,4,7] }, { root: 9, intervals: [0,3,7] }, { root: 5, intervals: [0,4,7] }, { root: 7, intervals: [0,4,7] }];
  const events: SfiPerformanceEvent[] = [];
  for (let b = 0; b < bars; b += 1) {
    const chord = chords[b % chords.length]; const root = tonic + chord.root;
    for (let i = 0; i < 4; i += 1) {
      const onset = b * bar + i * beat;
      if (input.role === 'harmony') chord.intervals.forEach((interval) => events.push(perfEvent(`h-${b}-${i}-${interval}`, onset, beat * 0.8, fit(root + interval, input.instrument), i === 0 ? 92 : 76, input.sourceRef)));
      else events.push(perfEvent(`b-${b}-${i}`, onset, beat * 0.72, fit(root - 36 + (i % 2 ? 7 : 0), input.instrument), i === 0 ? 108 : 86, input.sourceRef));
    }
  }
  return { contract: 'SFI-AUDIO-PERFORMANCE-1.0', performanceId: `sfi-${input.role}-${randomUUID()}`, performanceVersion: '1.0.0', instrumentRef: input.instrument.id, tempoBpm: input.bpm, timeSignature: [4, 4], events } satisfies SfiAudioPerformance;
}
async function renderPart(input: { instrument: SfiProductionInstrumentRow; performance: SfiAudioPerformance; role: string; workspace: string; authorizationRef: string }) {
  const packageMaterialization = await materializeRemoteAcousticPackage({ instrument: input.instrument, requiredNotes: input.performance.events.map((event) => event.note), workspace: input.workspace });
  const artifactPath = path.join(input.workspace, `${input.role}.wav`);
  const receipt = await executeSfzAcousticRender({ packageRoot: packageMaterialization.packageRoot, packageRef: input.instrument.packageRef, performance: input.performance, performanceRef: `performance:${input.performance.performanceId}`, rightsAssertions: { instrumentRightsStatus: input.instrument.rightsStatus as 'EXECUTION_ALLOWED' | 'DERIVATIVE_ALLOWED', materialRightsEligibility: 'ELIGIBLE', materialRightsEvidenceRefs: [input.instrument.rightsEvidenceRef], institutionalAuthorization: { authorizationRef: input.authorizationRef, authorityClass: 'EXECUTE_REVERSIBLE', authorized: true }, culturalReferenceUsedAsExecutableMaterial: false, publicAccessUsedAsExecutionRightsEvidence: false }, artifactPath, artifactRef: `ephemeral:${input.role}` });
  return { artifactPath, receipt };
}

export async function runMaterialProduction(input: { mode: MaterialProductionMode; sourcePath: string; sourceRef: string; outputDirectory: string; authorizationRef: string; bpm?: number; key?: string; culturalProfile?: string; instrumentIds?: { harmony?: string; bass?: string } }) {
  const startedAt = new Date().toISOString(); const runId = randomUUID(); const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `sfi-material-${runId}-`));
  try {
    fs.mkdirSync(input.outputDirectory, { recursive: true }); const sourceHash = sha256File(input.sourcePath);
    const outputs: MaterialProductionReceipt['outputs'] = []; const instruments: MaterialProductionReceipt['instruments'] = []; const renderReceipts: SfiAudioRenderReceipt[] = [];
    const lineage = [`source:${input.sourceRef}`, `run:${runId}`, `mode:${input.mode}`]; let finalPath = '';
    if (input.mode === 'MASTER_ADJUST') {
      finalPath = path.join(input.outputDirectory, `${runId}-adjusted-master.wav`); await masterFile(input.sourcePath, finalPath);
      outputs.push({ kind: 'master', ref: finalPath, sha256: sha256File(finalPath) }); lineage.push('MASTER_ADJUST:bounded_dsp', 'NO_ARRANGEMENT_CHANGE_WITHOUT_EXPLICIT_STEMS_OR_PERFORMANCE');
    } else {
      const profile = input.culturalProfile || 'ranchero_pop'; const bpm = input.bpm ?? 112; if (bpm < 60 || bpm > 200) throw new Error('SFI_AUDIO_BPM_OUT_OF_RANGE');
      const key = input.key || 'G'; const duration = probeDurationSeconds(input.sourcePath);
      const harmony = input.instrumentIds?.harmony ? await getProductionInstrumentById(input.instrumentIds.harmony) : await resolveProductionInstrument({ culturalProfile: profile, families: ['acoustic_guitar', 'guitar', 'vihuela'] });
      const bass = input.instrumentIds?.bass ? await getProductionInstrumentById(input.instrumentIds.bass) : await resolveProductionInstrument({ culturalProfile: profile, families: ['guitarron', 'upright_bass', 'bass'] });
      const harmonyPerformance = createPerformance({ instrument: harmony, role: 'harmony', bpm, key, duration, sourceRef: input.sourceRef }); const bassPerformance = createPerformance({ instrument: bass, role: 'bass', bpm, key, duration, sourceRef: input.sourceRef });
      const harmonyRender = await renderPart({ instrument: harmony, performance: harmonyPerformance, role: 'harmony', workspace, authorizationRef: input.authorizationRef }); const bassRender = await renderPart({ instrument: bass, performance: bassPerformance, role: 'bass', workspace, authorizationRef: input.authorizationRef });
      renderReceipts.push(harmonyRender.receipt, bassRender.receipt);
      for (const [instrument, render, role] of [[harmony, harmonyRender, 'harmony'], [bass, bassRender, 'bass']] as const) { instruments.push({ id: instrument.id, packageRef: instrument.packageRef, packageHash: instrument.packageHash, rightsStatus: instrument.rightsStatus }); outputs.push({ kind: 'stem', ref: role, sha256: render.receipt.output.sha256 }); lineage.push(`render:${role}:${render.receipt.runId}:${render.receipt.output.sha256}`); }
      const mixPath = path.join(workspace, 'mix.wav'); await mixFiles([{ file: input.sourcePath, gainDb: -1.5 }, { file: harmonyRender.artifactPath, gainDb: -7 }, { file: bassRender.artifactPath, gainDb: -5 }], mixPath); outputs.push({ kind: 'mix', ref: 'ephemeral:mix', sha256: sha256File(mixPath) });
      finalPath = path.join(input.outputDirectory, `${runId}-musicalized-master.wav`); await masterFile(mixPath, finalPath); outputs.push({ kind: 'master', ref: finalPath, sha256: sha256File(finalPath) }); lineage.push('MIX:authorized_source+canonical_real_sample_stems', 'MASTER:bounded_dsp');
    }
    const receipt: MaterialProductionReceipt = { contract: 'SFI-MATERIAL-AUDIO-RETURN-1.0', runId, mode: input.mode, source: { ref: input.sourceRef, sha256: sourceHash }, instruments, performanceHash: renderReceipts.length ? `sha256:${createHash('sha256').update(renderReceipts.map((receipt) => receipt.performanceHash).join('\n')).digest('hex')}` : 'sha256:none', adapter: { id: 'SFI-SFZ-RENDER-1.0', ffmpeg: ffmpegPath || 'MISSING' }, outputs, startedAt, finishedAt: new Date().toISOString(), cleanupState: 'FAIL', rightsAssertions: input.mode === 'VOICE_MUSICALIZE' ? ['SOURCE_PROCESSING_AUTHORIZED_BY_CALLER', 'CANONICAL_INSTRUMENT_BANK_ELIGIBLE', 'SFI_RENDER_RIGHTS_BOUNDARY_PASS'] : ['SOURCE_PROCESSING_AUTHORIZED_BY_CALLER'], lineage, returnState: 'RETURN_PASS' };
    return { receipt, finalPath, renderReceipts, workspace };
  } catch (error) {
    cleanupMaterialProductionWorkspace(workspace);
    throw error;
  }
}
export function cleanupMaterialProductionWorkspace(workspace: string) { try { fs.rmSync(workspace, { recursive: true, force: true }); return 'PASS' as const; } catch { return 'FAIL' as const; } }

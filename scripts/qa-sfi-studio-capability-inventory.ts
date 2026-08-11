import assert from 'node:assert/strict';

import { decodeStudioAudio } from '../src/lib/studio/audio/audioDecode';
import { extractStudioAudioFeatures } from '../src/lib/studio/audio/features/featureRegistry';
import { extractVoiceSemanticFeatures } from '../src/lib/studio/audio/features/voiceSemanticFeatures';
import {
  studioCapabilityInventory,
  studioCapabilityMatrix,
  summarizeStudioCapabilities,
  type StudioCapabilityInventoryEntry,
} from '../src/lib/studio/capabilities/studioCapabilityInventory';
import {
  resolvedStudioCapabilityEntries,
  resolvedStudioCapabilityMatrix,
} from '../src/lib/studio/capabilities/resolvedStudioCapabilities';

function writeAscii(buffer: Buffer, offset: number, value: string) {
  buffer.write(value, offset, value.length, 'ascii');
}

function createSineWav() {
  const sampleRate = 44100;
  const durationSeconds = 1;
  const channels = 2;
  const bitsPerSample = 16;
  const frameCount = sampleRate * durationSeconds;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataLength = frameCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataLength);

  writeAscii(buffer, 0, 'RIFF');
  buffer.writeUInt32LE(36 + dataLength, 4);
  writeAscii(buffer, 8, 'WAVE');
  writeAscii(buffer, 12, 'fmt ');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  writeAscii(buffer, 36, 'data');
  buffer.writeUInt32LE(dataLength, 40);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * frame) / sampleRate) * 0.45 * 32767);
    const offset = 44 + frame * blockAlign;
    buffer.writeInt16LE(sample, offset);
    buffer.writeInt16LE(sample, offset + 2);
  }

  return buffer;
}

function byId(id: string) {
  const entry = studioCapabilityInventory.find((item) => item.id === id);
  assert.ok(entry, `missing_inventory_entry:${id}`);
  return entry;
}
function resolvedById(id:string){
  const entry=resolvedStudioCapabilityEntries().find(item=>item.id===id);
  assert.ok(entry,`missing_resolved_inventory_entry:${id}`);
  return entry;
}

function assertInventoryEntry(entry: StudioCapabilityInventoryEntry) {
  assert.ok(entry.id.trim(), 'empty_capability_id');
  assert.ok(entry.label.trim(), `empty_label:${entry.id}`);
  assert.ok(entry.appliesTo.length, `missing_applies_to:${entry.id}`);
  assert.ok(entry.evidenceSources.length, `missing_evidence_sources:${entry.id}`);
  assert.ok(entry.requiredInput.length, `missing_required_input:${entry.id}`);
  assert.ok(entry.outputKeys.length, `missing_output_keys:${entry.id}`);
  if (entry.state === 'BLOCKED_BY_IMPLEMENTATION') {
    assert.equal(entry.absenceState, 'CAPABILITY_MISSING', `implementation_block_without_capability_missing:${entry.id}`);
    assert.ok(entry.requiredEngine, `missing_required_engine:${entry.id}`);
    assert.ok(entry.nextAction, `missing_next_action:${entry.id}`);
  }
  if (entry.absenceState === 'CAPABILITY_MISSING') {
    assert.ok(entry.requiredEngine || entry.nextAction, `capability_missing_without_resolution:${entry.id}`);
  }
}

async function main() {
  for (const entry of studioCapabilityInventory) assertInventoryEntry(entry);

  const requiredIds = [
    'audio.decode.wav','audio.decode.transcoded','audio.loudness.integrated_lufs','audio.loudness.short_term_momentary',
    'audio.loudness.lra','audio.dynamic.true_peak','audio.rhythm.beat_tempo_meter','audio.pitch.tracking','audio.pitch.chroma',
    'audio.pitch.key_estimation','audio.harmony.harmonic_change','audio.harmony.harmonic_stability','audio.harmony.tonal_ambiguity',
    'audio.spectrum.core','audio.spectrum.advanced','audio.structure.novelty_repetition','voice.semantic.audio','sfi.variable.d_cog',
    'sfi.variable.e_r','sfi.variable.v_i','sfi.variable.semantic','root.capability.matrix',
  ];
  for (const id of requiredIds) byId(id);

  for (const id of ['audio.loudness.integrated_lufs','audio.loudness.short_term_momentary','audio.loudness.lra','audio.dynamic.true_peak','audio.rhythm.beat_tempo_meter','audio.pitch.tracking','audio.pitch.chroma','audio.pitch.key_estimation','audio.harmony.harmonic_change','audio.harmony.harmonic_stability','audio.harmony.tonal_ambiguity']) {
    assert.equal(byId(id).state,'AVAILABLE',`baseline_capability_not_available:${id}`);
  }
  assert.equal(byId('sfi.variable.d_cog').state, 'CALIBRATION_REQUIRED');
  assert.equal(byId('sfi.variable.d_cog').absenceState, 'CALIBRATION_REQUIRED');
  assert.equal(byId('sfi.variable.e_r').absenceState, 'REQUIRES_FIELD_EVIDENCE');
  assert.equal(byId('sfi.variable.v_i').absenceState, 'REQUIRES_DECLARATION');
  assert.equal(byId('sfi.variable.semantic').absenceState, 'NOT_APPLICABLE');

  for (const id of ['audio.spectrum.advanced','audio.structure.novelty_repetition','voice.semantic.audio']) {
    const item=resolvedById(id);
    assert.equal(item.state,'AVAILABLE',`resolved_capability_still_blocked:${id}`);
    assert.equal(item.absenceState,null,`resolved_capability_still_absent:${id}`);
    assert.ok(item.implementedBy.length,`resolved_capability_missing_implementation:${id}`);
    assert.equal(item.calibration,'required',`new_capability_must_remain_calibration_pending:${id}`);
  }
  const resolvedMatrix=resolvedStudioCapabilityMatrix();
  for(const id of ['audio.spectrum.advanced','audio.structure.novelty_repetition','voice.semantic.audio']){
    assert.ok(!resolvedMatrix.summary.technicallySolvableBlocked.includes(id),`implemented_capability_still_blocks_readiness:${id}`);
  }

  const summary = summarizeStudioCapabilities(studioCapabilityInventory);
  for(const id of ['audio.loudness.integrated_lufs','audio.dynamic.true_peak','audio.rhythm.beat_tempo_meter','audio.pitch.tracking','audio.pitch.chroma','audio.pitch.key_estimation','audio.harmony.harmonic_change','audio.harmony.harmonic_stability','audio.harmony.tonal_ambiguity','sfi.variable.d_cog','root.capability.matrix']){
    assert.ok(!summary.technicallySolvableBlocked.includes(id),`unexpected_technical_blocker:${id}`);
  }

  const wav=createSineWav();
  const decoded = decodeStudioAudio(wav, 5);
  const extraction = extractStudioAudioFeatures(decoded);
  const featureByKey = new Map(extraction.features.map((feature) => [feature.key, feature]));

  for (const key of ['rms_dbfs','peak_dbfs','spectral_centroid_hz','dynamic_range_db','transient_density','mfcc','spectral_contrast','spectral_flatness','hpss','roughness','brightness','novelty_curve','self_similarity_matrix','repetition_score','formal_symmetry','climax_estimate']) {
    const feature = featureByKey.get(key);
    assert.ok(feature, `missing_real_audio_feature:${key}`);
    assert.notEqual(feature.status,'CAPABILITY_MISSING',`new_audio_feature_still_capability_missing:${key}`);
  }
  for (const key of ['lufs_integrated', 'true_peak_dbtp']) {
    const feature = featureByKey.get(key);
    assert.ok(feature, `missing_absent_audio_feature:${key}`);
    assert.notEqual(feature.status, 'CAPABILITY_MISSING', `wrong_available_audio_status:${key}`);
    assert.equal(typeof feature.value, 'number', `available_audio_feature_has_no_value:${key}`);
  }
  for (const key of ['rhythm_onset_count','tempo_global_bpm','tempo_candidates','beat_count','pulse_clarity','fundamental_frequency_hz','pitch_confidence','chroma_distribution','key_estimate','harmonic_stability','tonal_ambiguity','spectral_dissonance','loudness_range_lu','short_term_lufs_summary']) {
    const feature=featureByKey.get(key);assert.ok(feature,`missing_signal_dependent_audio_feature:${key}`);assert.notEqual(feature.status,'CAPABILITY_MISSING',`signal_capability_still_missing:${key}`);
  }

  const voice=await extractVoiceSemanticFeatures({decoded,sourceBytes:wav,sourceExtension:'wav',operatorText:'Prueba declarada de lenguaje para verificar el pipeline de voz sin inventar una transcripción automática.'});
  const voiceByKey=new Map(voice.map(feature=>[feature.key,feature]));
  for(const key of ['voice_activity','transcript','language','lyric_segments','semantic_embeddings']){
    const feature=voiceByKey.get(key);assert.ok(feature,`missing_voice_feature:${key}`);assert.notEqual(feature.status,'CAPABILITY_MISSING',`voice_capability_still_missing:${key}`);
  }
  assert.equal(voiceByKey.get('transcript')?.payload?.sourceKind,'OPERATOR_DECLARED_TEXT','declared_text_must_not_be_misrepresented_as_transcription');

  const matrix = studioCapabilityMatrix();
  assert.deepEqual(matrix.entries.map((entry) => entry.id),[...matrix.entries.map((entry) => entry.id)].sort(),'capability_matrix_not_deterministic');
  const serialized = JSON.stringify({ matrix:resolvedMatrix, featureStatuses: extraction.features.map((feature) => ({ key: feature.key, status: feature.status })) });
  assert.ok(!serialized.includes('[object Object]'), 'object_object_serialization_leak');

  console.log(JSON.stringify({
    ok: true,
    version: matrix.version,
    total: resolvedMatrix.summary.total,
    byState: resolvedMatrix.summary.byState,
    technicallySolvableBlocked: resolvedMatrix.summary.technicallySolvableBlocked,
    implementedNow:['audio.spectrum.advanced','audio.structure.novelty_repetition','voice.semantic.audio'],
    calibrationStillRequired:true,
  }, null, 2));
}

main().catch((error)=>{
  console.error(error);
  process.exitCode=1;
});
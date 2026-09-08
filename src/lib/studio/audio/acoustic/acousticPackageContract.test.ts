import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT,
  SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT,
  SFI_AUDIO_PERFORMANCE_CONTRACT,
  SFI_AUDIO_RENDER_RECEIPT_CONTRACT,
  assertRenderRightsBoundary,
  canonicalJson,
  type SfiAcousticInstrumentManifest,
} from './acousticPackageContract';
import { parseSfz } from './sfzAdapter';
import { decodePcm24Wav, encodePcm24Wav } from './wavPcm';

test('material execution contracts remain exact and separate', () => {
  assert.equal(SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT, 'SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0');
  assert.equal(SFI_AUDIO_PERFORMANCE_CONTRACT, 'SFI-AUDIO-PERFORMANCE-1.0');
  assert.equal(SFI_AUDIO_RENDER_RECEIPT_CONTRACT, 'SFI-AUDIO-RENDER-RECEIPT-1.0');
  assert.equal(SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT, 'SFI-AUDIO-EPHEMERAL-ASSET-1.0');
});

test('canonical JSON is stable by key order', () => assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}'));

test('SFZ parser renders only the explicitly supported subset and rejects fake support', () => {
  const regions = parseSfz('<global> volume=-3\n<region> sample=samples/a.wav lokey=60 hikey=61 pitch_keycenter=60');
  assert.equal(regions.length, 1); assert.equal(regions[0].sample, 'samples/a.wav'); assert.equal(regions[0].volumeDb, -3);
  assert.throws(() => parseSfz('<region> sample=samples/a.wav lokey=60 ampeg_release=0.2'), /SFI_AUDIO_SFZ_OPCODE_UNSUPPORTED:ampeg_release/);
});

test('PCM24 decoder accepts classic PCM and extensible only when subtype is PCM', () => {
  const classic = encodePcm24Wav([Float64Array.from([0, 0.25, -0.25])]);
  assert.equal(decodePcm24Wav(classic).frames, 3);
  const data = classic.subarray(44); const extensible = Buffer.alloc(68 + data.length);
  extensible.write('RIFF',0,'ascii'); extensible.writeUInt32LE(extensible.length-8,4); extensible.write('WAVE',8,'ascii'); extensible.write('fmt ',12,'ascii'); extensible.writeUInt32LE(40,16); extensible.writeUInt16LE(0xfffe,20); extensible.writeUInt16LE(1,22); extensible.writeUInt32LE(48000,24); extensible.writeUInt32LE(48000*3,28); extensible.writeUInt16LE(3,32); extensible.writeUInt16LE(24,34); extensible.writeUInt16LE(22,36); extensible.writeUInt16LE(24,38); extensible.writeUInt32LE(0x4,40);
  Buffer.from([0x01,0x00,0x00,0x00,0x00,0x00,0x10,0x00,0x80,0x00,0x00,0xaa,0x00,0x38,0x9b,0x71]).copy(extensible,44);
  extensible.write('data',60,'ascii'); extensible.writeUInt32LE(data.length,64); data.copy(extensible,68);
  assert.equal(decodePcm24Wav(extensible).frames,3); extensible[44]=0x03; assert.throws(()=>decodePcm24Wav(extensible),/SFI_AUDIO_WAV_PCM_REQUIRED/);
});

test('rights eligibility cannot substitute for institutional authorization', () => {
  const manifest: SfiAcousticInstrumentManifest = {
    contract:'SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0', packageId:'fixture', packageVersion:'1.0.0', packageHash:`sha256:${'1'.repeat(64)}` as `sha256:${string}`, packageHashAlgorithm:'sha256:path-sha256-v1',
    instrument:{instrumentRef:'instrument',name:'Fixture',family:'QA',engine:'SFZ',rangeLow:0,rangeHigh:127}, mapping:{format:'SFZ',path:'instrument.sfz',sha256:`sha256:${'2'.repeat(64)}` as `sha256:${string}`,adapterMinimumVersion:'1.0.0'},
    samples:[{path:'samples/a.wav',sha256:`sha256:${'3'.repeat(64)}` as `sha256:${string}`,format:{container:'WAV',sampleRate:48000,bitDepth:24,channels:1},rightsAssertionRef:'fixture:rights'}], roomIr:null,
    rights:{status:'EXECUTION_ALLOWED',assertionId:'fixture:rights',evidenceRefs:['fixture:evidence'],publicAccessUsedAsRightsEvidence:false}, lineage:{sourceReferenceId:null,parentPackageRef:null,materializationRefs:[]},
  };
  assert.throws(()=>assertRenderRightsBoundary(manifest,{instrumentRightsStatus:'EXECUTION_ALLOWED',materialRightsEligibility:'ELIGIBLE',materialRightsEvidenceRefs:['fixture:rights'],institutionalAuthorization:{authorizationRef:'',authorityClass:'EXECUTE_REVERSIBLE',authorized:true},culturalReferenceUsedAsExecutableMaterial:false,publicAccessUsedAsExecutionRightsEvidence:false}),/SFI_AUDIO_INSTITUTIONAL_EXECUTION_AUTHORIZATION_REQUIRED/);
});

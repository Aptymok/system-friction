const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveTs(request, parent, isMain, options) {
  if (request.startsWith('.') && parent?.filename) {
    const candidate = path.resolve(path.dirname(parent.filename), request);
    if (fs.existsSync(`${candidate}.ts`)) return `${candidate}.ts`;
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

function writeAscii(buffer, offset, value) {
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

function assertFiniteFeature(feature) {
  if (typeof feature.value === 'number' && !Number.isFinite(feature.value)) {
    throw new Error(`non_finite_feature:${feature.key}`);
  }
}

const { decodeStudioAudio } = require('../src/lib/studio/audio/audioDecode.ts');
const { extractStudioAudioFeatures } = require('../src/lib/studio/audio/features/featureRegistry.ts');
const { buildWaveformPeaks } = require('../src/lib/studio/audio/segmentation/waveformPeaks.ts');
const { detectSilenceRegions } = require('../src/lib/studio/audio/segmentation/silenceDetection.ts');

const decoded = decodeStudioAudio(createSineWav(), 5);
const extraction = extractStudioAudioFeatures(decoded);
const waveform = buildWaveformPeaks(decoded, 128);
const silence = detectSilenceRegions(extraction.energySegments);

if (decoded.sampleRate !== 44100) throw new Error('sample_rate_mismatch');
if (decoded.channels !== 2) throw new Error('channel_count_mismatch');
if (!extraction.features.some((feature) => feature.key === 'rms_dbfs' && typeof feature.value === 'number')) {
  throw new Error('rms_feature_missing');
}
if (!extraction.features.some((feature) => feature.key === 'lufs_integrated' && feature.status === 'MISSING')) {
  throw new Error('lufs_missing_contract_missing');
}
if (!waveform.length) throw new Error('waveform_missing');
extraction.features.forEach(assertFiniteFeature);

console.log(JSON.stringify({
  ok: true,
  sampleRate: decoded.sampleRate,
  channels: decoded.channels,
  featureCount: extraction.features.length,
  waveformPeaks: waveform.length,
  silenceRegions: silence.length,
}));

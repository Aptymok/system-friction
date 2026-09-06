import { createHash } from 'node:crypto';

export const SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT = 'SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0' as const;
export const SFI_AUDIO_PERFORMANCE_CONTRACT = 'SFI-AUDIO-PERFORMANCE-1.0' as const;
export const SFI_AUDIO_RENDER_RECEIPT_CONTRACT = 'SFI-AUDIO-RENDER-RECEIPT-1.0' as const;
export const SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT = 'SFI-AUDIO-EPHEMERAL-ASSET-1.0' as const;
export const SFI_SFZ_ADAPTER_ID = 'SFI-SFZ-ADAPTER' as const;
export const SFI_SFZ_ADAPTER_VERSION = '1.0.0' as const;

export type SfiSha256 = `sha256:${string}`;

export type SfiAcousticPackageFile = {
  path: string;
  sha256: SfiSha256;
};

export type SfiAcousticInstrumentManifest = {
  contract: typeof SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT;
  packageId: string;
  packageVersion: string;
  packageHash: SfiSha256;
  packageHashAlgorithm: 'sha256:path-sha256-v1';
  instrument: {
    instrumentRef: string;
    name: string;
    family: string;
    engine: 'SFZ';
    rangeLow: number;
    rangeHigh: number;
  };
  mapping: SfiAcousticPackageFile & {
    format: 'SFZ';
    adapterMinimumVersion: string;
  };
  samples: Array<
    SfiAcousticPackageFile & {
      format: {
        container: 'WAV';
        sampleRate: 48000;
        bitDepth: 24;
        channels: 1 | 2;
      };
      rightsAssertionRef: string;
    }
  >;
  roomIr: (SfiAcousticPackageFile & { format: { container: 'WAV'; sampleRate: 48000; bitDepth: 24 } }) | null;
  rights: {
    status: 'EXECUTION_ALLOWED' | 'DERIVATIVE_ALLOWED';
    assertionId: string;
    evidenceRefs: string[];
    publicAccessUsedAsRightsEvidence: false;
  };
  lineage: {
    sourceReferenceId: string | null;
    parentPackageRef: string | null;
    materializationRefs: string[];
  };
};

export type SfiPerformanceEvent = {
  eventId: string;
  startSeconds: number;
  durationSeconds: number;
  note: number;
  velocity: number;
  articulation: string | null;
  microtimingSeconds: number;
  controls: {
    gainDb: number;
    pitchBendCents: number;
    vibratoDepthCents: number;
    vibratoHz: number;
  };
  roomSend: number;
  provenance: {
    sourceRef: string;
    plannerRef: string | null;
  };
};

export type SfiAudioPerformance = {
  contract: typeof SFI_AUDIO_PERFORMANCE_CONTRACT;
  performanceId: string;
  performanceVersion: string;
  instrumentRef: string;
  tempoBpm: number;
  timeSignature: [number, number];
  events: SfiPerformanceEvent[];
};

export type SfiInstitutionalExecutionAuthorization = {
  authorizationRef: string;
  authorityClass: 'EXECUTE_REVERSIBLE' | 'EXECUTE_EXTERNAL';
  authorized: true;
};

export type SfiRenderRightsAssertion = {
  instrumentRightsStatus: 'EXECUTION_ALLOWED' | 'DERIVATIVE_ALLOWED';
  materialRightsEligibility: 'ELIGIBLE';
  materialRightsEvidenceRefs: string[];
  institutionalAuthorization: SfiInstitutionalExecutionAuthorization;
  culturalReferenceUsedAsExecutableMaterial: false;
  publicAccessUsedAsExecutionRightsEvidence: false;
};

export type SfiAudioRenderMetrics = {
  sampleRate: 48000;
  bitDepth: 24;
  channels: 1 | 2;
  frameCount: number;
  durationSeconds: number;
  peak: number;
  rms: number;
  renderedEventCount: number;
};

export type SfiAudioCleanupReceipt = {
  state: 'CLEANED' | 'FAILED';
  workspaceRefHash: SfiSha256;
  existedBeforeCleanup: boolean;
  existsAfterCleanup: boolean;
  cleanedAt: string;
  error: string | null;
};

export type SfiAudioRenderReceipt = {
  contract: typeof SFI_AUDIO_RENDER_RECEIPT_CONTRACT;
  runId: string;
  packageRef: string;
  packageHash: SfiSha256;
  packageVersion: string;
  manifestHash: SfiSha256;
  instrumentRef: string;
  mappingRef: string;
  mappingHash: SfiSha256;
  sampleRefs: Array<{ ref: string; sha256: SfiSha256 }>;
  performanceRef: string;
  performanceHash: SfiSha256;
  performanceVersion: string;
  adapter: {
    id: typeof SFI_SFZ_ADAPTER_ID;
    version: typeof SFI_SFZ_ADAPTER_VERSION;
  };
  output: {
    ref: string;
    sha256: SfiSha256;
    epistemicClass: 'GENERATED_RENDER';
  };
  renderParameters: {
    sampleRate: 48000;
    bitDepth: 24;
    resampler: 'LINEAR';
    overflowPolicy: 'HARD_CLIP_SAFETY_ONLY';
    supportedSfzOpcodes: string[];
  };
  metrics: SfiAudioRenderMetrics;
  rightsAssertions: SfiRenderRightsAssertion;
  lineage: {
    sourceReferenceId: string | null;
    parentPackageRef: string | null;
    packageMaterializationRefs: string[];
    performanceSourceRefs: string[];
  };
  startedAt: string;
  finishedAt: string;
  cleanup: SfiAudioCleanupReceipt;
};

function requireNonEmpty(value: string, code: string) {
  if (!value.trim()) throw new Error(code);
}

export function sha256Bytes(bytes: Uint8Array): SfiSha256 {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export function sha256Text(value: string): SfiSha256 {
  return sha256Bytes(Buffer.from(value, 'utf8'));
}

export function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null) return 'null';
  if (typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('SFI_AUDIO_CANONICAL_JSON_UNSUPPORTED_VALUE');
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

export function computePackageHash(files: SfiAcousticPackageFile[]): SfiSha256 {
  const canonical = [...files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((entry) => `${entry.path}:${entry.sha256}`)
    .join('\n');
  return sha256Text(canonical);
}

export function assertSafePackageRelativePath(value: string) {
  requireNonEmpty(value, 'SFI_AUDIO_PACKAGE_PATH_REQUIRED');
  if (value.startsWith('/') || value.startsWith('\\') || /^[a-zA-Z]:[\\/]/.test(value)) {
    throw new Error('SFI_AUDIO_PACKAGE_ABSOLUTE_PATH_FORBIDDEN');
  }
  const segments = value.replace(/\\/g, '/').split('/');
  if (segments.some((segment) => segment === '..' || segment === '' || segment === '.')) {
    throw new Error('SFI_AUDIO_PACKAGE_PATH_TRAVERSAL_FORBIDDEN');
  }
}

export function assertAcousticPackageManifest(manifest: SfiAcousticInstrumentManifest) {
  if (manifest.contract !== SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT) {
    throw new Error('SFI_AUDIO_PACKAGE_CONTRACT_INVALID');
  }
  requireNonEmpty(manifest.packageId, 'SFI_AUDIO_PACKAGE_ID_REQUIRED');
  requireNonEmpty(manifest.packageVersion, 'SFI_AUDIO_PACKAGE_VERSION_REQUIRED');
  if (manifest.instrument.engine !== 'SFZ' || manifest.mapping.format !== 'SFZ') {
    throw new Error('SFI_AUDIO_PACKAGE_CANONICAL_MAPPING_MUST_BE_SFZ');
  }
  if (manifest.instrument.rangeLow < 0 || manifest.instrument.rangeHigh > 127 || manifest.instrument.rangeLow > manifest.instrument.rangeHigh) {
    throw new Error('SFI_AUDIO_PACKAGE_RANGE_INVALID');
  }
  assertSafePackageRelativePath(manifest.mapping.path);
  if (manifest.samples.length === 0) throw new Error('SFI_AUDIO_PACKAGE_SAMPLE_REQUIRED');
  for (const sample of manifest.samples) {
    assertSafePackageRelativePath(sample.path);
    if (sample.format.container !== 'WAV' || sample.format.sampleRate !== 48000 || sample.format.bitDepth !== 24) {
      throw new Error('SFI_AUDIO_PACKAGE_SAMPLE_FORMAT_INVALID');
    }
    requireNonEmpty(sample.rightsAssertionRef, 'SFI_AUDIO_PACKAGE_SAMPLE_RIGHTS_ASSERTION_REQUIRED');
  }
  if (!['EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED'].includes(manifest.rights.status)) {
    throw new Error('SFI_AUDIO_PACKAGE_EXECUTION_RIGHTS_REQUIRED');
  }
  if (manifest.rights.publicAccessUsedAsRightsEvidence !== false) {
    throw new Error('SFI_AUDIO_PUBLIC_ACCESS_IS_NOT_RIGHTS_EVIDENCE');
  }
  const actualPackageHash = computePackageHash([
    { path: manifest.mapping.path, sha256: manifest.mapping.sha256 },
    ...manifest.samples.map((sample) => ({ path: sample.path, sha256: sample.sha256 })),
    ...(manifest.roomIr ? [{ path: manifest.roomIr.path, sha256: manifest.roomIr.sha256 }] : []),
  ]);
  if (actualPackageHash !== manifest.packageHash) throw new Error('SFI_AUDIO_PACKAGE_HASH_INVALID');
  return manifest;
}

export function assertAudioPerformance(performance: SfiAudioPerformance, manifest: SfiAcousticInstrumentManifest) {
  if (performance.contract !== SFI_AUDIO_PERFORMANCE_CONTRACT) throw new Error('SFI_AUDIO_PERFORMANCE_CONTRACT_INVALID');
  if (performance.instrumentRef !== manifest.instrument.instrumentRef) throw new Error('SFI_AUDIO_PERFORMANCE_INSTRUMENT_MISMATCH');
  if (!(performance.tempoBpm > 0)) throw new Error('SFI_AUDIO_PERFORMANCE_TEMPO_INVALID');
  if (performance.events.length === 0) throw new Error('SFI_AUDIO_PERFORMANCE_EVENT_REQUIRED');
  for (const event of performance.events) {
    requireNonEmpty(event.eventId, 'SFI_AUDIO_PERFORMANCE_EVENT_ID_REQUIRED');
    if (!(event.startSeconds >= 0) || !(event.durationSeconds > 0)) throw new Error('SFI_AUDIO_PERFORMANCE_TIME_INVALID');
    if (!Number.isInteger(event.note) || event.note < manifest.instrument.rangeLow || event.note > manifest.instrument.rangeHigh) {
      throw new Error('SFI_AUDIO_PERFORMANCE_NOTE_OUT_OF_RANGE');
    }
    if (!Number.isInteger(event.velocity) || event.velocity < 1 || event.velocity > 127) throw new Error('SFI_AUDIO_PERFORMANCE_VELOCITY_INVALID');
    if (Math.abs(event.microtimingSeconds) > 0.25) throw new Error('SFI_AUDIO_PERFORMANCE_MICROTIMING_INVALID');
    if (!Number.isFinite(event.controls.gainDb) || event.controls.gainDb < -144 || event.controls.gainDb > 24) throw new Error('SFI_AUDIO_PERFORMANCE_GAIN_INVALID');
    if (!Number.isFinite(event.controls.pitchBendCents) || Math.abs(event.controls.pitchBendCents) > 2400) throw new Error('SFI_AUDIO_PERFORMANCE_PITCH_BEND_INVALID');
    if (!Number.isFinite(event.controls.vibratoDepthCents) || event.controls.vibratoDepthCents < 0 || event.controls.vibratoDepthCents > 200) throw new Error('SFI_AUDIO_PERFORMANCE_VIBRATO_DEPTH_INVALID');
    if (!Number.isFinite(event.controls.vibratoHz) || event.controls.vibratoHz < 0 || event.controls.vibratoHz > 20) throw new Error('SFI_AUDIO_PERFORMANCE_VIBRATO_RATE_INVALID');
    if (event.controls.vibratoDepthCents > 0 && event.controls.vibratoHz === 0) throw new Error('SFI_AUDIO_PERFORMANCE_VIBRATO_RATE_REQUIRED');
    if (event.roomSend < 0 || event.roomSend > 1) throw new Error('SFI_AUDIO_PERFORMANCE_ROOM_SEND_INVALID');
    requireNonEmpty(event.provenance.sourceRef, 'SFI_AUDIO_PERFORMANCE_PROVENANCE_REQUIRED');
  }
  return performance;
}

export function assertRenderRightsBoundary(manifest: SfiAcousticInstrumentManifest, rights: SfiRenderRightsAssertion) {
  if (rights.materialRightsEligibility !== 'ELIGIBLE') throw new Error('SFI_AUDIO_MATERIAL_RIGHTS_NOT_ELIGIBLE');
  if (!['EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED'].includes(rights.instrumentRightsStatus)) {
    throw new Error('SFI_AUDIO_INSTRUMENT_EXECUTION_RIGHTS_REQUIRED');
  }
  if (rights.instrumentRightsStatus !== manifest.rights.status) throw new Error('SFI_AUDIO_PACKAGE_RIGHTS_ASSERTION_MISMATCH');
  if (!rights.institutionalAuthorization.authorized || !rights.institutionalAuthorization.authorizationRef.trim()) {
    throw new Error('SFI_AUDIO_INSTITUTIONAL_EXECUTION_AUTHORIZATION_REQUIRED');
  }
  if (rights.culturalReferenceUsedAsExecutableMaterial !== false) throw new Error('SFI_AUDIO_REFERENCE_BANK_EXECUTION_FORBIDDEN');
  if (rights.publicAccessUsedAsExecutionRightsEvidence !== false) throw new Error('SFI_AUDIO_PUBLIC_ACCESS_IS_NOT_EXECUTION_RIGHTS');
  return rights;
}

export function hashPerformance(performance: SfiAudioPerformance): SfiSha256 {
  return sha256Text(canonicalJson(performance));
}

export function assertRenderReceipt(receipt: SfiAudioRenderReceipt) {
  if (receipt.contract !== SFI_AUDIO_RENDER_RECEIPT_CONTRACT) throw new Error('SFI_AUDIO_RENDER_RECEIPT_CONTRACT_INVALID');
  for (const [value, code] of [
    [receipt.runId, 'SFI_AUDIO_RENDER_RUN_ID_REQUIRED'],
    [receipt.packageRef, 'SFI_AUDIO_RENDER_PACKAGE_REF_REQUIRED'],
    [receipt.instrumentRef, 'SFI_AUDIO_RENDER_INSTRUMENT_REF_REQUIRED'],
    [receipt.performanceRef, 'SFI_AUDIO_RENDER_PERFORMANCE_REF_REQUIRED'],
    [receipt.output.ref, 'SFI_AUDIO_RENDER_OUTPUT_REF_REQUIRED'],
    [receipt.rightsAssertions.institutionalAuthorization.authorizationRef, 'SFI_AUDIO_RENDER_AUTHORIZATION_REF_REQUIRED'],
  ] as const) requireNonEmpty(value, code);
  if (receipt.output.epistemicClass !== 'GENERATED_RENDER') throw new Error('SFI_AUDIO_RENDER_OUTPUT_EPISTEMIC_CLASS_INVALID');
  if (receipt.cleanup.state === 'CLEANED') {
    if (!receipt.cleanup.existedBeforeCleanup || receipt.cleanup.existsAfterCleanup || receipt.cleanup.error !== null) {
      throw new Error('SFI_AUDIO_EPHEMERAL_CLEANUP_NOT_PROVEN');
    }
  } else if (!receipt.cleanup.error && !receipt.cleanup.existsAfterCleanup) {
    throw new Error('SFI_AUDIO_EPHEMERAL_CLEANUP_FAILURE_EVIDENCE_REQUIRED');
  }
  if (receipt.metrics.renderedEventCount < 1 || receipt.metrics.frameCount < 1) throw new Error('SFI_AUDIO_RENDER_METRICS_INVALID');
  return receipt;
}

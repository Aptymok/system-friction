export type StudioCapabilityArea =
  | 'decoding'
  | 'loudness_dynamic'
  | 'rhythm_time'
  | 'pitch_harmony'
  | 'timbre_spectrum'
  | 'structure'
  | 'voice_semantics'
  | 'sfi_variable'
  | 'prediction'
  | 'simulation'
  | 'root_control';

export type StudioCapabilityState =
  | 'AVAILABLE'
  | 'PROXY'
  | 'BLOCKED_BY_IMPLEMENTATION'
  | 'BLOCKED_BY_INPUT'
  | 'CALIBRATION_REQUIRED'
  | 'REQUIRES_DECLARATION'
  | 'REQUIRES_FIELD_EVIDENCE'
  | 'NOT_APPLICABLE'
  | 'FAILED';

export type StudioAbsenceState =
  | 'NOT_APPLICABLE'
  | 'REQUIRES_DECLARATION'
  | 'REQUIRES_FIELD_EVIDENCE'
  | 'CAPABILITY_MISSING'
  | 'INSUFFICIENT_SIGNAL'
  | 'CALIBRATION_REQUIRED'
  | 'FAILED';

export type StudioCapabilityInventoryEntry = {
  id: string;
  label: string;
  area: StudioCapabilityArea;
  state: StudioCapabilityState;
  absenceState: StudioAbsenceState | null;
  productionSurface: 'studio' | 'root' | 'studio_root';
  appliesTo: string[];
  implementedBy: string[];
  evidenceSources: string[];
  requiredInput: string[];
  requiredEngine: string | null;
  calibration: 'not_required' | 'required' | 'available' | 'missing_reference';
  outputKeys: string[];
  limitations: string[];
  nextAction: string | null;
};

export type StudioCapabilityReadModel = {
  capability: string;
  label: string;
  area: StudioCapabilityArea;
  engine: string | null;
  implementationVersion: string;
  status: StudioCapabilityState;
  lastExecution: null;
  lastCalibration: 'not_required' | 'required' | 'available' | 'missing_reference';
  confidence: number | null;
  dependencies: string[];
  requiredInput: string[];
  outputKeys: string[];
  affectedRoutes: string[];
  limitations: string[];
  nextAction: string | null;
  trace: null;
};

function capability(input: StudioCapabilityInventoryEntry): StudioCapabilityInventoryEntry {
  return input;
}

const audioFeatureEngine = 'src/lib/studio/audio/features/featureRegistry.ts';
const wavDecoder = 'src/lib/studio/audio/audioDecode.ts';

export const STUDIO_CAPABILITY_INVENTORY_VERSION = '2026-08-02.capability-inventory.v3';

export const studioCapabilityInventory: StudioCapabilityInventoryEntry[] = [
  capability({
    id: 'audio.decode.wav',
    label: 'WAV decoding and PCM extraction',
    area: 'decoding',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio',
    appliesTo: ['audio/wav', 'audio/x-wav'],
    implementedBy: [wavDecoder, 'src/lib/studio/audio/audioProbe.ts'],
    evidenceSources: ['studio_uploads', 'studio_audio_features', 'studio_analysis_jobs'],
    requiredInput: ['stored audio object', 'WAV RIFF container'],
    requiredEngine: null,
    calibration: 'not_required',
    outputKeys: ['duration_seconds', 'sample_rate_hz', 'channel_count', 'bit_depth'],
    limitations: ['WAV container only in native decoder path'],
    nextAction: null,
  }),
  capability({
    id: 'audio.decode.transcoded',
    label: 'MP3/FLAC/AAC/M4A decoding through ffmpeg transcode',
    area: 'decoding',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio',
    appliesTo: ['audio/mpeg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a'],
    implementedBy: ['src/lib/studio/audio/analyzeStudioAudioObject.ts', 'ffmpeg-static', 'ffprobe-static'],
    evidenceSources: ['studio_uploads', 'studio_analysis_jobs'],
    requiredInput: ['stored audio object', 'ffmpeg-supported source container'],
    requiredEngine: null,
    calibration: 'not_required',
    outputKeys: ['SOURCE_TRANSCODED_TO_PCM_FLOAT_WAV', 'ORIGINAL_CONTAINER_PRESERVED_IN_STORAGE'],
    limitations: ['Source file is preserved; analysis uses internal PCM float WAV transcode'],
    nextAction: null,
  }),
  capability({
    id: 'audio.integrity.normalization',
    label: 'Audio integrity validation and internal normalization',
    area: 'decoding',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio',
    appliesTo: ['audio'],
    implementedBy: [wavDecoder, 'src/lib/studio/audio/audioProbe.ts', 'src/lib/studio/audio/audioStorage.ts'],
    evidenceSources: ['studio_objects', 'studio_uploads'],
    requiredInput: ['stored audio bytes'],
    requiredEngine: null,
    calibration: 'not_required',
    outputKeys: ['checksumSha256', 'frameCount', 'durationSeconds'],
    limitations: ['Integrity is container/PCM structural validation, not perceptual quality validation'],
    nextAction: null,
  }),
  capability({
    id: 'audio.loudness.integrated_lufs',
    label: 'Integrated LUFS',
    area: 'loudness_dynamic',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/loudness/integratedLoudness.ts', 'src/lib/studio/audio/features/masteringFeatures.ts'],
    evidenceSources: ['decoded PCM'],
    requiredInput: ['decoded PCM', 'sample rate'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['lufs_integrated'],
    limitations: ['Reports INSUFFICIENT_SIGNAL for signals shorter than the 400 ms BS.1770 block size'],
    nextAction: null,
  }),
  capability({
    id: 'audio.loudness.short_term_momentary',
    label: 'Short-term and momentary LUFS',
    area: 'loudness_dynamic',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/loudness/momentaryLoudness.ts', 'src/lib/studio/audio/loudness/shortTermLoudness.ts', 'src/lib/studio/audio/features/masteringFeatures.ts'],
    evidenceSources: ['decoded PCM'],
    requiredInput: ['decoded PCM', 'sample rate'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['short_term_lufs_summary', 'momentary_lufs_summary', 'short_term_lufs_min', 'short_term_lufs_max', 'momentary_lufs_min', 'momentary_lufs_max'],
    limitations: ['Short-term windows require at least 3 seconds of decoded PCM'],
    nextAction: null,
  }),
  capability({
    id: 'audio.loudness.lra',
    label: 'Loudness Range',
    area: 'loudness_dynamic',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/loudness/loudnessRange.ts', 'src/lib/studio/audio/features/masteringFeatures.ts'],
    evidenceSources: ['decoded PCM'],
    requiredInput: ['decoded PCM', 'sample rate'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['loudness_range_lu'],
    limitations: ['Returns INSUFFICIENT_SIGNAL when fewer than two short-term windows are available'],
    nextAction: null,
  }),
  capability({
    id: 'audio.dynamic.true_peak',
    label: 'True Peak',
    area: 'loudness_dynamic',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/loudness/truePeak.ts', 'src/lib/studio/audio/features/masteringFeatures.ts'],
    evidenceSources: ['decoded PCM'],
    requiredInput: ['decoded PCM'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['true_peak_dbtp', 'sample_peak_dbfs', 'true_peak_headroom_db'],
    limitations: ['Uses 4x windowed-sinc inter-sample reconstruction; sample peak remains a separate metric'],
    nextAction: null,
  }),
  capability({
    id: 'audio.dynamic.basic',
    label: 'RMS, sample peak, crest factor, dynamic range, clipping and headroom',
    area: 'loudness_dynamic',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/features/dynamicFeatures.ts'],
    evidenceSources: ['decoded PCM'],
    requiredInput: ['decoded PCM'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['rms_dbfs', 'peak_dbfs', 'crest_factor_db', 'dynamic_range_db', 'clipping_risk', 'headroom_db'],
    limitations: ['dynamic_range_db is percentile RMS range, not EBU LRA'],
    nextAction: null,
  }),
  capability({
    id: 'audio.rhythm.onset_transient',
    label: 'Onset strength and transient density',
    area: 'rhythm_time',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/rhythm/onsetStrength.ts', 'src/lib/studio/audio/rhythm/onsetDetection.ts', 'src/lib/studio/audio/features/rhythmFeatures.ts'],
    evidenceSources: ['decoded PCM', 'rhythm onset evidence'],
    requiredInput: ['decoded PCM', 'sample rate'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['rhythm_onset_count', 'rhythm_onset_density_per_second', 'rhythm_onset_strength_max'],
    limitations: ['Combines spectral flux, energy delta, adaptive thresholding and peak picking; silence returns zero onsets with limitations'],
    nextAction: null,
  }),
  capability({
    id: 'audio.rhythm.beat_tempo_meter',
    label: 'Beat tracking, tempo, confidence, drift, meter, pulse clarity and syncopation',
    area: 'rhythm_time',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/rhythm/index.ts', 'src/lib/studio/audio/rhythm/tempoCandidates.ts', 'src/lib/studio/audio/rhythm/beatTracking.ts', 'src/lib/studio/audio/rhythm/meterEstimation.ts'],
    evidenceSources: ['decoded PCM', 'onset envelope', 'tempo candidates', 'rhythm evidence'],
    requiredInput: ['onset curve', 'duration long enough for tempo'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['tempo_global_bpm', 'tempo_confidence', 'tempo_drift_bpm', 'pulse_clarity', 'beat_count', 'meter_hypothesis', 'syncopation'],
    limitations: ['Beat grid is suppressed when pulse clarity is insufficient; meter and syncopation remain INSUFFICIENT_SIGNAL without confident grid'],
    nextAction: null,
  }),
  capability({
    id: 'audio.pitch.tracking',
    label: 'Pitch tracking and voiced frame confidence',
    area: 'pitch_harmony',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio with tonal or voiced signal'],
    implementedBy: ['src/lib/studio/audio/harmony/pitchDetection.ts', 'src/lib/studio/audio/features/harmonyFeatures.ts'],
    evidenceSources: ['decoded PCM', 'harmony pitch evidence'],
    requiredInput: ['decoded PCM', 'sample rate', 'sufficient pitched signal'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['fundamental_frequency_hz', 'pitch_confidence', 'pitch_voiced_frame_ratio', 'pitch_range_hz'],
    limitations: ['Monophonic pitch is degraded for dense polyphonic material; low confidence frames are unvoiced, not forced'],
    nextAction: null,
  }),
  capability({
    id: 'audio.pitch.chroma',
    label: '12-class chroma extraction',
    area: 'pitch_harmony',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio with tonal spectral energy'],
    implementedBy: ['src/lib/studio/audio/harmony/chroma.ts', 'src/lib/studio/audio/features/harmonyFeatures.ts'],
    evidenceSources: ['decoded PCM', 'spectral frames', 'harmony chroma evidence'],
    requiredInput: ['spectral frames', 'frequency bins between 50 and 5000 Hz'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['chroma_distribution', 'chroma_confidence'],
    limitations: ['Percussive or atonal material returns low confidence instead of a forced tonal map'],
    nextAction: null,
  }),
  capability({
    id: 'audio.pitch.key_estimation',
    label: 'Key estimation and tonal confidence',
    area: 'pitch_harmony',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio with stable chroma'],
    implementedBy: ['src/lib/studio/audio/harmony/keyEstimation.ts', 'src/lib/studio/audio/features/harmonyFeatures.ts'],
    evidenceSources: ['aggregate chroma', 'key profile candidates'],
    requiredInput: ['chroma distribution', 'sufficient tonal coverage'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['key_estimate', 'key_confidence', 'tuning_offset_cents'],
    limitations: ['Relative major/minor ambiguity is reported when candidates are close'],
    nextAction: null,
  }),
  capability({
    id: 'audio.harmony.harmonic_change',
    label: 'Harmonic change events',
    area: 'pitch_harmony',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio with chroma over time'],
    implementedBy: ['src/lib/studio/audio/harmony/harmonicChange.ts', 'src/lib/studio/audio/features/harmonyFeatures.ts'],
    evidenceSources: ['chroma frames', 'tonal centroid frames'],
    requiredInput: ['time-aligned chroma frames'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['harmonic_change_count', 'tonal_centroid_movement'],
    limitations: ['Events are harmonic state changes from tonal distance, not section labels'],
    nextAction: null,
  }),
  capability({
    id: 'audio.harmony.harmonic_stability',
    label: 'Harmonic stability',
    area: 'pitch_harmony',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio with tonal signal'],
    implementedBy: ['src/lib/studio/audio/harmony/harmonicStability.ts', 'src/lib/studio/audio/features/harmonyFeatures.ts'],
    evidenceSources: ['chroma persistence', 'tonal centroid stability', 'key confidence', 'dissonance'],
    requiredInput: ['chroma frames', 'harmonic change events', 'key candidates'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['harmonic_stability'],
    limitations: ['Returns INSUFFICIENT_SIGNAL when tonal coverage is too low'],
    nextAction: null,
  }),
  capability({
    id: 'audio.harmony.tonal_ambiguity',
    label: 'Tonal ambiguity and dissonance',
    area: 'pitch_harmony',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio with tonal or atonal spectral evidence'],
    implementedBy: ['src/lib/studio/audio/harmony/tonalAmbiguity.ts', 'src/lib/studio/audio/harmony/dissonance.ts', 'src/lib/studio/audio/features/harmonyFeatures.ts'],
    evidenceSources: ['key candidate margins', 'chroma entropy', 'spectral roughness'],
    requiredInput: ['chroma frames', 'spectral peaks'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['tonal_ambiguity', 'spectral_dissonance', 'chord_hypothesis'],
    limitations: ['Dissonance is spectral roughness and chord hypotheses remain unresolved when confidence is low'],
    nextAction: null,
  }),
  capability({
    id: 'audio.spectrum.core',
    label: 'Spectral centroid, bandwidth, rolloff, flux, ZCR and noise floor',
    area: 'timbre_spectrum',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'studio',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/features/spectralFeatures.ts'],
    evidenceSources: ['decoded PCM'],
    requiredInput: ['decoded PCM'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['spectral_centroid_hz', 'spectral_bandwidth_hz', 'spectral_rolloff_hz', 'spectral_flux', 'zero_crossing_rate_spectral', 'noise_floor_dbfs'],
    limitations: ['Bounded DFT frames, limited maximum frame count'],
    nextAction: null,
  }),
  capability({
    id: 'audio.spectrum.advanced',
    label: 'MFCC, spectral contrast, flatness, HPSS, roughness and brightness',
    area: 'timbre_spectrum',
    state: 'BLOCKED_BY_IMPLEMENTATION',
    absenceState: 'CAPABILITY_MISSING',
    productionSurface: 'studio_root',
    appliesTo: ['audio'],
    implementedBy: [],
    evidenceSources: ['decoded PCM', 'spectral frames'],
    requiredInput: ['spectral frames'],
    requiredEngine: 'advanced spectral descriptor engine',
    calibration: 'required',
    outputKeys: ['mfcc', 'spectral_contrast', 'spectral_flatness', 'hpss', 'roughness', 'brightness'],
    limitations: ['Do not derive these from centroid alone'],
    nextAction: 'Add descriptor engine after shared spectral frame cache is available.',
  }),
  capability({
    id: 'audio.structure.energy_sections',
    label: 'Energy contour and section candidates',
    area: 'structure',
    state: 'PROXY',
    absenceState: null,
    productionSurface: 'studio',
    appliesTo: ['audio'],
    implementedBy: ['src/lib/studio/audio/segmentation/sectionDetection.ts', 'src/lib/studio/production/objectContextSynthesis.ts'],
    evidenceSources: ['energy_segments'],
    requiredInput: ['energy segments'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['section time regions', 'energySegments', 'Phi'],
    limitations: ['Energy class changes are structural proxies, not musical form labels'],
    nextAction: 'Replace proxy with novelty/self-similarity segmentation.',
  }),
  capability({
    id: 'audio.structure.novelty_repetition',
    label: 'Novelty curve, self-similarity, repetition, formal symmetry and climax',
    area: 'structure',
    state: 'BLOCKED_BY_IMPLEMENTATION',
    absenceState: 'CAPABILITY_MISSING',
    productionSurface: 'studio_root',
    appliesTo: ['audio'],
    implementedBy: [],
    evidenceSources: ['features over time'],
    requiredInput: ['time-aligned feature vectors'],
    requiredEngine: 'structural segmentation engine',
    calibration: 'required',
    outputKeys: ['novelty_curve', 'self_similarity_matrix', 'repetition_score', 'formal_symmetry', 'climax_estimate'],
    limitations: ['Current section candidates are not recurrence analysis'],
    nextAction: 'Implement self-similarity matrix over audio feature frames.',
  }),
  capability({
    id: 'voice.semantic.audio',
    label: 'Voice activity, transcription, language and lyric semantics',
    area: 'voice_semantics',
    state: 'BLOCKED_BY_IMPLEMENTATION',
    absenceState: 'CAPABILITY_MISSING',
    productionSurface: 'studio_root',
    appliesTo: ['vocal audio'],
    implementedBy: [],
    evidenceSources: ['decoded PCM', 'operator-declared lyrics', 'transcript'],
    requiredInput: ['voice signal or textual metadata'],
    requiredEngine: 'voice activity and transcription engine',
    calibration: 'required',
    outputKeys: ['voice_activity', 'transcript', 'language', 'lyric_segments', 'semantic_embeddings'],
    limitations: ['Instrumental audio must mark semantic variables NOT_APPLICABLE unless text metadata exists'],
    nextAction: 'Add VAD before transcription and semantic scoring.',
  }),
  capability({
    id: 'sfi.variable.d_cog',
    label: 'D_cog cognitive offset',
    area: 'sfi_variable',
    state: 'CALIBRATION_REQUIRED',
    absenceState: 'CALIBRATION_REQUIRED',
    productionSurface: 'studio_root',
    appliesTo: ['audio', 'video', 'text'],
    implementedBy: ['src/lib/studio/production/objectContextSynthesis.ts'],
    evidenceSources: ['rhythm', 'structure', 'harmony'],
    requiredInput: ['expectation model inputs'],
    requiredEngine: 'rhythmic/structural expectation model',
    calibration: 'required',
    outputKeys: ['D_cog'],
    limitations: ['Rhythm foundation is available; harmony foundation is available; D_cog still requires structure/novelty, expectation model and calibrated cognitive baseline'],
    nextAction: 'Connect structure and expectation calibration before exposing D_cog as an observed or derived variable.',
  }),
  capability({
    id: 'sfi.variable.e_r',
    label: 'E_r relational energy',
    area: 'sfi_variable',
    state: 'REQUIRES_FIELD_EVIDENCE',
    absenceState: 'REQUIRES_FIELD_EVIDENCE',
    productionSurface: 'studio_root',
    appliesTo: ['published object', 'field return'],
    implementedBy: ['src/lib/studio/production/objectContextSynthesis.ts'],
    evidenceSources: ['retention', 'repetition', 'comments', 'saves', 'shares', 'sessions', 'audience response'],
    requiredInput: ['field evidence'],
    requiredEngine: null,
    calibration: 'required',
    outputKeys: ['E_r'],
    limitations: ['The file alone cannot measure reception'],
    nextAction: 'Define field-return ingestion path before computing E_r.',
  }),
  capability({
    id: 'sfi.variable.v_i',
    label: 'V_i intentional vector',
    area: 'sfi_variable',
    state: 'REQUIRES_DECLARATION',
    absenceState: 'REQUIRES_DECLARATION',
    productionSurface: 'studio_root',
    appliesTo: ['studio object'],
    implementedBy: ['src/lib/studio/production/attractorDeclaration.ts', 'src/lib/studio/production/objectContextSynthesis.ts'],
    evidenceSources: ['operator declaration', 'execution evidence'],
    requiredInput: ['intention', 'attractor', 'audience', 'desired shift', 'prohibited effects'],
    requiredEngine: null,
    calibration: 'required',
    outputKeys: ['V_i'],
    limitations: ['Intent must not be inferred from the sound file alone'],
    nextAction: 'Persist a structured operator declaration as institutional context.',
  }),
  capability({
    id: 'sfi.variable.semantic',
    label: 'R_sem and C_sem',
    area: 'sfi_variable',
    state: 'NOT_APPLICABLE',
    absenceState: 'NOT_APPLICABLE',
    productionSurface: 'studio_root',
    appliesTo: ['text', 'vocal audio with transcript', 'declared lyrics'],
    implementedBy: ['src/lib/studio/production/objectContextSynthesis.ts', 'src/lib/studio/multimodal/textAnalyzer.ts'],
    evidenceSources: ['text features', 'transcript', 'declared lyrics'],
    requiredInput: ['textual or semantic evidence'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['R_sem', 'C_sem'],
    limitations: ['Instrumental audio without text must be NOT_APPLICABLE, not zero'],
    nextAction: 'Bind modality check to variable status in Studio synthesis display.',
  }),
  capability({
    id: 'sfi.variable.i_mc',
    label: 'I_mc multichannel interaction',
    area: 'sfi_variable',
    state: 'PROXY',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio', 'multimodal object'],
    implementedBy: ['src/lib/studio/production/objectContextSynthesis.ts', 'src/lib/studio/audio/features/stereoFeatures.ts'],
    evidenceSources: ['channel_count', 'stereo_width', 'phase_correlation'],
    requiredInput: ['channel data or multimodal layers'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['I_mc', 'stereo_width', 'phase_correlation'],
    limitations: ['Current I_mc is a stereo-width proxy when full multichannel evidence is absent'],
    nextAction: 'Add channel/layer interaction model when stems or multimodal evidence exist.',
  }),
  capability({
    id: 'sfi.variable.phi',
    label: 'Phi formal transition potential',
    area: 'sfi_variable',
    state: 'PROXY',
    absenceState: null,
    productionSurface: 'studio_root',
    appliesTo: ['audio with temporal energy segments'],
    implementedBy: ['src/lib/studio/production/objectContextSynthesis.ts'],
    evidenceSources: ['energy_segments'],
    requiredInput: ['temporal energy series'],
    requiredEngine: null,
    calibration: 'available',
    outputKeys: ['Phi'],
    limitations: ['Represents formal transition potential only, not probability of cultural success'],
    nextAction: 'Split future Phi variants by semantic target before displaying as separate variables.',
  }),
  capability({
    id: 'studio.prediction.model',
    label: 'Prediction with target, horizon, assumptions and verification plan',
    area: 'prediction',
    state: 'BLOCKED_BY_INPUT',
    absenceState: 'REQUIRES_FIELD_EVIDENCE',
    productionSurface: 'studio_root',
    appliesTo: ['object with baseline and model variables'],
    implementedBy: ['src/lib/studio/production/objectFieldProjection.ts'],
    evidenceSources: ['baseline', 'variables', 'field evidence'],
    requiredInput: ['baseline', 'target', 'horizon', 'verification plan'],
    requiredEngine: 'prediction model with explicit window',
    calibration: 'required',
    outputKeys: ['prediction', 'confidence', 'uncertainty', 'verification plan'],
    limitations: ['Do not present visual extrapolation as forecast'],
    nextAction: 'Gate predictions behind complete model envelope.',
  }),
  capability({
    id: 'studio.simulation.model',
    label: 'Executable baseline/intervention/scenario simulation',
    area: 'simulation',
    state: 'BLOCKED_BY_INPUT',
    absenceState: 'REQUIRES_DECLARATION',
    productionSurface: 'studio_root',
    appliesTo: ['object with controllable variables and intervention'],
    implementedBy: ['src/lib/studio/cultural-lab/agents/simulationAgent.ts'],
    evidenceSources: ['baseline', 'operator intervention', 'model output'],
    requiredInput: ['baseline', 'intervention', 'assumptions'],
    requiredEngine: 'scenario model',
    calibration: 'required',
    outputKeys: ['scenario', 'delta', 'risk', 'confidence'],
    limitations: ['Simulation output must not be presented as observed result'],
    nextAction: 'Connect simulation results to Studio production state with trace and baseline comparison.',
  }),
  capability({
    id: 'root.capability.matrix',
    label: 'ROOT capability matrix',
    area: 'root_control',
    state: 'AVAILABLE',
    absenceState: null,
    productionSurface: 'root',
    appliesTo: ['/root'],
    implementedBy: ['src/components/root/capabilities/RootCapabilityMatrix.tsx'],
    evidenceSources: ['studioCapabilityInventory', 'runtime agents', 'analysis jobs'],
    requiredInput: ['capability inventory', 'agent/runtime status'],
    requiredEngine: null,
    calibration: 'not_required',
    outputKeys: ['AVAILABLE', 'EXECUTING', 'CALIBRATION_REQUIRED', 'BLOCKED_BY_INPUT', 'BLOCKED_BY_IMPLEMENTATION', 'FAILED', 'NOT_APPLICABLE'],
    limitations: ['First read-only cut exposes capability state; execution controls remain future work'],
    nextAction: null,
  }),
];

export function studioCapabilityMatrix() {
  return {
    version: STUDIO_CAPABILITY_INVENTORY_VERSION,
    generatedAt: new Date().toISOString(),
    entries: [...studioCapabilityInventory].sort((left, right) => left.id.localeCompare(right.id)),
    summary: summarizeStudioCapabilities(studioCapabilityInventory),
  };
}

export function studioRootCapabilityReadModel(): StudioCapabilityReadModel[] {
  return studioCapabilityMatrix().entries.map((entry) => ({
    capability: entry.id,
    label: entry.label,
    area: entry.area,
    engine: entry.implementedBy[0] ?? entry.requiredEngine,
    implementationVersion: STUDIO_CAPABILITY_INVENTORY_VERSION,
    status: entry.state,
    lastExecution: null,
    lastCalibration: entry.calibration,
    confidence: entry.state === 'AVAILABLE' ? 0.86 : null,
    dependencies: entry.requiredEngine ? [entry.requiredEngine, ...entry.requiredInput] : entry.requiredInput,
    requiredInput: entry.requiredInput,
    outputKeys: entry.outputKeys,
    affectedRoutes: entry.productionSurface === 'studio_root'
      ? ['/studio', '/root']
      : entry.productionSurface === 'studio'
        ? ['/studio']
        : ['/root'],
    limitations: entry.limitations,
    nextAction: entry.nextAction,
    trace: null,
  }));
}

export function summarizeStudioCapabilities(entries: StudioCapabilityInventoryEntry[]) {
  const byState = new Map<StudioCapabilityState, number>();
  const byAbsence = new Map<StudioAbsenceState, number>();
  for (const entry of entries) {
    byState.set(entry.state, (byState.get(entry.state) ?? 0) + 1);
    if (entry.absenceState) byAbsence.set(entry.absenceState, (byAbsence.get(entry.absenceState) ?? 0) + 1);
  }
  return {
    total: entries.length,
    byState: Object.fromEntries([...byState.entries()].sort(([left], [right]) => left.localeCompare(right))),
    byAbsence: Object.fromEntries([...byAbsence.entries()].sort(([left], [right]) => left.localeCompare(right))),
    technicallySolvableBlocked: entries
      .filter((entry) => entry.absenceState === 'CAPABILITY_MISSING')
      .map((entry) => entry.id)
      .sort(),
  };
}

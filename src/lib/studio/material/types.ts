export type AudioRightsState = 'UNKNOWN' | 'OBSERVATION_ONLY' | 'EXECUTION_ALLOWED' | 'DERIVATIVE_ALLOWED' | 'PUBLICATION_ALLOWED' | 'RESTRICTED';
export type InstrumentQualityState = 'TEST' | 'REHEARSAL' | 'PRODUCTION';
export type SfiInstrumentManifest = {
  id: string; name: string; family: string; origin: string; engine: 'sfz'; packageRef: string; packageHash: string; license: string;
  rightsStatus: AudioRightsState; rangeLow: number; rangeHigh: number; articulations: string[]; velocityLayers: number; roundRobins: number;
  sampleRate: number; qualityState: InstrumentQualityState; culturalProfiles: string[]; version: string; verifiedAt: string | null;
};
export type AudioPerformanceEvent = { id: string; bar: number; startSeconds: number; durationSeconds: number; midiNote: number; velocity: number; articulation: string; microtimingMs?: number };
export type AudioPerformancePart = { instrumentId: string; role: string; gainDb?: number; pan?: number; events: AudioPerformanceEvent[] };
export type AudioPerformance = { contract: 'SFI-AUDIO-PERFORMANCE-1.0'; bpm: number; meter: [number, number]; key: string; culturalProfile: string; parts: AudioPerformancePart[]; provenance: { epistemicClass: 'DECLARED' | 'DERIVED' | 'INFERRED'; sourceRefs: string[] } };
export type MaterialProductionMode = 'VOICE_MUSICALIZE' | 'MASTER_ADJUST';
export type MaterialProductionReceipt = {
  contract: 'SFI-MATERIAL-AUDIO-RETURN-1.0'; runId: string; mode: MaterialProductionMode; source: { ref: string; sha256: string };
  instruments: Array<{ id: string; packageRef: string; packageHash: string; rightsStatus: AudioRightsState }>;
  performanceHash: string; adapter: { id: 'SFI-SFZ-RENDER-1.0'; ffmpeg: string };
  outputs: Array<{ kind: 'stem' | 'mix' | 'master'; ref: string; sha256: string }>;
  startedAt: string; finishedAt: string; cleanupState: 'PASS' | 'FAIL'; rightsAssertions: string[]; lineage: string[]; returnState: 'RETURN_PASS' | 'RETURN_FAIL';
};

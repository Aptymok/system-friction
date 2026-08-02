'use client';

import { create } from 'zustand';

export type StudioTemporalSelection = {
  startSeconds: number;
  endSeconds: number;
} | null;

export type StudioLayerId =
  | 'WAVEFORM'
  | 'MOMENTARY_LUFS'
  | 'SHORT_TERM_LUFS'
  | 'TRUE_PEAK_EVENTS'
  | 'RMS'
  | 'SPECTRAL_CENTROID'
  | 'TRANSIENTS'
  | 'ONSETS'
  | 'BEATS'
  | 'TEMPO'
  | 'PITCH'
  | 'CHROMA'
  | 'HARMONIC_CHANGES'
  | 'SEGMENTS'
  | 'EVIDENCE'
  | 'PHENOMENA'
  | 'ANNOTATIONS';

type StudioDrawer = 'capabilities' | 'trace' | null;

type StudioWorkspaceStore = {
  isPlaying: boolean;
  currentTimeSeconds: number;
  zoom: number;
  loopEnabled: boolean;
  selection: StudioTemporalSelection;
  activeMetricKey: string | null;
  activeSegmentId: string | null;
  activeDrawer: StudioDrawer;
  activeLayers: StudioLayerId[];
  setPlaying: (value: boolean) => void;
  setCurrentTime: (value: number) => void;
  setZoom: (value: number) => void;
  setSelection: (value: StudioTemporalSelection) => void;
  setActiveMetric: (value: string | null) => void;
  setActiveSegment: (value: string | null) => void;
  toggleLoop: () => void;
  toggleLayer: (layer: StudioLayerId) => void;
  setDrawer: (drawer: StudioDrawer) => void;
};

export const ALL_STUDIO_LAYERS: StudioLayerId[] = [
  'WAVEFORM',
  'MOMENTARY_LUFS',
  'SHORT_TERM_LUFS',
  'TRUE_PEAK_EVENTS',
  'RMS',
  'SPECTRAL_CENTROID',
  'TRANSIENTS',
  'ONSETS',
  'BEATS',
  'TEMPO',
  'PITCH',
  'CHROMA',
  'HARMONIC_CHANGES',
  'SEGMENTS',
  'EVIDENCE',
  'PHENOMENA',
  'ANNOTATIONS',
];

export const DEFAULT_STUDIO_LAYERS: StudioLayerId[] = ['WAVEFORM', 'MOMENTARY_LUFS', 'SHORT_TERM_LUFS', 'ONSETS', 'SEGMENTS'];

export const useStudioWorkspaceStore = create<StudioWorkspaceStore>((set) => ({
  isPlaying: false,
  currentTimeSeconds: 0,
  zoom: 1,
  loopEnabled: false,
  selection: null,
  activeMetricKey: null,
  activeSegmentId: null,
  activeDrawer: null,
  activeLayers: DEFAULT_STUDIO_LAYERS,
  setPlaying: (value) => set({ isPlaying: value }),
  setCurrentTime: (value) => set({ currentTimeSeconds: Math.max(0, Number.isFinite(value) ? value : 0) }),
  setZoom: (value) => set({ zoom: Math.max(1, Math.min(12, Number.isFinite(value) ? value : 1)) }),
  setSelection: (value) => set({ selection: value }),
  setActiveMetric: (value) => set({ activeMetricKey: value }),
  setActiveSegment: (value) => set({ activeSegmentId: value }),
  toggleLoop: () => set((state) => ({ loopEnabled: !state.loopEnabled })),
  toggleLayer: (layer) => set((state) => ({
    activeLayers: state.activeLayers.includes(layer)
      ? state.activeLayers.filter((item) => item !== layer)
      : [...state.activeLayers, layer],
  })),
  setDrawer: (drawer) => set({ activeDrawer: drawer }),
}));

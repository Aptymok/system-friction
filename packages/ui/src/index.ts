export type ViewState = 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'degraded';

export type DisplayBoundary = {
  mayRenderFieldTruth: true;
  mayComputeFieldTruth: false;
  mayPersistFieldTruth: false;
};


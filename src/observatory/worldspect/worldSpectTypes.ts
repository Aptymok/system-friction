export type WorldSpectVariable =
  | 'macro'
  | 'social'
  | 'cultural'
  | 'semantic'
  | 'factual'
  | 'platform'
  | 'risk'
  | 'attention';

export type WorldSpectSymbol = '△M' | '◌S' | '◇C' | '∿L' | '□F' | '⬡P' | '⚠R' | '◉A';

export const worldSpectSymbols: Record<WorldSpectVariable, WorldSpectSymbol> = {
  macro: '△M',
  social: '◌S',
  cultural: '◇C',
  semantic: '∿L',
  factual: '□F',
  platform: '⬡P',
  risk: '⚠R',
  attention: '◉A',
};

export type WorldSpectSource = 'local_context' | 'external_source';

export type WorldSpectConfidence = 'limited' | 'moderate' | 'high';

export type WorldSpectVector = {
  variable: WorldSpectVariable;
  symbol: WorldSpectSymbol;
  state: 'quiet' | 'active' | 'watch';
  reading: string;
  suggestedAction: string;
};

export type WorldSpectReading = {
  triggerId: string;
  triggerSymbol: string;
  triggerSummary: string;
  variables: WorldSpectVariable[];
  symbols: WorldSpectSymbol[];
  source: WorldSpectSource;
  confidence: WorldSpectConfidence;
  state: 'dormant' | 'reading' | 'watch';
  summary: string;
  meaning: string;
  suggestedAction: string;
  vectors: WorldSpectVector[];
  observationWindow?: {
    visibleSummary: string;
    options: string[];
  };
};

export type WorldSpectState = {
  active: boolean;
  reading: WorldSpectReading | null;
  updatedAt: string | null;
};

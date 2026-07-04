export type ExpansionRecommendation = 'build' | 'study' | 'hold';

export type RootExpansionTheme = {
  id: string;
  label: string;
  persistence: number;
  velocity: number;
  recommendation: ExpansionRecommendation;
  source: string;
};

export type RootInvestigationItem = {
  id: string;
  theme: string;
  status: ExpansionRecommendation;
  persistence: number;
};

export function buildRootExpansionModel(input: { confidence: number; amvCount: number; predictionCount: number; evidenceCount: number }) {
  const base = Math.max(0.24, Math.min(0.92, input.confidence || 0.5));
  const memoryBoost = Math.min(0.18, input.amvCount / 100);
  const evidenceBoost = Math.min(0.12, input.evidenceCount / 140);

  const themes: RootExpansionTheme[] = [
    { id: 'cognitive-resilience', label: 'Cognitive Resilience', persistence: Math.min(0.94, base + memoryBoost), velocity: 0.12, recommendation: 'build', source: 'AMV persistence + cognitive twin readings' },
    { id: 'adaptive-infrastructure', label: 'Adaptive Infrastructure', persistence: Math.min(0.88, base + evidenceBoost), velocity: 0.08, recommendation: 'build', source: 'World Vector + infrastructure evidence' },
    { id: 'symbiotic-interfaces', label: 'Symbiotic Interfaces', persistence: Math.min(0.82, base - 0.02 + memoryBoost), velocity: 0.07, recommendation: 'study', source: 'agentic operations + AMV memory' },
    { id: 'self-healing-systems', label: 'Self-Healing Systems', persistence: Math.max(0.42, base - 0.08), velocity: 0.05, recommendation: 'study', source: 'systemHealth warnings and recovery queue' },
    { id: 'ethical-alignment', label: 'Ethical Alignment', persistence: Math.max(0.38, base - 0.12), velocity: 0.03, recommendation: 'study', source: 'governance obligations + proposal pressure' },
    { id: 'knowledge-preservation', label: 'Knowledge Preservation', persistence: Math.max(0.32, base - 0.18 + memoryBoost), velocity: 0.02, recommendation: 'hold', source: 'AMV availability + archive continuity' },
  ];

  const investigations: RootInvestigationItem[] = themes.map((theme, index) => ({
    id: `I-${String(index + 1).padStart(4, '0')}`,
    theme: theme.label,
    status: theme.recommendation,
    persistence: theme.persistence,
  }));

  return {
    themes,
    investigations,
    attractorIndex: Math.min(0.91, base + memoryBoost * 0.5 + evidenceBoost * 0.5),
    source: 'derived from confidence, AMV count, prediction count and evidence count',
  };
}

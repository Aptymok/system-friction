import type { KernelContext, KernelOpportunity } from '../kernelContext';

export interface OpportunitySignal {
  source: string;
  description: string;
  score: number;
  confidence: number;
}

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function short(value: unknown, max = 320) {
  const rendered = typeof value === 'string' ? value : JSON.stringify(value);
  return rendered.length > max ? `${rendered.slice(0, max)}…` : rendered;
}

export function OpportunityDiscoveryAgent(context: KernelContext): KernelContext {
  const opportunities: OpportunitySignal[] = [];
  const evidence = context.evidence ?? [];
  const risks = context.risks ?? [];
  const measurements = row(context.metadata?.materialMeasurements);
  const signal = row(context.metadata?.signal);
  const extracted = row(signal.extracted);

  const averageRisk = risks.length
    ? risks.reduce((total, risk) => total + Math.max(0, Math.min(1, Number(risk.severity) || 0)), 0) / risks.length
    : 0;
  const riskPenalty = Math.min(0.35, averageRisk * 0.25);

  for (const item of Array.isArray(measurements.recurrence) ? measurements.recurrence : []) {
    const recurrence = row(item);
    const count = number(recurrence.count);
    const share = number(recurrence.share);
    if ((count === null || count <= 1) && (share === null || share <= 0)) continue;
    const key = String(recurrence.key ?? recurrence.basis ?? 'grupo recurrente');
    const magnitude = share !== null ? Math.max(0, Math.min(1, share)) : Math.min(1, (count ?? 0) / 1000);
    opportunities.push({
      source: 'MaterialRecurrence',
      description: `Recurrencia observada en ${key}${count !== null ? ` (${count} registros)` : ''}${share !== null ? `, ${(share * 100).toFixed(2)}%` : ''}. Candidato para validar estandarización, autoservicio, automatización o prevención; la recurrencia por sí sola no demuestra demanda evitable.`,
      score: Math.max(0, Math.min(1, 0.45 + magnitude * 0.4 - riskPenalty)),
      confidence: 1,
    });
  }

  const perturbation = row(extracted.perturbation);
  if (typeof perturbation.action === 'string' && perturbation.action.trim()) {
    opportunities.push({
      source: 'StructuredPerturbationCandidate',
      description: `Perturbación propuesta para evaluación gobernada: ${perturbation.action.trim()}${typeof perturbation.rationale === 'string' && perturbation.rationale.trim() ? ` — ${perturbation.rationale.trim()}` : ''}. No está autorizada ni validada por existir en el análisis.`,
      score: Math.max(0, Math.min(1, 0.55 - riskPenalty)),
      confidence: 0.7,
    });
  }

  for (const item of evidence) {
    const payload = row(item.payload);
    const klass = typeof payload.epistemicClass === 'string' ? payload.epistemicClass.toLowerCase() : '';
    if (!['observed', 'derived'].includes(klass)) continue;
    const rendered = short(payload);
    const normalized = rendered.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const opportunityMarkers = ['ventana', 'potencial', 'crecimiento', 'mejora', 'oportunidad', 'capacidad', 'recurren', 'repetid'];
    const detected = opportunityMarkers.filter((marker) => normalized.includes(marker));
    if (detected.length === 0) continue;
    opportunities.push({
      source: item.source,
      description: rendered,
      score: Math.max(0, Math.min(1, item.confidence * 0.7 + detected.length * 0.04 - riskPenalty)),
      confidence: item.confidence,
    });
  }

  const unique = new Map<string, OpportunitySignal>();
  for (const opportunity of opportunities) {
    const key = opportunity.description.toLowerCase();
    if (!unique.has(key)) unique.set(key, opportunity);
  }
  const bounded = [...unique.values()].slice(0, 20);
  const generatedOpportunities: KernelOpportunity[] = bounded.map((opportunity) => ({
    id: crypto.randomUUID(),
    description: opportunity.description,
    score: opportunity.score,
  }));

  context.opportunities.push(...generatedOpportunities);
  context.metadata = {
    ...context.metadata,
    opportunityDiscovery: {
      detected: generatedOpportunities.length,
      recurrenceCandidates: bounded.filter((item) => item.source === 'MaterialRecurrence').length,
      perturbationCandidates: bounded.filter((item) => item.source === 'StructuredPerturbationCandidate').length,
      averageObservedRisk: averageRisk,
      executedAt: new Date().toISOString(),
      epistemicRule: 'OPPORTUNITY_CANDIDATE_IS_NOT_AUTHORIZATION_OR_PROOF_OF_AVOIDABLE_DEMAND',
    },
  };

  return context;
}

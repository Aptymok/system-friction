import type { KernelContext, KernelRisk } from '../kernelContext';

export interface RiskAssessment {
  source: string;
  description: string;
  severity: number;
  confidence: number;
}

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function number(value: unknown) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function short(value: unknown, max = 320) {
  const rendered = typeof value === 'string' ? value : JSON.stringify(value);
  return rendered.length > max ? `${rendered.slice(0, max)}…` : rendered;
}

export function RiskAgent(context: KernelContext): KernelContext {
  const assessments: RiskAssessment[] = [];
  const evidence = context.evidence ?? [];
  const contradictions = context.contradictions ?? [];
  const measurements = row(context.metadata?.materialMeasurements);
  const signal = row(context.metadata?.signal);
  const extracted = row(signal.extracted);

  // Explicit structured risks are preserved as risk candidates rather than rediscovered through prose.
  for (const item of Array.isArray(extracted.risks) ? extracted.risks.slice(0, 16) : []) {
    const risk = row(item);
    const description = typeof risk.statement === 'string' ? risk.statement.trim() : short(risk);
    if (!description) continue;
    const likelihood = number(risk.likelihood);
    const impact = number(risk.impact);
    const severity = impact !== null && likelihood !== null
      ? Math.max(0, Math.min(1, impact * likelihood))
      : impact !== null
        ? Math.max(0, Math.min(1, impact))
        : 0.5;
    assessments.push({ source: 'StructuredResultRisk', description, severity, confidence: 0.85 });
  }

  for (const item of Array.isArray(measurements.temporalConsistency) ? measurements.temporalConsistency : []) {
    const metric = row(item);
    const share = number(metric.violationShare);
    const violations = number(metric.violations);
    if (share === null || share <= 0) continue;
    assessments.push({
      source: 'MaterialTemporalConsistency',
      description: `Inconsistencia temporal ${String(metric.key ?? '')}: ${violations ?? 'n/d'} violaciones (${(share * 100).toFixed(2)}%). No debe interpretarse como SLA hasta resolver la semántica de timestamps.`,
      severity: Math.max(0.2, Math.min(1, share * 2)),
      confidence: 1,
    });
  }

  const rowCount = number(measurements.rowCount);
  const malformedRows = number(measurements.malformedRows);
  if (rowCount && malformedRows && malformedRows > 0) {
    const share = malformedRows / rowCount;
    assessments.push({
      source: 'MaterialDataQuality',
      description: `${malformedRows} filas malformadas de ${rowCount} (${(share * 100).toFixed(2)}%).`,
      severity: Math.max(0.1, Math.min(1, share * 3)),
      confidence: 1,
    });
  }

  for (const item of Array.isArray(measurements.missingness) ? measurements.missingness : []) {
    const metric = row(item);
    const share = number(metric.share);
    if (share === null || share < 0.1) continue;
    assessments.push({
      source: 'MaterialMissingness',
      description: `Faltantes relevantes en ${String(metric.field ?? 'campo')}: ${(share * 100).toFixed(2)}%.`,
      severity: Math.min(0.8, Math.max(0.2, share)),
      confidence: 1,
    });
  }

  for (const item of evidence) {
    const payload = row(item.payload);
    const klass = typeof payload.epistemicClass === 'string' ? payload.epistemicClass.toLowerCase() : '';
    if (klass === 'missing') {
      assessments.push({
        source: item.source,
        description: `Deuda de evidencia: ${short(payload.question ?? payload.reason ?? payload)}`,
        severity: 0.45,
        confidence: item.confidence,
      });
      continue;
    }
    if (!['observed', 'derived'].includes(klass)) continue;
    const rendered = short(payload).toLowerCase();
    const riskMarkers = ['fallo', 'error', 'bloqueo', 'riesgo', 'incertidumbre', 'conflicto', 'contradiccion'];
    const detected = riskMarkers.filter((marker) => rendered.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(marker));
    if (detected.length > 0) {
      assessments.push({
        source: item.source,
        description: short(payload),
        severity: Math.min(0.75, Math.max(0.2, detected.length / riskMarkers.length)),
        confidence: item.confidence,
      });
    }
  }

  for (const contradiction of contradictions) {
    assessments.push({
      source: 'ContradictionAgent',
      description: short(contradiction.payload),
      severity: 0.8,
      confidence: contradiction.confidence,
    });
  }

  const unique = new Map<string, RiskAssessment>();
  for (const risk of assessments) {
    const key = risk.description.toLowerCase();
    if (!unique.has(key)) unique.set(key, risk);
  }
  const bounded = [...unique.values()].slice(0, 24);
  const generatedRisks: KernelRisk[] = bounded.map((risk) => ({
    id: crypto.randomUUID(),
    description: risk.description,
    severity: risk.severity,
  }));

  context.risks.push(...generatedRisks);
  context.metadata = {
    ...context.metadata,
    riskAgent: {
      risksDetected: generatedRisks.length,
      structuredMeasurementRisks: bounded.filter((risk) => risk.source.startsWith('Material') || risk.source === 'StructuredResultRisk').length,
      executedAt: new Date().toISOString(),
      epistemicRule: 'RISK_CANDIDATE_DOES_NOT_ESTABLISH_CAUSALITY',
    },
  };

  return context;
}
